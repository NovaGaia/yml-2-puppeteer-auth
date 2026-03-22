---
"yml-2-puppeteer-auth": patch
---

Remove redundant documentation files at monorepo root.

- Remove `API.md` — content fully covered by `packages/lib/README.md`
- Remove `EXAMPLES.md` — content fully covered by `packages/lib/examples/*.yml`
- Remove `PROJECT.md` — initial design document, obsolete since implementation is complete
- Remove `SPECIFICATIONS.md` — content fully covered by `packages/lib/README.md` (YAML reference) and `ARCHITECTURE.md`
- Keep `ARCHITECTURE.md` — unique content: execution flows, extensibility guide, error type mapping
- Keep `TESTING.md` — unique content: debugging guide with real error messages and solutions
- Update root `README.md` to link `ARCHITECTURE.md` and `TESTING.md`
