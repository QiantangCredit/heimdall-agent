<p align="center">
  <img src="console/public/mark.jpg" alt="Heimdall logo" width="80" height="80">
</p>

<h1 align="center">Heimdall</h1>

<p align="center">
  <strong>English</strong> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <strong>An autonomous AI agent framework for authorized CTF and security labs</strong><br>
  Circle of Circles · Execute, observe, and keep exploring
</p>

<p align="center">
  <a href="https://github.com/QiantangCredit/heimdall-agent/actions/workflows/ci.yml"><img src="https://img.shields.io/badge/GitHub_Actions-CI-2088FF?style=flat&logo=githubactions&logoColor=white" alt="GitHub Actions CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-22c55e?style=flat" alt="License: MIT"></a>
  <a href="#quick-start"><img src="https://img.shields.io/badge/Docker-linux%2Famd64-2496ED?style=flat&logo=docker&logoColor=white" alt="Docker: linux/amd64"></a>
</p>

<p align="center">
  <a href="#design-philosophy">Design Philosophy</a> ·
  <a href="#system-architecture">System Architecture</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="https://ekkoo-z.github.io/post/heimdall-tsecbench/">Technical Blog</a> ·
  <a href="https://github.com/QiantangCredit/heimdall-agent/issues">Feedback</a>
</p>

Heimdall brings task scheduling, an AI solver, an observer, and a toolkit together in a self-hosted workspace. Add a target, launch a task from your browser, inspect exploration paths, execution logs, and node evidence, and track result verification. The current CTF solver demonstrates the design; broader authorized lab capabilities will follow in future iterations.

> Only test systems you own or have written permission to assess. Stay within the authorized scope.

Results: Heimdall placed in the **Top 2** in both Baidu's Agent+ online attack-and-defense challenge and [Tencent Cloud TSecBench](https://tsecbench.zc.tencent.com/#leaderboard), with the **lowest token usage on both leaderboards**.

[![Tencent Cloud TSecBench leaderboard: Heimdall ranks second with an overall score of 96.89](docs/images/tsecbench-leaderboard.png)](https://tsecbench.zc.tencent.com/#leaderboard)

Read the [technical blog on Heimdall and TSecBench](https://ekkoo-z.github.io/post/heimdall-tsecbench/) (Chinese) for the design rationale and evaluation walkthrough.

## Design Philosophy

**Circle of Circles: carry what each round learns into the next round's system prompt.**

The name draws on Hegel's “Circle of Circles.” Heimdall organizes execution and observation into two loops: the inner Executor follows **Thought → Action → Observation**; the outer Observer reads execution records, distills explored paths, constraints, and directions to test into a compact map, and injects it into the solver's next system prompt.

<p align="center">
  <img src="docs/heimdall-article-assets/circle-of-circles.png" width="420" alt="Circle of Circles: the inner loop thinks, acts, and observes; the outer loop feeds a map into the next round">
</p>

For CTF tasks, a primary solver tests hypotheses sequentially while an observer works alongside it to maintain the broader picture. This keeps the context focused on the current target, concrete evidence, and the next decision, helping solve challenges quickly with fewer tokens.

- **Preserve attempts and allow revisions.** Failed attempts are recorded as `tried-miss`. New evidence can reopen a direction, reducing the risk of ruling out a viable path too early.
- **Keep the process and its summary separate.** A DAG preserves exploration directions, dependencies, and evidence. A compact map returns key findings through fields such as `CONFIRMED`, `LOCK`, `ANGLES`, and `TENSION`, helping reduce repeated attempts and conflicting conclusions.
- **CLI + Skills.** The agent invokes tools through the command line. Skills add workspace knowledge and techniques not covered by model training, reducing the context overhead and distractions of MCP integrations and complex skill sets.

https://github.com/user-attachments/assets/ebda3159-ef16-41ec-afa5-3a0b82db605c

<p align="center">Observer demo: a multistage challenge</p>

## System Architecture

[![Heimdall architecture: regular solving with Pi, observer feedback, a prior-run summary, and a Claude SDK loop](docs/heimdall-article-assets/architecture-shot.png)](docs/heimdall-article-assets/architecture-shot.png)

The control plane receives targets and schedules tasks. Pi handles the Regular phase while the observer continuously reads sessions, tool results, and HTTP records, feeding a map back to the solver. Depending on the scheduling policy, unfinished tasks enter goal mode: a Pi summarizer first summarizes the previous run, then the Claude Agent SDK continues the task.

### Code Structure

The backend uses **TypeScript + Node.js**, and the operator desk uses **React + Vite + Ant Design**. The control plane manages task lifecycles, the Agent executes tasks, and the Observer organizes exploration evidence and feedback. Scheduling policies, platform integrations, and runtime resources are maintained separately.

```text
heimdall-agent/
├── console/src/         # Operator desk
├── src/
│   ├── control/         # Control plane
│   │   └── console/
│   ├── policy/          # Scheduling policies
│   ├── agent/           # Solver
│   │   └── backends/
│   ├── observer/        # Observer
│   ├── taps/            # Traffic recording
│   ├── platforms/       # Platform integrations
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

## Quick Start

Requirements: **Docker Engine / Docker Desktop** and **Docker Compose ≥ 2.24.4**. We recommend at least **4 CPUs and 8 GB of RAM**. Allow **25 GB of disk space** when deploying a prebuilt image, or **50 GB** when building from source.

The current image has been built and tested end to end on Ubuntu (`linux/amd64`). If you encounter issues on another environment, please open an issue.

Install the prebuilt offline image from [GitHub Releases](https://github.com/QiantangCredit/heimdall-agent/releases/latest):

```bash
curl -fL https://github.com/QiantangCredit/heimdall-agent/releases/latest/download/download-install.sh -o download-install.sh
bash download-install.sh
```

The installer downloads two parts, verifies SHA-256 checksums, assembles the offline archive, and starts Docker Compose. To use another port, run `HEIMDALL_PORT=8701 bash download-install.sh`. Installation files are kept in `./heimdall-offline`; model credentials start empty. For manual or air-gapped installation, see the [offline deployment guide](deploy/offline/README.md).

Build from source:

```bash
git clone https://github.com/QiantangCredit/heimdall-agent.git
cd heimdall-agent
docker compose -f compose.yaml -f deploy/compose.build.yaml up -d --build --wait
```

The current version has no login mechanism. Bind it to `127.0.0.1` and do not expose it to the public internet.

Once it starts, open http://127.0.0.1:8700:

1. In **Settings**, enter your model gateway URL, model name, and API key. Loop requires an Anthropic-compatible API.
2. Create a project, add an authorized challenge URL or platform code, select a workspace type, and start the task.
3. Inspect the exploration graph and execution logs in the desk. Expand nodes to review evidence and verification results.

Report bugs and compatibility issues through [Issues](https://github.com/QiantangCredit/heimdall-agent/issues).

## License

Heimdall's source code is licensed under the [MIT License](LICENSE). Third-party tools and templates in the image remain subject to their own licenses and terms.
