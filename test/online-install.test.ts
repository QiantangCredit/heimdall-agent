import { chmodSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, it } from "vitest";

const temporary: string[] = [];
afterEach(() => { for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true }); });

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "heimdall-install-")); temporary.push(root);
  const bin = join(root, "bin"); mkdirSync(bin);
  const dir = join(root, "an install directory");
  const calls = join(root, "docker-calls");
  writeFileSync(join(root, "compose.yaml"), "name: heimdall\nservices: {}\n");
  writeFileSync(join(bin, "docker"), '#!/bin/bash\nprintf "%s\\n" "$*" >> "$INSTALLER_CALLS"\n');
  writeFileSync(join(bin, "curl"), '#!/bin/bash\nif [ "${INSTALLER_DOWNLOAD_FAIL:-}" = 1 ]; then exit 22; fi\ncp "$INSTALLER_COMPOSE" "${@: -1}"\n');
  for (const name of ["docker", "curl"]) chmodSync(join(bin, name), 0o755);
  const env = { PATH: `${bin}:${process.env.PATH}`, HEIMDALL_INSTALL_DIR: dir,
    INSTALLER_CALLS: calls, INSTALLER_COMPOSE: join(root, "compose.yaml") };
  const script = resolve("deploy/install.sh");
  return { root, dir, calls, env, script };
}

it("persists the selected project, image and port and preserves settings on rerun", () => {
  const f = fixture();
  execFileSync("bash", [f.script], { env: { ...f.env, HEIMDALL_PORT: "8701",
    HEIMDALL_IMAGE: "ghcr.io/qiantangcredit/heimdall:sha-0a711bbfc607" } });
  const original = readFileSync(join(f.dir, ".env"), "utf8");
  expect(original).toContain("COMPOSE_PROJECT_NAME=heimdall-agent\n");
  expect(original).toContain("HEIMDALL_BIND=127.0.0.1\n");
  expect(original).toContain("HEIMDALL_PORT=8701\n");
  expect(original).toContain("HEIMDALL_IMAGE=ghcr.io/qiantangcredit/heimdall:sha-0a711bbfc607\n");
  const saved = original.replace("COMPOSE_PROJECT_NAME=heimdall-agent", "COMPOSE_PROJECT_NAME=my-existing-project")
    + 'ANTHROPIC_API_KEY="fixture: saved setting"\n';
  writeFileSync(join(f.dir, ".env"), saved);
  writeFileSync(join(f.dir, "compose.yaml"), "# operator-owned compose file\n");
  execFileSync("bash", [f.script], { env: { ...f.env, INSTALLER_DOWNLOAD_FAIL: "1" } });
  expect(readFileSync(join(f.dir, ".env"), "utf8")).toBe(saved);
  expect(readFileSync(join(f.dir, "compose.yaml"), "utf8")).toBe("# operator-owned compose file\n");
  expect(readFileSync(f.calls, "utf8")).toContain("compose --env-file .env -f compose.yaml up -d --pull always --wait");
});

it("does not start Compose when its configuration download fails", () => {
  const f = fixture();
  const result = spawnSync("bash", [f.script], { env: { ...f.env, INSTALLER_DOWNLOAD_FAIL: "1" } });
  expect(result.status).not.toBe(0);
  expect(existsSync(join(f.dir, "compose.yaml"))).toBe(false);
  expect(existsSync(join(f.dir, ".env"))).toBe(false);
  expect(readFileSync(f.calls, "utf8")).not.toContain("up -d");
});

it.each(["0", "65536", "8700\nINJECTED=value"])("rejects invalid port %j before writing files", port => {
  const f = fixture();
  const result = spawnSync("bash", [f.script], { env: { ...f.env, HEIMDALL_PORT: port } });
  expect(result.status).not.toBe(0);
  expect(existsSync(f.dir)).toBe(false);
});
