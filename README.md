# EnoFlow — Visual Workflow Automation Builder

A lightweight, educational, browser-native workflow automation builder inspired by tools like n8n and Zapier, but intentionally simpler, visual, and zero-server required.

[![EnoFlow Version](https://img.shields.io/badge/EnoFlow-v0.1.0-8b5cf6?style=flat-square)](package.json)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-Vitest%20passing-brightgreen?style=flat-square)](src/lib/engine.test.ts)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Donate-orange?style=flat-square&logo=buy-me-a-coffee)](https://buymeacoffee.com/enoalph)

---

## Overview

EnoFlow lets you assemble automation workflows visually by dragging nodes onto an interactive canvas and connecting their input/output handles. Each node represents a distinct step in your data pipeline — a trigger, an action, a data transformation, a conditional branch, or a storage output.

The entire flow executes **100% in your browser** using an asynchronous Directed Acyclic Graph (DAG) topological sorting engine. No databases, Docker containers, or paid API keys required.

```text
┌─────────────────┐       ┌──────────────────────┐       ┌─────────────────────┐
│  Manual Trigger │ ────▶ │  Text Formatter Node │ ────▶ │  Notification Node │
│ (Emits Payload) │       │   (Transforms Data)  │       │  (Displays Result)  │
└─────────────────┘       └──────────────────────┘       └─────────────────────┘
                                      │
                                      ▼
                          [ Execution & Debug Panel ]
```

### Key Highlights
* 🎓 **Educational by Design** — Master DAG concepts, node handles, and data pipelines without server setup.
* 🖥️ **Client-Side Engine** — Runs locally in the browser with real-time step-by-step execution.
* 🧩 **14 Built-in Nodes** — Covering triggers, mock HTTP requests, code evaluation, string/object transforms, and local storage.
* 🐛 **Step-by-Step Debugger** — Pause and inspect inputs and outputs at every individual node.
* ✅ **Real-Time Validation** — Graph linting checks for cycles, missing triggers, and disconnected paths before execution.
* 📦 **Portability** — Export and import workflows as standard JSON files.

---

## 14 Built-in Nodes

| Category | Icon | Nodes | Description |
|---|---|---|---|
| **Triggers** | ⚡ | **Manual Trigger**, **Webhook Trigger**, **Schedule Trigger** | Starts execution on user click, simulated incoming webhook payload, or cron interval. |
| **Actions** | ⚙️ | **Delay**, **HTTP Request**, **Code Block** | Introduce simulated network delays, mock REST API requests with latency, or execute custom JavaScript. |
| **Transforms** | 🔄 | **JSON Parser**, **Text Formatter**, **Object Mapper**, **Array Iterator** | Parse/stringify JSON, interpolate string templates, reshape keys, and map/filter array elements. |
| **Conditions** | 🔀 | **Condition** | Evaluate fields against operators (`equals`, `contains`, `>`, `<`) with separate true/false branches. |
| **Outputs** | 💾 | **Local Storage**, **Webhook Response**, **Notification** | Persist data to browser localStorage, mock a response payload, or fire web notifications. |

---

## Architecture

EnoFlow is structured around three core architectural layers:

```text
               ┌─────────────────────────────────────────┐
               │          React Flow Canvas UI           │
               │   (FlowCanvas, NodePalette, Toolbar)    │
               └────────────────────┬────────────────────┘
                                    │ Updates
                                    ▼
               ┌─────────────────────────────────────────┐
               │           Zustand State Store           │
               │  (nodes, edges, executionResults, UI)   │
               └────────────────────┬────────────────────┘
                                    │ Dispatches
                                    ▼
               ┌─────────────────────────────────────────┐
               │          FlowEngine (Core)              │
               │  - Cycle Detection (DFS)                │
               │  - Topological Sort                     │
               │  - Node Handler Execution & Isolation   │
               └─────────────────────────────────────────┘
```

---

## Quickstart

### Prerequisites
* [Node.js](https://nodejs.org/) v18+ (Node 20+ recommended)
* `npm`, `pnpm`, or `bun`

### Running Locally

```bash
# 1. Clone the repository
git clone https://github.com/AlphaIsYour/enoflow.git
cd enoflow

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser:
* **Workflow Editor**: [http://localhost:3000/editor](http://localhost:3000/editor)
* **Pre-built Templates**: [http://localhost:3000/templates](http://localhost:3000/templates)
* **Documentation**: [http://localhost:3000/docs](http://localhost:3000/docs)

### Available Scripts

```bash
npm run dev        # Starts Next.js dev server on http://localhost:3000
npm test           # Runs Vitest unit test suite
npm run test:watch # Runs Vitest in interactive watch mode
npm run typecheck  # Validates TypeScript types (tsc --noEmit)
npm run lint       # Runs ESLint code style analysis
npm run build      # Produces optimized production build
```

---

## Pre-built Templates

EnoFlow ships with 6 ready-to-use workflow templates:
1. **Hello World** — Fundamental trigger &rarr; notification pipeline.
2. **Webhook Processor** — Simulate parsing incoming webhook payloads, branching, and responding.
3. **Data Pipeline** — Fetch API &rarr; JSON parse &rarr; Object map &rarr; save to Local Storage.
4. **Text Transform Chain** — Multi-step string case conversion, trimming, and templating.
5. **Scheduled Report** — Simulate interval cron-based trigger emitting periodic digests.
6. **Array Processing** — Array mapping, filtering, and aggregation.

---

## Roadmap

### Phase 1: Engine Foundation & Quality (Completed / Current)
- [x] Visual graph canvas powered by `@xyflow/react`.
- [x] 14 core nodes spanning triggers, transforms, and outputs.
- [x] Step-by-step interactive debugger and JSON inspector.
- [x] Automated unit test suite with Vitest.
- [x] Continuous Integration workflow with GitHub Actions.

### Phase 2: Engine Resilience & Branching (In Progress)
- [ ] Fix condition node branching to prune inactive paths.
- [ ] Support asynchronous code execution and Promise resolution in Code Block nodes.
- [ ] One-click copy formatted JSON button in the execution drawer.
- [ ] Interactive canvas empty-state guide for first-time visitors.

### Phase 3: Node Ecosystem Expansion (Help Wanted)
- [ ] **Math / Calculator Node** (`+`, `-`, `*`, `/`, modulo, rounding).
- [ ] **CSV to JSON Node** with custom delimiter and header detection.
- [ ] **Date / Timestamp Node** for parsing and formatting UNIX/ISO dates.
- [ ] **Regex Extractor Node** for pattern matching text inputs.

### Phase 4: Power User Features (Future)
- [ ] Keyboard shortcut navigation (`Ctrl+Enter` to run, `Del` to delete).
- [ ] Subflow grouping and re-usable flow modules.
- [ ] Flow undo / redo history stack.

---

## Contributing

We love contributions! Whether you are interested in creating a brand-new workflow node, writing tests, improving documentation, or fixing engine bugs, your input is deeply appreciated.

* 📖 Read our **[Contribution Guide](CONTRIBUTING.md)** for local development setup, coding standards, and how to add a new node type in 4 simple steps.
* 🏷️ Looking for a place to start? Check out our **[`good first issue`](https://github.com/AlphaIsYour/enoflow/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)** list or explore the [curated candidate issues](.github/candidate-issues/README.md).
* 📜 Review our **[Code of Conduct](.github/CODE_OF_CONDUCT.md)** to keep our community inclusive and welcoming.

---

## Contributors

Thanks to everyone who has helped build and improve EnoFlow!

<!-- All contributors will be listed here upon merged contributions -->
* [@AlphaIsYour](https://github.com/AlphaIsYour) (Maintainer)
* [@mikevillari](https://github.com/mikevillari) — Fixed asynchronous code block execution (#9) and condition branch pruning (#10)
* [@72umesh](https://github.com/72umesh) — Added interactive empty-state onboarding guide (#11) and Math Calculator transformation node (#19)
* [@Tanmaypatil-25](https://github.com/Tanmaypatil-25) — Added Base64 Encode / Decode transformation node (#26)

*(Your name can be here! Check out [CONTRIBUTING.md](CONTRIBUTING.md) to make your first contribution).*

---

## Supporting EnoFlow

If you find EnoFlow useful for learning visual programming or building automation workflows, you can optionally support its development:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Support%20EnoFlow-orange?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/enoalph)

Your support helps keep the project maintained, documented, and free for everyone.

---

## License

This project is licensed under the [MIT License](LICENSE).
