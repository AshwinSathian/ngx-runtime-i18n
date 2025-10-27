# Contributing

Thank you for your interest in contributing to **@ngx-runtime-i18n**!

## Local Setup

1. Clone and install dependencies:

   ```bash
   git clone https://github.com/AshwinSathian/ngx-runtime-i18n.git
   cd ngx-runtime-i18n
   npm ci
   ```

2. Verify builds before committing:

   ```bash
   nx run-many -t build -p=runtime-i18n,runtime-i18n-angular --configuration=production
   ```

3. Test the demos:

   ```bash
   nx serve demo        # CSR demo → http://localhost:4200
   nx serve demo-ssr    # SSR demo → http://localhost:4000
   ```

   Before running, ensure you have language catalogs in:

   - `apps/demo/src/public/i18n/{en,hi,de}.json`
   - `apps/demo-ssr/src/public/i18n/{en,hi,de}.json`

4. Run formatting and lint checks before committing:
   ```bash
   nx format:write
   nx lint
   ```

---

## Coding Guidelines

- Keep **core** (`@ngx-runtime-i18n/core`) framework-agnostic.
- Keep **Angular wrapper** lean and aligned with current Angular APIs (signals, SSR-safe).
- Avoid magic or implicit behaviors.
- Use explicit TypeScript types for public APIs.
- Write minimal, readable code with clear naming.

---

## Commit Messages

Follow **Conventional Commits**:

```
feat: add new feature
fix: correct a bug
docs: update documentation
chore: update build tooling
```

---

## Release Workflow

Releases are handled via GitHub Actions. To publish a new version:

1. Bump version using npm:

   ```bash
   npm version patch|minor|major
   ```

2. Push tags to GitHub:

   ```bash
   git push --follow-tags
   ```

3. CI/CD will automatically build and publish to npm.

---

## License

MIT
