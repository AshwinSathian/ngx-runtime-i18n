# Contributing

Thank you for your interest in contributing to **@ngx-runtime-i18n**!

## Local Setup

1. Clone and install dependencies:

   ```bash
   git clone https://github.com/AshwinSathian/ngx-runtime-i18n.git
   cd ngx-runtime-i18n
   npm ci
   ```

2. Verify builds and tests before committing:

   ```bash
   nx run-many -t build -p=runtime-i18n,runtime-i18n-angular,runtime-i18n-primeng,runtime-i18n-material,runtime-i18n-schematics --configuration=production
   nx run-many -t test -p=runtime-i18n,runtime-i18n-angular,runtime-i18n-primeng,runtime-i18n-material,runtime-i18n-schematics
   nx test cli
   ```

   This mirrors what CI (`.github/workflows/ci.yml`) runs on every push and pull request.

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

Each of the six publishable packages (`@ngx-runtime-i18n/core`, `/angular`, `/material`,
`/primeng`, `/schematics`, `@ngx-runtime-i18n/cli`) is released independently, triggered by
pushing a package-scoped tag. `.github/workflows/release.yml` parses the tag to determine
which package to build and publish.

### One-time setup: npm Trusted Publisher (required before the first release)

Publishing uses npm's [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) via
OIDC — GitHub Actions mints a short-lived credential for each run, so **no `NPM_TOKEN`
secret is needed or used**. Before the first tag-triggered release, an npm org owner must
register this workflow as a trusted publisher **for each of the six packages** at
https://www.npmjs.com/package/\<package-name\>/access (Trusted Publisher tab):

| Setting            | Value                          |
| ------------------- | ------------------------------ |
| CI/CD provider      | GitHub Actions                 |
| Organization or user| `AshwinSathian`                 |
| Repository           | `ngx-runtime-i18n`             |
| Workflow filename     | `release.yml`                |
| Environment          | (leave blank — none is used)  |

This must be repeated once per package. No further action is needed after that — every
subsequent release from this workflow authenticates automatically via OIDC, and npm
generates a [provenance attestation](https://docs.npmjs.com/generating-provenance-statements)
for each publish automatically.

### Publishing a release

1. Bump the version of the specific package you're releasing (run from that package's
   directory, e.g. `libs/runtime-i18n` for core, `tools/cli` for the CLI):

   ```bash
   cd libs/runtime-i18n
   npm version patch|minor|major --no-git-tag-version
   ```

2. Commit the version bump, then create and push a tag in `<package-name>@<version>` form
   (this exact shape is what `release.yml` matches on and parses):

   ```bash
   git add libs/runtime-i18n/package.json
   git commit -m "chore(release): @ngx-runtime-i18n/core@2.1.0"
   git tag @ngx-runtime-i18n/core@2.1.0
   git push && git push origin @ngx-runtime-i18n/core@2.1.0
   ```

3. GitHub Actions builds, sanitizes, and publishes that one package to npm — no other
   packages are touched by this run.

---

## License

MIT
