# Changelog

All notable changes to `@lkw-ai/cli` are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.3.0] — 2026-06-02

### Added
- **`lkw init`** — single interactive command replaces the multi-step
  `auth login --api ... --email ... --password ...`. Presets for cloud
  vs local self-hosted, validates the API with `/health` before asking
  credentials, persists profile in one go.
- **`lkw completion <shell>`** — emits bash / zsh / fish completion
  scripts. Install once with `lkw completion bash >> ~/.bashrc`.
- **`lkw workflow delete <id>`** — destructive op with interactive
  confirmation; bypass with `--yes` or `LKW_YES=true` in CI.
- **`lkw -v` / `--verbose`** — global flag, logs HTTP requests + retry
  attempts + decisions to stderr. Same effect via `LKW_VERBOSE=true`.
- **`lkw client doctor`** is now grouped by layer (config /
  connectivity / auth / api / env), shows hints next to failed checks,
  has `--json` output for CI integration, and includes a "Token valid"
  probe that detects expired JWTs.

### Changed
- `lkw client doctor` output reorganized — used to be a flat list, now
  prints sections with section headers + hints.
- `die(message)` helper now accepts an optional second argument
  `{ status, hint }` so command errors can include a "💡 try X" tip.
- CLI now bundles a friendly LkwError translator (`friendlyError()` in
  client.ts) used by command catches — turns "401 Unauthorized" into
  "token may have expired — run `lkw auth login`".
- Bumped `@lkw-ai/sdk` peer to `^0.3.0` for LkwError class + telemetry
  + auto-refresh.

### Migration from 0.2.0
- The CLI surface is additive — old commands work unchanged. The only
  behavior change is `client doctor` now uses the new SDK's `LkwError`
  class for its auth probe.
- New `lkw init` is the recommended way to onboard fresh users.

## [0.2.0] — 2026-06-01

### Added
- `lkw workflow watch <executionId>` — live tail of execution logs.
- `lkw workflow logs <executionId>` — fetch logs of a finished run.
- `lkw workflow validate <file>` — static graph check (offline).
- `lkw workflow diff <id> <file>` — local vs prod node diff.
- `lkw workflow dev <file> <id>` — hot-reload (watch JSON, auto-PUT
  on change, trigger + tail logs).
- `lkw client doctor` — config / token / connectivity diagnostic.
- `lkw client switch [profile]` — manage `~/.lkw/config.json` profiles.
- `lkw template list` / `lkw template use` — clone workflow templates.
- `lkw mocks ping` — health-check lkw-mocks endpoints.

## [0.1.0] — 2026-05-29

Initial release.

- `auth login / logout / whoami`
- `client init <name>` — bootstrap org + admin + project
- `project list`
- `workflow list / export / import / trigger`
- Profile config at `~/.lkw/config.json` (mode 0600).
