# Angular 20→22 / Nx 22→23 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the workspace from Angular 20.3.27 / Nx 22.7.8 to Angular 22.1.1 / Nx 23.1.1, keeping every intermediate state green (build + test + lint) and keeping the three publishable libraries' peer ranges honest for consumers.

**Architecture:** No feature code changes. This is a dependency-version migration executed in four ordered, independently-verifiable stages, each gated on a full `nx run-many -t build,test,lint` pass before moving on. Stage boundaries exist because (a) Angular's own deprecation policy requires updating one major version at a time via its migration schematics, and (b) the `@nx/angular` line that ships with Nx 22.x caps Angular support at `<22`, so Nx must move to 23.x before Angular can move to 22.

**Tech Stack:** Nx (npm-preset, no `angular.json` — pure `project.json` workspace), Angular CLI/build (`@angular/build`, esbuild-based), Jest + `jest-preset-angular`, ESLint 9 + `angular-eslint`, ng-packagr, ts-jest/SWC, ts-node.

## Global Constraints

- Bump Angular one major at a time: 20 → 21 → 22. Source: Angular's own [breaking-change policy](https://angular.dev/reference/releases) — "Updates using `ng update` must be performed one major version at a time."
- Nx must reach 23.x **before** Angular reaches 22.x. Verified via npm registry: `@nx/angular@22.7.8` peers `@schematics/angular": ">= 19.0.0 < 22.0.0"` (caps below Angular 22); `@nx/angular@23.1.1` peers `">= 20.0.0 < 23.0.0"` (covers 20–22).
- TypeScript must land on **exactly `~6.0.3`** for the final Angular 22 stage — not `latest` (which is `7.0.2` on the npm registry today). Verified: `@angular/compiler-cli@22.1.1` peer is `"typescript": ">=6.0 <6.1"`, and Angular's own v22 CHANGELOG breaking-changes list states *"TypeScript versions older than 6.0 are no longer supported"* and *"drop support for TypeScript 5.9"*. Do not run `npm install typescript@latest` at any point in this plan.
- Angular 21 stays on TypeScript `~5.9.2` (no TS bump needed mid-flight). Verified: `@angular/build@21.2.20` peer is `"typescript": ">=5.9 <6.0"`.
- Node must satisfy `^22.22.3 || ^24.15.0 || >=26.0.0` for the final stage (verified via `@angular/core@22.1.1` `engines`). Confirm both CI (`.github/workflows/ci.yml`, currently `node-version: 22`) and local dev Node (currently `v24.19.0`, satisfies `^24.15.0`) meet this before Stage 3.
- `jest-preset-angular@14.6.1` (current) peers `"@angular/core": ">=15.0.0 <21.0.0"` — it does **not** support Angular 21, so the Jest toolchain must be bumped to `jest-preset-angular@17.0.0` (which covers Angular 20–22) in the same stage as the Angular 21 bump, not deferred to the Angular 22 stage. That pulls `jest@^30.0.0`, `jest-environment-jsdom@^30.0.0`, `@types/jest@^30.0.0` along with it (verified via npm peer metadata).
- The three publishable libraries' `peerDependencies` upper bounds (`@angular/core|common|platform-browser": ">=16 <22"`, `@angular/material": ">=16 <22"`) only need widening to `<23` once Angular actually reaches 22 (Angular 21 already satisfies `<22`). Do this widening as its own reviewable commit, separate from the dependency bump commits.
- `primeng`'s peer range in `libs/runtime-i18n-primeng/package.json` (`">=17 <20.4.0"`) is **out of scope**. PrimeNG's own `latest` is already on major 22 with peers requiring Angular `^22.0.0` — that's a pre-existing, unrelated compatibility gap. Do not touch it in this plan.
- Verified via `grep`: zero `@Component` declarations exist inside the publishable libraries (`libs/runtime-i18n-angular`, `-material`, `-primeng`) — all 5 `@Component` usages in the repo are in the two demo apps, and none sets `changeDetection` explicitly. This matters because Angular 22 changes the *default* `changeDetection` from `Default` to `OnPush` when unset (verified in the v22 CHANGELOG: *"Component with undefined `changeDetection` property are now `OnPush` by default"*), and Angular ships an automated migration (`ChangeDetectionStrategy.Eager` opt-out) for it — but still requires a manual visual smoke check of both demo apps after Stage 3 (see Task 6).
- Neither Cypress, `@nx/vite`/Vitest, NgRx generators, nor Angular Module Federation are used anywhere in this repo (verified via grep across `apps/`, `libs/`, and `*.json`) — none of Nx 23's breaking removals (`@nx/angular/module-federation` entry point, `ngrx`/`move` generators, `@nx/vite` support) apply here.
- Every stage ends with: `npx nx run-many -t lint,build,test --all` passing, plus (Stage 3 only) a manual `nx build demo` / `nx build demo-ssr` + browser smoke check.
- Do not push to remote or publish packages as part of this plan — local commits only, one per stage/task.

---

## Stage 0 — Baseline

### Task 0: Record a clean baseline

**Files:** none modified.

- [ ] **Step 1: Confirm a clean working tree**

```bash
git status --porcelain
```
Expected: no output (or only the pre-existing untracked `.claude/` dir). If anything else is dirty, stop and ask before proceeding.

- [ ] **Step 2: Run the full verification suite on current versions and save the output**

```bash
npx nx run-many -t lint,build,test --all 2>&1 | tee /tmp/baseline-verify.log
tail -30 /tmp/baseline-verify.log
```
Expected: all targets succeed. This is the baseline every later stage must match or exceed. If baseline fails, fix that first — do not start the upgrade on a red baseline.

- [ ] **Step 3: Record current installed versions for the commit trail**

```bash
npx nx --version
npm ls @angular/core typescript --depth=0
```

---

## Stage 1 — Nx 22.7.8 → 23.1.1

### Task 1: Migrate Nx to 23.1.1 (Angular version untouched)

**Files:**
- Modify: `package.json` (root) — `nx`, `@nx/angular`, `@nx/devkit`, `@nx/eslint`, `@nx/eslint-plugin`, `@nx/jest`, `@nx/js`, `@nx/playwright`, `@nx/web`, `@swc/core`, `@swc-node/register`
- Generated/modified: `migrations.json` (transient — reviewed then deleted by `nx migrate --run-migrations`)
- Possibly modified: `nx.json` (only if a migration generator changes schema — review diff before committing)

**Interfaces:** N/A (tooling-only stage).

- [ ] **Step 1: Generate the migration set, targeting the exact version researched today**

```bash
npx nx migrate 23.1.1
```
This writes `migrations.json` and bumps `nx`/`@nx/*` versions in `package.json`. It does **not** install or run anything yet — Nx's documented two-step workflow (generate → review → run) is what makes this reviewable. Source: https://nx.dev/docs/technologies/angular/guides/nx-and-angular ("nx migrate ... splits the process into generating a migrations.json file for review and modification, followed by executing").

- [ ] **Step 2: Review the diff and the generated migrations.json before installing anything**

```bash
git diff package.json
cat migrations.json
```
Confirm: (a) `nx` and every `@nx/*` package landed on `23.1.1`; (b) `@angular/*` package versions in `package.json` are **untouched** — if any migration entry in `migrations.json` proposes bumping `@angular/core` past `20.3.27`, remove that entry from `migrations.json` before running (Stage 2/3 of this plan will do that deliberately, with its own review gate).

- [ ] **Step 3: Install and run the migrations**

```bash
npm install --legacy-peer-deps
npx nx migrate --run-migrations
```
The `--legacy-peer-deps` flag matches the existing CI install command (`.github/workflows/ci.yml`) — this repo already installs this way, so keep it consistent.

- [ ] **Step 4: Align the two manual peer bumps Nx 23 requires that aren't part of the `@nx/*` migration**

`nx@23.1.1`'s own `peerDependencies` require `@swc/core@^1.15.8` and `@swc-node/register@^1.11.1` (verified via `npm view nx@latest peerDependencies`); the migration may not touch these devDependencies automatically since they're peers, not `@nx/*` packages. Edit `package.json` devDependencies:

```json
"@swc/core": "^1.15.8",
"@swc-node/register": "^1.11.1",
```

Then:
```bash
npm install --legacy-peer-deps
```

- [ ] **Step 5: Full verification**

```bash
npx nx run-many -t lint,build,test --all
```
Expected: same pass results as the Stage 0 baseline. `@angular/core` must still read `20.3.27`:
```bash
npm ls @angular/core --depth=0
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json nx.json
git commit -m "chore(deps): migrate Nx 22.7.8 -> 23.1.1 (Angular version unchanged)"
```

---

## Stage 2 — Angular 20.3.27 → 21.2.19

### Task 2: Migrate the Angular framework to 21, plus the companion packages that must move in lockstep

**Files:**
- Modify: `package.json` (root) — all `@angular/*`, `@angular-devkit/*`, `@schematics/angular`, `@angular/cli`, `@angular/build`, `@angular/cdk`, `@angular/material`, `ng-packagr`, `angular-eslint`, `jest`, `jest-environment-jsdom`, `jest-preset-angular`, `@types/jest`, and the `overrides["@angular/common"]` entry.
- Generated/modified: `migrations.json` (transient)
- Possibly modified: any `tsconfig*.json` / `jest.config.ts` files an Angular migration schematic decides to touch — review diff, don't hand-edit speculatively.

**Interfaces:** N/A (tooling-only stage, no library code changes expected).

- [ ] **Step 1: Generate the migration set for the Angular framework packages**

```bash
npx nx migrate @angular/core@21.2.19 @angular/cli@21.2.20 @angular/material@21.2.14 @angular/cdk@21.2.14
```
Nx documents that `nx migrate` reads and runs Angular's own `ng-update` migration schematics the same way `ng update` would (source: https://nx.dev/docs/technologies/angular/guides/nx-and-angular). Passing `@angular/cli`, `@angular/material`, and `@angular/cdk` explicitly ensures their bundled schematics run too, not just `@angular/core`'s.

- [ ] **Step 2: Review before installing**

```bash
git diff package.json
cat migrations.json
```
Confirm every `@angular/core`, `@angular/common`, `@angular/compiler`, `@angular/compiler-cli`, `@angular/forms`, `@angular/language-service`, `@angular/platform-browser`, `@angular/platform-browser-dynamic`, `@angular/platform-server`, `@angular/router` entry reads `21.2.19`, and `@angular/cli`/`@angular/build`/`@angular-devkit/build-angular`/`@angular-devkit/core`/`@angular-devkit/schematics`/`@schematics/angular`/`@angular/ssr` read `21.2.20`. `typescript` must **not** have moved past `5.9.x` in this diff — if a migration entry tries to bump it to 6.x, remove that entry (Stage 3 handles the TS bump deliberately).

- [ ] **Step 3: Update the root `overrides` pin to match**

Edit `package.json`:
```json
"overrides": {
  "@angular/common": "21.2.19"
}
```

- [ ] **Step 4: Manually bump the companion packages that don't ship Nx/Angular migration schematics**

These are plain npm peer bumps — verified via npm registry peer-dependency metadata, no codemods expected. Edit `package.json`:

```json
"ng-packagr": "^21.2.7",
"angular-eslint": "^21.4.0",
"jest": "^30.0.0",
"jest-environment-jsdom": "^30.0.0",
"jest-preset-angular": "~17.0.0",
"@types/jest": "^30.0.0"
```
`jest-preset-angular@17.0.0` peers `"@angular/core": ">=20.0.0 <23.0.0"` and `"jest": "^30.0.0"` — it covers both this stage (21) and Stage 3 (22), so this is the only Jest-toolchain bump needed in the whole plan (verified via `npm view jest-preset-angular@17.0.0 peerDependencies`).

- [ ] **Step 5: Install and run migrations**

```bash
npm install --legacy-peer-deps
npx nx migrate --run-migrations
```

- [ ] **Step 6: Check for Jest 30 breakage patterns before running the suite**

Jest 30's changelog lists breaking removals of `jest.genMockFromModule()`, a changed `--filter` CLI shape, and an `@sinonjs/fake-timers` v13 bump. Confirm none are used:
```bash
grep -rn "genMockFromModule" libs apps --include="*.ts"
```
Expected: no matches (already verified during planning — this is a re-check after the bump, not a new risk).

- [ ] **Step 7: Full verification**

```bash
npx nx run-many -t lint,build,test --all
```
Expected: same pass results as baseline. Confirm versions:
```bash
npm ls @angular/core typescript jest --depth=0
```
`@angular/core` → `21.2.19`, `typescript` → still `5.9.x`, `jest` → `30.x`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): migrate Angular 20.3.27 -> 21.2.19, jest-preset-angular to 17 (jest 30)"
```

---

## Stage 3 — Angular 21.2.19 → 22.1.1 + TypeScript 6.0.3

### Task 3: Migrate the Angular framework to 22, pin TypeScript to 6.0.x

**Files:**
- Modify: `package.json` (root) — all `@angular/*`, `@angular-devkit/*`, `@schematics/angular`, `@angular/cli`, `@angular/build`, `@angular/cdk`, `@angular/material`, `ng-packagr`, `angular-eslint`, `typescript`, and `overrides["@angular/common"]`.
- Generated/modified: `migrations.json` (transient)

**Interfaces:** N/A.

- [ ] **Step 1: Generate the migration set**

```bash
npx nx migrate @angular/core@22.1.1 @angular/cli@22.1.3 @angular/material@22.1.1 @angular/cdk@22.1.1
```

- [ ] **Step 2: Review before installing**

```bash
git diff package.json
cat migrations.json
```
Confirm every core Angular package reads `22.1.1` and the CLI/build/devkit family reads `22.1.3`. Look specifically for the migration Angular ships in v22 called *"Add migration to add `ChangeDetectionStrategy.Eager` where applicable"* (from the v22 CHANGELOG) — it's expected to run and should produce **no diffs** in this repo's source, since Task-preflight grep confirmed zero `@Component` declarations outside the two demo apps and none of them set `changeDetection`. If it *does* touch demo app components, read the diff — it means it decided existing behavior depended on eager/default CD and is protecting you from the new OnPush default; accept it.

- [ ] **Step 3: Pin TypeScript explicitly — do not let `npm install` pick `latest`**

Edit `package.json` devDependencies:
```json
"typescript": "~6.0.3",
```
This satisfies `@angular/compiler-cli@22.1.1`'s peer (`">=6.0 <6.1"`). The npm registry `latest` tag for `typescript` is `7.0.2` as of this plan's research date — installing `typescript@latest` here would silently break the Angular compiler.

- [ ] **Step 4: Update the root `overrides` pin**

```json
"overrides": {
  "@angular/common": "22.1.1"
}
```

- [ ] **Step 5: Bump the remaining companion packages**

```json
"ng-packagr": "^22.1.1",
"angular-eslint": "^22.1.0",
```
(`jest`/`jest-preset-angular` already cover Angular 22 from Stage 2 — no change needed here.)

- [ ] **Step 6: Confirm Node satisfies Angular 22's engine requirement before installing**

```bash
node -v
```
Must satisfy `^22.22.3 || ^24.15.0 || >=26.0.0` (verified via `@angular/core@22.1.1` `engines`). If CI's `actions/setup-node` pin (`node-version: 22`) resolves to something older than `22.22.3` at build time, that's addressed in Task 5 — for local install, current dev Node (`v24.19.0`) already satisfies this.

- [ ] **Step 7: Install and run migrations**

```bash
npm install --legacy-peer-deps
npx nx migrate --run-migrations
```

- [ ] **Step 8: Full verification**

```bash
npx nx run-many -t lint,build,test --all
```
Expected: same pass results as baseline.
```bash
npm ls @angular/core typescript --depth=0
```
`@angular/core` → `22.1.1`, `typescript` → `6.0.3`.

- [ ] **Step 9: Manual smoke check of both demo apps**

The OnPush-by-default change and the router's `paramsInheritanceStrategy` default flip (`emptyOnly` → `always`) are runtime-behavior changes that a build/lint/test pass can't fully catch — walk the actual UI once.

```bash
npx nx serve demo
```
Open the app, switch languages (the demo exists specifically to exercise `@ngx-runtime-i18n/angular`'s language switching), confirm translations still render and update live. Stop the server, then:
```bash
npx nx build demo-ssr
npx nx serve demo-ssr
```
Load it, confirm SSR output renders translated content without hydration errors in the browser console.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): migrate Angular 21.2.19 -> 22.1.1, pin typescript to ~6.0.3"
```

---

## Stage 4 — Publish-surface and CI cleanup

### Task 4: Widen the publishable libraries' peer ranges to admit Angular 22

**Files:**
- Modify: `libs/runtime-i18n-angular/package.json:14-18` (peerDependencies block)
- Modify: `libs/runtime-i18n-material/package.json:8-11` (peerDependencies block)
- Modify: `libs/runtime-i18n-primeng/package.json:8-12` (peerDependencies block — touch only the `@angular/core` line, leave `primeng` untouched)

**Interfaces:** These are the packages published to npm as `@ngx-runtime-i18n/angular`, `@ngx-runtime-i18n/material`, `@ngx-runtime-i18n/primeng`. Widening a peer range's upper bound is not a breaking change for existing consumers (it only accepts more, not fewer, host versions), so this can ship as a patch release later — no major bump required for this change alone.

- [ ] **Step 1: Widen `runtime-i18n-angular`'s peer range**

In `libs/runtime-i18n-angular/package.json`, change:
```json
"peerDependencies": {
  "@angular/common": ">=16 <22",
  "@angular/core": ">=16 <22",
  "@angular/platform-browser": ">=16 <22"
}
```
to:
```json
"peerDependencies": {
  "@angular/common": ">=16 <23",
  "@angular/core": ">=16 <23",
  "@angular/platform-browser": ">=16 <23"
}
```

- [ ] **Step 2: Widen `runtime-i18n-material`'s peer range**

In `libs/runtime-i18n-material/package.json`, change:
```json
"peerDependencies": {
  "@angular/core": ">=16 <22",
  "@angular/material": ">=16 <22",
  "@ngx-runtime-i18n/angular": "^2.0.0"
}
```
to:
```json
"peerDependencies": {
  "@angular/core": ">=16 <23",
  "@angular/material": ">=16 <23",
  "@ngx-runtime-i18n/angular": "^2.0.0"
}
```

- [ ] **Step 3: Widen only the `@angular/core` line in `runtime-i18n-primeng`'s peer range**

In `libs/runtime-i18n-primeng/package.json`, change:
```json
"peerDependencies": {
  "@angular/core": ">=16 <22",
  "@ngx-runtime-i18n/angular": "^2.0.1",
  "primeng": ">=17 <20.4.0"
}
```
to:
```json
"peerDependencies": {
  "@angular/core": ">=16 <23",
  "@ngx-runtime-i18n/angular": "^2.0.1",
  "primeng": ">=17 <20.4.0"
}
```
Leave the `primeng` line exactly as-is — that range is a pre-existing, separate gap (PrimeNG's own `latest` is already major 22 and out of scope for this plan).

- [ ] **Step 4: Rebuild and dry-run pack all three libs to confirm the published `package.json` looks right**

```bash
npx nx run-many -t build -p=runtime-i18n-angular,runtime-i18n-material,runtime-i18n-primeng --configuration=production
cat dist/libs/runtime-i18n-angular/package.json | grep -A5 peerDependencies
cat dist/libs/runtime-i18n-material/package.json | grep -A5 peerDependencies
cat dist/libs/runtime-i18n-primeng/package.json | grep -A5 peerDependencies
```
Expected: each shows the widened `<23` ranges.

- [ ] **Step 5: Commit**

```bash
git add libs/runtime-i18n-angular/package.json libs/runtime-i18n-material/package.json libs/runtime-i18n-primeng/package.json
git commit -m "feat(peer-deps): widen Angular peer ranges to admit Angular 22 (<23)"
```

### Task 5: CI Node pin and CHANGELOG

**Files:**
- Modify: `.github/workflows/ci.yml:26-30` (setup-node step)
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Verify GitHub Actions' `node-version: 22` resolves above Angular 22's floor**

Angular 22 requires `^22.22.3` on the Node 22 line. `actions/setup-node@v7` with `node-version: 22` installs the latest available 22.x at build time, which by this plan's execution date (Aug 2026, Node 22 LTS window) is already well above `22.22.3`. No change is strictly required, but pin the minor floor explicitly for reproducibility and to fail loudly instead of silently if a future runner image regresses:

In `.github/workflows/ci.yml`, change:
```yaml
- name: Use Node.js 22.x with npm cache
  uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
  with:
    node-version: 22
    cache: npm
```
to:
```yaml
- name: Use Node.js 22.x with npm cache
  uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
  with:
    node-version: '>=22.22.3'
    cache: npm
```

- [ ] **Step 2: Add a CHANGELOG entry**

Prepend to `CHANGELOG.md` (match the existing file's format/tone):
```markdown
## Unreleased

### Changed
- Upgraded Angular from 20.3.27 to 22.1.1 (via 21.2.19), Nx from 22.7.8 to 23.1.1, TypeScript from 5.9.2 to 6.0.3, and Jest from 29 to 30 (jest-preset-angular 14 -> 17).
- Widened `@ngx-runtime-i18n/angular`, `@ngx-runtime-i18n/material`, and `@ngx-runtime-i18n/primeng` peerDependency ranges to admit Angular 22 (`<23`).
```

- [ ] **Step 3: Final full verification (repeat of Stage 0's check, now at target versions)**

```bash
npx nx run-many -t lint,build,test --all
npm ls @angular/core nx typescript jest --depth=0
```
Expected: `@angular/core@22.1.1`, `nx@23.1.1`, `typescript@6.0.3`, `jest@30.x`, all targets green.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml CHANGELOG.md
git commit -m "chore(ci): pin Node floor for Angular 22, changelog for Angular 22/Nx 23 upgrade"
```

---

## Rollback note

Every stage is its own commit. If a stage's verification step fails and the cause isn't quickly fixable, `git reset --hard` to the previous stage's commit (after confirming `git status` is otherwise clean) rather than debugging forward across two unresolved major bumps at once — that's the entire reason this plan is staged.
