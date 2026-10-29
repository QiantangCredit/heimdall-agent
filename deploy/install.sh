#!/usr/bin/env bash
# Install or update the public GHCR image with a persistent Compose project.
set -euo pipefail

for command in curl docker awk; do command -v "$command" >/dev/null; done
docker info >/dev/null
docker compose version >/dev/null
if [[ -n "${HEIMDALL_PORT:-}" ]] && { [[ ! "$HEIMDALL_PORT" =~ ^[0-9]{1,5}$ ]] || (( 10#$HEIMDALL_PORT < 1 || 10#$HEIMDALL_PORT > 65535 )); }; then
  printf 'HEIMDALL_PORT must be between 1 and 65535\n' >&2
  exit 1
fi
if [[ -n "${COMPOSE_PROJECT_NAME:-}" && ! "$COMPOSE_PROJECT_NAME" =~ ^[a-z0-9][a-z0-9_-]*$ ]]; then
  printf 'Invalid COMPOSE_PROJECT_NAME\n' >&2
  exit 1
fi
if [[ -n "${HEIMDALL_IMAGE:-}" && ! "$HEIMDALL_IMAGE" =~ ^[a-zA-Z0-9./:_@-]+$ ]]; then
  printf 'Invalid HEIMDALL_IMAGE\n' >&2
  exit 1
fi

mkdir -p -- "${HEIMDALL_INSTALL_DIR:-heimdall-agent}"
cd -- "${HEIMDALL_INSTALL_DIR:-heimdall-agent}"
umask 077
compose_tmp="$(mktemp .compose.XXXXXX)"
env_tmp="$(mktemp .env.XXXXXX)"
trap 'rm -f -- "$compose_tmp" "$env_tmp"' EXIT
if [[ ! -e compose.yaml ]]; then
  curl --fail --silent --show-error --location --retry 3 --connect-timeout 20 \
    https://raw.githubusercontent.com/QiantangCredit/heimdall-agent/main/compose.yaml -o "$compose_tmp"
  mv -- "$compose_tmp" compose.yaml
fi
if [[ ! -e .env ]]; then : > .env; fi
set_env() {
  awk -v key="$1" -v value="$2" '
    index($0, key "=") == 1 { print key "=" value; found=1; next }
    { print }
    END { if (!found) print key "=" value }
  ' .env > "$env_tmp"
  mv -- "$env_tmp" .env
}
default_env() {
  if ! awk -v key="$1" 'index($0,key "=")==1 { found=1 } END { exit !found }' .env; then
    set_env "$1" "$2"
  fi
}
default_env COMPOSE_PROJECT_NAME heimdall-agent
default_env HEIMDALL_BIND 127.0.0.1
default_env HEIMDALL_PORT 8700
default_env HEIMDALL_IMAGE ghcr.io/qiantangcredit/heimdall:latest
for key in COMPOSE_PROJECT_NAME HEIMDALL_PORT HEIMDALL_IMAGE; do
  if [[ -n "${!key:-}" ]]; then set_env "$key" "${!key}"; fi
done

docker compose --env-file .env -f compose.yaml up -d --pull always --wait
docker compose --env-file .env -f compose.yaml ps
port="$(awk -F= '$1 == "HEIMDALL_PORT" { print $2; exit }' .env)"
printf '\nHeimdall: http://127.0.0.1:%s\n安装目录 / Install directory: %s\n' "$port" "$PWD"
printf '请在设置页填写模型配置 / Configure your model in Settings.\n'
