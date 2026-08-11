# Security Policy

## Supported Versions

Only the latest published version of each package is supported with security fixes:

| Package                        | Supported |
| ------------------------------- | --------- |
| `@ngx-runtime-i18n/core`        | latest    |
| `@ngx-runtime-i18n/angular`     | latest    |
| `@ngx-runtime-i18n/material`    | latest    |
| `@ngx-runtime-i18n/primeng`     | latest    |
| `@ngx-runtime-i18n/schematics`  | latest    |
| `@ngx-runtime-i18n/cli`         | latest    |

## Reporting a Vulnerability

Please report security vulnerabilities privately via
[GitHub Security Advisories](https://github.com/AshwinSathian/ngx-runtime-i18n/security/advisories/new)
rather than filing a public issue.

Include:

- A description of the vulnerability and its potential impact
- Steps to reproduce (a minimal repro is very helpful)
- The affected package(s) and version(s)

You should receive an initial response within a few days. Once a fix is confirmed,
a patch release will be published and the advisory disclosed publicly with credit
(unless you'd prefer to remain anonymous).

## Scope

This policy covers the packages published from this repository. Vulnerabilities in
upstream dependencies (Angular, Angular Material, PrimeNG, etc.) should be reported
to those projects directly; dependency updates that pull in their fixes are handled
via [Dependabot](../../security/dependabot).
