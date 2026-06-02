# @lkw-ai/cli

Official command-line interface for the [LKW](https://lkw.digital)
low-code workflow platform.

Bootstrap clients, manage workflows, run interactive setup, watch logs
live, validate/diff/import JSON, and script your LKW infrastructure
from the terminal.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
![Node.js >=18](https://img.shields.io/badge/Node.js-%E2%89%A518-brightgreen)

## Install

```bash
npm install -g @lkw-ai/cli
```

Or run without installing:

```bash
npx @lkw-ai/cli init
```

## 60-second tour

```bash
# 1. Interactive first-run: API URL + login + saves config
lkw init

# 2. Verify everything is fine
lkw client doctor

# 3. Browse
lkw whoami
lkw project list
lkw workflow list <projectId>

# 4. Run a workflow + tail its logs
lkw workflow trigger <id> --key $LKW_API_KEY --data '{"foo":"bar"}'
lkw workflow watch <executionId>

# 5. Move a workflow between envs
lkw workflow export <id> -o my-wf.json
lkw workflow validate ./my-wf.json
lkw workflow import <targetProjectId> ./my-wf.json
```

## Commands

### Setup

| Command | What |
| :--- | :--- |
| `lkw init` | **One-shot interactive setup** — API URL + login + profile in one step. Use this first. |
| `lkw client doctor` | Diagnostics across config / connectivity / auth / API / env. Run when something is off. |
| `lkw client switch [profile]` | List, switch, or `--add` profiles in `~/.lkw/config.json`. |

### Auth

| Command | What |
| :--- | :--- |
| `lkw auth login [--api <url>] [--email <e>] [--password <p>] [--profile <n>]` | Authenticate (interactive prompts when flags omitted). |
| `lkw auth logout` | Revoke the active session + clear local token. |
| `lkw whoami` | Show the active profile and authenticated user. |

### Workflows

| Command | What |
| :--- | :--- |
| `lkw workflow list <projectId> [--json]` | List workflows in a project. |
| `lkw workflow export <id> [-o file]` | Dump workflow as JSON. |
| `lkw workflow import <projectId> <file> [--name <n>]` | Create a workflow from JSON. |
| `lkw workflow validate <file> [--strict]` | Static check: trigger, dead nodes, missing config, dangling edges (offline). |
| `lkw workflow diff <id> <file>` | Compare local JSON vs prod (added/removed/modified nodes). |
| `lkw workflow trigger <id> --key <apiKey> [--data \| --file] [--json]` | Fire a workflow via its public HTTP endpoint. |
| `lkw workflow watch <executionId>` | Stream execution logs live (tail -f style). |
| `lkw workflow logs <executionId> [--json]` | Fetch all logs of a finished execution. |
| `lkw workflow dev <file> <workflowId> --key <k> [--payload <f>]` | Hot-reload: watch JSON, auto-PUT on change, optionally trigger + tail. |
| `lkw workflow delete <id> [--yes]` | **Destructive** — asks confirmation unless `--yes` / `LKW_YES=true`. |

### Templates

| Command | What |
| :--- | :--- |
| `lkw template list [--json]` | List workflow templates. |
| `lkw template use <templateId> <projectId> [--name <n>]` | Clone a template into a project as DRAFT. |

### Projects & Client

| Command | What |
| :--- | :--- |
| `lkw project list [--json]` | List projects accessible to the active user. |
| `lkw client init <name>` | Bootstrap org + admin user + starter project. Prints credentials. |

### Mocks

| Command | What |
| :--- | :--- |
| `lkw mocks ping [client] [--base <url>]` | Ping `lkw-mocks.vercel.app` `/health` and probe a known client endpoint (arcom, hubio). |

### Misc

| Command | What |
| :--- | :--- |
| `lkw completion <shell>` | Print bash / zsh / fish completion. `lkw completion bash >> ~/.bashrc` |
| `lkw --verbose <cmd>` | Log HTTP requests + retry attempts + decisions to stderr. |
| `lkw --help` / `lkw <cmd> --help` | Full help for every subcommand. |

## Profiles

Config lives at `~/.lkw/config.json` (mode `0600`) with a profile
structure so you can switch envs without re-logging in:

```json
{
  "profiles": {
    "default": { "apiBaseUrl": "https://api.lkw.digital", "token": "eyJ...", "email": "me@co.com" },
    "staging": { "apiBaseUrl": "https://staging-api.lkw.digital", "token": "..." },
    "local":   { "apiBaseUrl": "http://localhost:3001", "token": "..." }
  },
  "activeProfile": "default"
}
```

```bash
lkw client switch              # interactive list + pick
lkw client switch staging      # direct
lkw client switch --add ci --url https://api.lkw.digital   # add new
```

## Environment variables

| Var | Effect |
| :--- | :--- |
| `LKW_VERBOSE=true` | Same as `--verbose` — verbose HTTP logging to stderr |
| `LKW_YES=true` | Skip all confirmation prompts (CI-safe) |
| `NO_COLOR=1` | Strip ANSI colors (some CI logs) |

## Scripting

Every list/get command supports `--json` for machine-readable output.
The CLI exits non-zero on error and writes the message to stderr —
safe to use in shell pipelines.

```bash
# Find all ACTIVE workflows + trigger each
lkw workflow list "$PROJECT_ID" --json \
  | jq -r '.[] | select(.status == "ACTIVE") | .id' \
  | xargs -I {} lkw workflow trigger {} --key "$LKW_API_KEY"
```

```bash
# Doctor in CI
lkw client doctor --json | jq -e '.checks | all(.ok)' || exit 1
```

## Errors

When a command fails, the CLI prints a one-liner error + a hint:

```
✗ token may have expired — run `lkw auth login`
  💡 token may have expired — run `lkw auth login` or `lkw client doctor`
```

Exit codes:
- `0` — success
- `1` — generic failure (HTTP error, validation error, etc)
- `2` — bad CLI invocation (unknown shell, missing required arg, etc)

## Built on `@lkw-ai/sdk`

The CLI is a thin command layer over [`@lkw-ai/sdk`](https://github.com/lkw-ai/lkw-sdk).
If you need a flow the CLI doesn't expose, drop into the SDK:

```ts
import { LkwClient } from '@lkw-ai/sdk';
const lkw = new LkwClient({ apiBaseUrl: 'https://api.lkw.digital', bearerToken: '...' });
```

The CLI also wires the SDK's `onRequest` telemetry into its
`--verbose` channel — anything you'd see via `lkw -v` you can capture
in your own service by using the SDK directly.

## Versioning

Semver. The CLI and SDK ship in lockstep when surface changes (CLI
0.3.0 pairs with SDK 0.3.0). Pin both to the same minor in CI:

```bash
npm install -g @lkw-ai/cli@^0.3.0
```

See [CHANGELOG](./CHANGELOG.md) for the full history.

## Support

- Issues: https://github.com/lkw-ai/lkw-cli/issues
- Docs: https://lkw.digital/documentation
- Contact: contact@lkw.digital

## License

Apache 2.0 — see [LICENSE](./LICENSE).
