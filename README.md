# auth-scenario

Monorepo for `auth-scenario` — a YAML-driven Puppeteer authentication library and desktop app.

## Packages

| Package | Description |
|---------|-------------|
| [`packages/lib`](./packages/lib) | Node.js library — interprets YAML auth scenarios with Puppeteer |
| `packages/app` | Tauri desktop app — visual editor and test runner (coming soon) |

## Getting started

See [`packages/lib/README.md`](./packages/lib/README.md) for the library documentation.

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm turbo run test

# Build
pnpm turbo run build
```

## Stack

- **Package manager**: pnpm workspaces
- **Orchestration**: Turborepo
- **Versioning**: Changesets
- **CI/CD**: GitHub Actions
