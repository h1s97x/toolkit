# Toolkit

Shared infrastructure packages for the product group — reducing duplication and technical debt.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [@h1s97x/logger](./packages/logger) | 0.1.0 | Universal isomorphic logger with structured JSON output |

## Setup

```bash
pnpm install
pnpm build
pnpm test
```

## Publishing

We use [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

```bash
# 1. Record a changeset
pnpm changeset

# 2. Bump versions
pnpm changeset:version

# 3. Publish (or via GitHub Actions)
pnpm changeset:publish
```

## License

MIT
