# Docker 离线部署

日常在线安装使用根目录 README 中的 GHCR 安装命令。离线环境可在联网机器导出同一个公开镜像，无需 GitHub Release 分卷。

需要 Docker Engine 或 Docker Desktop，以及 Docker Compose v2。镜像为 `linux/amd64`；ARM 主机需要 amd64 模拟支持。

## 联网机器准备

```bash
mkdir -p heimdall-offline
cd heimdall-offline
curl -fsSL https://raw.githubusercontent.com/QiantangCredit/heimdall-agent/main/compose.yaml -o compose.yaml
docker pull ghcr.io/qiantangcredit/heimdall:sha-0a711bbfc607
docker save ghcr.io/qiantangcredit/heimdall:sha-0a711bbfc607 | gzip > heimdall-image.tar.gz
printf '%s\n' 'COMPOSE_PROJECT_NAME=heimdall-agent' 'HEIMDALL_IMAGE=ghcr.io/qiantangcredit/heimdall:sha-0a711bbfc607' 'HEIMDALL_BIND=127.0.0.1' 'HEIMDALL_PORT=8700' > .env
sha256sum heimdall-image.tar.gz compose.yaml > SHA256SUMS
```

将整个目录（包括 `.env`）复制到离线主机。macOS 可使用 `shasum -a 256` 代替 `sha256sum`。

## 离线主机启动

```bash
cd heimdall-offline
sha256sum -c SHA256SUMS
docker load -i heimdall-image.tar.gz
docker compose up -d --no-build --pull never --wait
```

默认访问 <http://127.0.0.1:8700>，在设置页填写模型地址、API Key 和模型 ID。端口被占用时修改 `.env` 中的 `HEIMDALL_PORT`。模型调用仍需要访问所配置的模型服务，完全隔离的网络须提供可达的本地模型网关。

数据保存在 `heimdall-agent_heimdall-data` 卷；更改 Compose project 名称会使用另一个数据卷。升级时保留原 `.env` 和数据卷，不要执行 `docker compose down -v`。从旧 Release 安装的用户可继续使用原安装目录，将 `.env` 中的 `HEIMDALL_IMAGE` 改为 GHCR 镜像，并确认 `COMPOSE_PROJECT_NAME=heimdall-agent`，再执行 Compose 更新。

## 从源码打包

仓库仍提供包含校验文件和安装器的自定义离线包生成工具：

```bash
docker build --platform linux/amd64 --build-arg VCS_REF="$(git rev-parse HEAD)" -f deploy/Dockerfile --target all-in-one -t heimdall-agent:local .
node scripts/build/smoke-container.mjs heimdall-agent:local
npm run package:docker -- heimdall-agent:local deploy/offline/dist/heimdall-agent-linux-amd64.tar
```

生成的包可解压后运行包内 `install.sh`。私有配置、API Key 和运行数据不会包含在发布包中。
