# Architecture Decision Records

Short, dated records of decisions that a future architecture review should not re-litigate.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-download-error-taxonomy.md) | One download error taxonomy | Accepted |
| [0002](0002-vidara-stream-cache-behind-interface.md) | Vidara stream cache lives inside the adapter | Accepted |
| [0003](0003-config-precedence.md) | Config precedence — DB over env for UI settings, env files for secrets | Proposed |

## Format

Each record states Context, Decision, Consequences, and Alternatives considered. Keep them
short. Add a record when a decision is load-bearing enough that a future explorer would otherwise
re-suggest the thing it rejects.

Related: [CONTEXT.md](../../CONTEXT.md), [LLD](../02-architecture/LLD.md).
