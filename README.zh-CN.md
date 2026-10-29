<p align="center">
  <img src="console/public/mark.jpg" alt="Heimdall 标志" width="80" height="80">
</p>

<h1 align="center">Heimdall</h1>

<p align="center">
  <a href="README.md">English</a> · <strong>简体中文</strong>
</p>

<p align="center">
  <strong>面向授权 CTF / 安全实验的 AI Agent 框架</strong><br>
  Circle of Circles · 执行、观察与持续探索
</p>

<p align="center">
  <a href="https://github.com/QiantangCredit/heimdall-agent/actions/workflows/ci.yml"><img src="https://img.shields.io/badge/GitHub_Actions-CI-2088FF?style=flat&logo=githubactions&logoColor=white" alt="GitHub Actions CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-22c55e?style=flat" alt="License: MIT"></a>
  <a href="#快速开始"><img src="https://img.shields.io/badge/Docker-linux%2Famd64-2496ED?style=flat&logo=docker&logoColor=white" alt="Docker: linux/amd64"></a>
</p>

<p align="center">
  <a href="#设计理念">设计理念</a> ·
  <a href="#系统架构">系统架构</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="https://ekkoo-z.github.io/post/heimdall-tsecbench/">技术博客</a> ·
  <a href="https://github.com/QiantangCredit/heimdall-agent/issues">反馈问题</a>
</p>

Heimdall 将任务调度、AI 求解器、观察者与工具环境集成到一个可自托管的工作台。添加目标后，可以在浏览器中启动任务，查看探索路径、执行日志与节点证据，并跟踪结果验收。目前以 CTF 解题模块展示设计理念，后续将逐步扩展更多授权实验与评估能力。

> 仅对自有或已获书面授权的系统开展安全测试，禁止超出授权范围。

成绩：Heimdall 在百度 Agent+ 攻防挑战线上赛和[腾讯云 TSecBench](https://tsecbench.zc.tencent.com/#leaderboard) 中均取得 **Top 2**，且两项评测的 **Token 消耗均为排行榜中最少**。

[![腾讯云 TSecBench 榜单：Heimdall 排名第二，综合得分 96.89](docs/images/tsecbench-leaderboard.png)](https://tsecbench.zc.tencent.com/#leaderboard)

设计思路与评测实践见技术博客：[Heimdall 与 TSecBench](https://ekkoo-z.github.io/post/heimdall-tsecbench/)。

## 设计理念

**Circle of Circles：让每一轮探索system prompt带着上一轮的认识继续。**

这个名字借用了黑格尔的“Circle of Circles”意象。Heimdall 将执行与观察组织为内外两层循环：内圈 Executor 完成 **Thought → Action → Observation**；外圈 Observer 读取执行记录，整理已经走过的路、约束与待验证方向，形成短 map，注入求解器下一轮的 system prompt。

<p align="center">
  <img src="docs/heimdall-article-assets/circle-of-circles.png" width="420" alt="Circle of Circles：内圈执行思考、行动与观察，外圈将 map 回传下一轮">
</p>

在 CTF 场景中，Heimdall 采用主求解器串行验证、旁路观察者整理全局的协作方式，把上下文集中在当前目标、实际证据和下一步判断上，增加token效率，以最少的token快速解题。

- **保留尝试，允许修正。** 失败尝试以 `tried-miss` 记录结果；新证据出现后可以重新判断，减少过早排除有效方向。
- **分开保存过程与摘要。** DAG 保留探索方向、依赖与证据；短 map 通过 `CONFIRMED`、`LOCK`、`ANGLES`、`TENSION` 等字段回传关键认识，帮助减少重复尝试和判断冲突。
- **cli+skills** Agent 通过命令行调用工具，Skills 补充工作区知识和模型训练中没有覆盖的技巧，减少mcp和复杂skills占用context分散模型注意力。

https://github.com/user-attachments/assets/ebda3159-ef16-41ec-afa5-3a0b82db605c

<p align="center">观察者多阶段解题演示</p>

## 系统架构

[![Heimdall 架构：Pi 常规求解、观察者反馈、前序摘要与 Claude SDK Loop](docs/heimdall-article-assets/architecture-shot.png)](docs/heimdall-article-assets/architecture-shot.png)

控制面接收目标并调度任务。Regular 阶段由 Pi 求解，观察者持续读取会话、工具结果与 HTTP 记录，将 map 回传求解器。未完成的任务按策略进入 goal模式：先由 Pi summarizer 生成前序摘要，再交给 Claude Agent SDK 接续执行

### 代码架构

后端采用 **TypeScript + Node.js**，操作台采用 **React + Vite + Ant Design**。控制面负责任务生命周期，Agent 负责执行，Observer 负责整理探索证据与反馈；调度策略、平台接入和运行资源分别维护。

```text
heimdall-agent/
├── console/src/         # 操作台
├── src/
│   ├── control/         # 控制面
│   │   └── console/
│   ├── policy/          # 调度策略
│   ├── agent/           # 求解器
│   │   └── backends/
│   ├── observer/        # 观察者
│   ├── taps/            # 流量记录
│   ├── platforms/       # 平台接入
│   ├── shared/
│   └── tools/
├── resources/
│   ├── prompts/
│   ├── workspaces/
│   ├── skills/
│   ├── wordlists/
│   ├── cve/
│   └── toolkits/
├── bin/
├── scripts/
├── deploy/
├── test/
└── docs/
```

## 快速开始

环境： **Docker Engine / Docker Desktop** 和 **Docker Compose ≥ 2.24.4**，建议至少 **4 CPU、8 GB 内存**；拉取部署预留 **25 GB** 磁盘，源码构建预留 **50 GB** 

当前镜像在ubuntu `linux/amd64`打包运行完整测试，其他环境实际运行有问题可提issue

从源码构建：

```bash
git clone https://github.com/QiantangCredit/heimdall-agent.git
cd heimdall-agent
docker compose -f compose.yaml -f deploy/compose.build.yaml up -d --build --wait
```
当前架构无登陆模式 建议只绑定在127.0.0.1，切勿开公网部署

启动后打开 http://127.0.0.1:8700：

1. 在 **设置** 中填写模型网关 URL、模型名称和 API Key。Loop 需要 Anthropic 兼容接口
2. 创建项目，添加授权题目 URL 或平台 code，选择工作区类型并启动
3. 在工作台查看探索图与执行日志，展开节点核对证据和验收结果。

欢迎通过 [Issues](https://github.com/QiantangCredit/heimdall-agent/issues) 改进平台bug 适配等问题

## 许可证

Heimdall 源码采用 [MIT License](LICENSE)。镜像内的第三方工具、模板遵循各自许可证和适用条款。
