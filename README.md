# @lkw-ai/cli

Command-line interface for the [LKW](https://lkw.digital) low-code workflow platform.

Bootstrap clients, manage workflows, fire triggers, import/export, and
script your LKW infrastructure from the terminal.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Install

```bash
npm install -g @lkw-ai/cli
```

Or run without installing:

```bash
npx @lkw-ai/cli auth login
```

## Quick start

```bash
# 1. Authenticate (stored in ~/.lkw/config.json)
lkw auth login --api https://api.lkw.digital

# 2. Bootstrap a new client (org + admin user + starter project)
lkw client init "ACME Logistics" --admin-email ops@acme.com

# 3. Browse
lkw whoami
lkw project list
lkw workflow list <projectId>

# 4. Move workflows between environments
lkw workflow export <id> -o my-workflow.json
lkw workflow import <targetProjectId> ./my-workflow.json --name "Imported"

# 5. Trigger workflows directly
lkw workflow trigger <id> --key $LKW_API_KEY --data '{"foo": "bar"}'
lkw workflow trigger <id> --key $LKW_API_KEY --file payload.json --json
```

## Commands

### Auth
| Command | What it does |
| :--- | :--- |
| `lkw auth login [--api <url>] [--email <e>] [--password <p>] [--profile <name>]` | Authenticate; stores token in `~/.lkw/config.json` |
| `lkw auth logout` | Revoke the active session and clear the local token |
| `lkw whoami` | Show the active profile and authenticated user |

### Client / profile
| Command | What it does |
| :--- | :--- |
| `lkw client init <name>` | Create org + admin user + starter project; prints credentials |
| `lkw client doctor` | Diagnose config / connectivity / auth (use when "it's broken") |
| `lkw client switch [profile]` | List / switch / `--add` profiles in `~/.lkw/config.json` |

### Project
| Command | What it does |
| :--- | :--- |
| `lkw project list [--json]` | List projects accessible to the active user |

### Workflows
| Command | What it does |
| :--- | :--- |
| `lkw workflow list <projectId> [--json]` | List workflows in a project |
| `lkw workflow export <id> [-o file]` | Dump workflow as JSON (stdout by default) |
| `lkw workflow import <projectId> <file> [--name <n>]` | Create a workflow from an exported JSON file |
| `lkw workflow validate <file> [--strict]` | Static check: trigger, dead nodes, missing config, dangling edges (offline) |
| `lkw workflow diff <id> <file>` | Compare local JSON vs prod (added/removed/modified nodes) |
| `lkw workflow trigger <id> --key <apiKey> [--data \| --file] [--json]` | Fire a workflow via its public HTTP endpoint |
| `lkw workflow watch <executionId>` | Stream execution logs live (tail -f style) |
| `lkw workflow logs <executionId> [--json]` | Fetch all logs of a finished execution |
| `lkw workflow dev <file> <workflowId> --key <k> [--payload <f>]` | Hot-reload: watch JSON, auto-PUT on change, optionally trigger + tail logs |

### Templates
| Command | What it does |
| :--- | :--- |
| `lkw template list [--json]` | List workflow templates |
| `lkw template use <templateId> <projectId> [--name <n>]` | Clone a template into a project as a DRAFT |

### Mocks
| Command | What it does |
| :--- | :--- |
| `lkw mocks ping [client] [--base <url>]` | Ping `lkw-mocks.vercel.app` /health and probe a known client endpoint |

Help on any command: `lkw <cmd> --help`.

## Profiles

The CLI stores credentials at `~/.lkw/config.json` (mode `0600`) with a
profile structure:

```json
{
  "profiles": {
    "default": { "apiBaseUrl": "https://api.lkw.digital", "token": "...", "email": "me@co.com" },
    "staging": { "apiBaseUrl": "https://api.staging.lkw.digital", "token": "..." }
  },
  "activeProfile": "default"
}
```

Switch profiles by passing `--profile <name>` to `lkw auth login` or
editing the file directly.

## Scripting

Every command supports `--json` (where applicable) for machine-readable
output. The CLI exits non-zero on any error and writes the message to
stderr — safe to use in shell pipelines.

```bash
WORKFLOWS=$(lkw workflow list "$PROJECT_ID" --json)
echo "$WORKFLOWS" | jq '.[] | select(.status == "ACTIVE") | .id'
```

## Built on `@lkw-ai/sdk`

The CLI is a thin command layer over [`@lkw-ai/sdk`](https://github.com/lkw-ai/lkw-sdk).
If you need to do something the CLI doesn't expose, drop into the SDK:

```ts
import { LkwClient } from '@lkw-ai/sdk';
const lkw = new LkwClient({ apiBaseUrl: 'https://api.lkw.digital', bearerToken: '...' });
```

## Local development (before npm publish)

Until `@lkw-ai/sdk` is published to npm, link it locally:

```bash
git clone https://github.com/lkw-ai/lkw-sdk
cd lkw-sdk && npm install && npm run build && npm link

cd ../lkw-cli && npm install && npm link @lkw-ai/sdk
npm run build
node dist/index.js --help
```

## License

Apache 2.0.
