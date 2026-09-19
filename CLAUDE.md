# CLAUDE.md

## Agent skills

### Issue tracker

Issues live as GitHub issues on `imal1/milktown`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles use their default label strings. See `docs/agents/triage-labels.md`.

### 验收线

任何票关掉之前必须过 `docs/agents/daily-usable.md`。一条命令：`bun run check`。
新代码要在三层回路里留下会变红的测试，否则不算完成。

### Domain docs

Single-context layout — `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
