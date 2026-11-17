# Dependency compatibility review

Stable npm releases and official GitHub action tags checked on 2026-11-17. Versions
below are resolutions, rather than the older lower bounds in `package.json`.

## Direct dependencies and package manager

| Package | Before | Selected | Latest stable |
| --- | --- | --- | --- |
| `@iconify-json/lucide` | 1.2.133 | 1.2.156 | 1.2.156 |
| `@iconify-json/simple-icons` | 1.2.96 | 1.2.103 | 1.2.103 |
| `@nuxt/ui` | 4.11.1 | 4.12.2 | 4.12.2 |
| `marked` | 17.0.6 | 18.2.1 | 18.2.1 |
| `nuxt` | 4.5.2 | 4.6.4 | 4.6.4 |
| `tailwindcss` | 4.3.3 | 4.3.5 | 4.3.5 |
| `@nuxt/eslint` | 1.17.0 | 1.17.0 | 1.17.0 |
| `@nuxt/test-utils` | 4.3.2 | 4.4.0 | 4.4.0 |
| `@vite-pwa/nuxt` | 1.1.1 | 2.0.1 | 2.0.1 |
| `@vue/test-utils` | 2.5.1 | 2.6.0 | 2.6.0 |
| `eslint` | 10.10.0 | 10.15.0 | 10.15.0 |
| `happy-dom` | 21.0.4 | 21.0.4 | 21.0.4 |
| `typescript` | 6.0.3 | 6.0.3 | 7.0.2 |
| `vitest` | 4.1.11 | 5.1.0 | 5.1.0 |
| `vue-tsc` | 3.3.11 | 3.3.14 | 3.3.14 |
| `pnpm` | 12.0.0 | 12.21.0 | 12.21.0 |

[Nuxt 4.6.4's engine requirement](https://github.com/nuxt/nuxt/blob/v4.6.4/packages/nuxt/package.json)
is Node `^22.22.3 || ^24.15.0 || >=26.0.0`. CI stays on the latest Node 22 patch;
local validation uses Node 22.23.5. pnpm's exact version is
selected by `packageManager`. Both YAML documents in `pnpm-lock.yaml` must be
committed: the first locks pnpm and its platform packages, the second locks the app.

### TypeScript 7 restriction

Keep TypeScript on the newest 6.x release. In an isolated installation of
`typescript@7.0.2` and `vue-tsc@3.3.14`, running `vue-tsc --version` fails with
`ERR_PACKAGE_PATH_NOT_EXPORTED`: `typescript/lib/tsc` is not exported by TypeScript 7.
The [vue-tsc 3.3.14 implementation](https://github.com/vuejs/language-tools/blob/v3.3.14/packages/tsc/index.ts)
still loads that path and patches the JavaScript compiler through Volar;
[TypeScript 7](https://github.com/microsoft/TypeScript/releases/tag/v7.0.2) uses the
native compiler. Its broad `typescript >=5.0.0` peer range does not establish
runtime compatibility. Owner: @daloni; review by 2026-12-17. Remove the 6.x cap
when a stable Vue/Nuxt checker supports the native compiler and `pnpm typecheck`
passes with TypeScript 7, without bypassing checks of Vue files.

### Migration review

- [Marked 18](https://github.com/markedjs/marked/releases/tag/v18.0.0) trims trailing
  blank lines from block tokens and builds with TypeScript 6. Our renderer uses
  token-based methods and synchronous parsing, rather than relying on raw token
  whitespace. Keep URL allowlisting and raw HTML escaping enabled.
- [PWA 2.0.1](https://github.com/vite-pwa/nuxt/releases/tag/v2.0.1) moves to
  `unplugin-pwa` and the maintained Workbox fork. Preserve `autoUpdate`, the
  manifest's base/scope, precaching of HTML, payloads and fonts, and the absence
  of a home-page navigation fallback. The module name remains `@vite-pwa/nuxt`.
  Rename the deprecated `pwa.workbox` option to `pwa.generateSW` and the manifest
  component from `VitePwaManifest` to `NuxtPwaManifest` in both `app.vue` and
  `error.vue`; 2.x no longer registers the old name, and Vue only warns about an
  unresolved component, so an error page test now fails on that warning. The module adds Nuxt's
  payload and build JSON patterns automatically, so do not duplicate those in
  `globPatterns`. Workbox 8 emits backtick-delimited precache URLs; the artifact
  validator accepts them alongside quoted URLs, with a regression test.
  Browser checks also exposed two precache misses: Nuxt appends `_b` to payload
  URLs, and Pages uses trailing slashes while the module's precache keys omit
  them. Ignore only the `_b` parameter alongside Workbox's existing tracking
  parameters, and supply the slashless URL as a cache lookup alias. Workbox's
  revisions still refresh the static payloads on an update. Tests cover the
  alias at both bases and preserve unrelated query parameters.
  Enable icon client-bundle scanning so icons used inside `ClientOnly` are
  available on a cold offline visit instead of requesting Iconify's API.
- [Vitest 5](https://vitest.dev/guide/migration/) requires Node 22.12+ and Vite
  6.4+; Nuxt's selected Node and Vite satisfy both. `@nuxt/test-utils` 4.4.0
  declares support for Vitest 5. The sentence page's 404 test now checks Nuxt's
  error state, including the status and message: `mountSuspended` handles the
  page error instead of rejecting. The reading test already uses that pattern.
  The existing mock lifecycle works with Vitest's new history-clearing default.
- [Nuxt 4.6.4](https://github.com/nuxt/nuxt/releases/tag/v4.6.4) includes security
  fixes and requires Nitro 2.13.6. The app uses static prerendering, with no
  application server routes, sessions or runtime cache rules.

## CI actions

All six pins are verified against their official stable release tags. Full commit
SHAs live in `.github/workflows/ci.yml`; repeated references use the same SHA.
For annotated tags, use the dereferenced commit (`refs/tags/<tag>^{}`), not the tag
object. This matters for `pnpm/action-setup` v6.1.1.

| Action | Before | Selected official release |
| --- | --- | --- |
| `actions/checkout` | 7.0.1 | [7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1) |
| `pnpm/action-setup` | 6.0.10 | [6.1.1](https://github.com/pnpm/action-setup/releases/tag/v6.1.1) |
| `actions/setup-node` | 7.0.0 | [7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0) |
| `actions/configure-pages` | 6.0.0 | [6.0.0](https://github.com/actions/configure-pages/releases/tag/v6.0.0) |
| `actions/upload-pages-artifact` | 5.0.0 | [5.0.0](https://github.com/actions/upload-pages-artifact/releases/tag/v5.0.0) |
| `actions/deploy-pages` | 5.0.0 | [5.0.1](https://github.com/actions/deploy-pages/releases/tag/v5.0.1) |

## Security policy

The refreshed lockfile was audited with `auditConfig` removed. The final unfiltered
audit reports one high and two moderate advisories. The high advisory has no
published fix and is excepted individually below; `pnpm audit --audit-level high`
reports the two moderate findings and exits successfully with that reviewed policy.
Any other high or critical advisory still fails CI.

| Former override | Decision and evidence |
| --- | --- |
| `nanoid@3` | Remove. Current PostCSS accepts `^3.3.20`, resolving to the patched 3.x release. |
| `esbuild@^0.27.0` | Retain `^0.28.2`. UI 4.12.2 requires `@nuxt/fonts ^0.14.0`, which requires `fontless ^0.2.1` and `esbuild ^0.27.0`. The Windows dev-server file-read fix starts at 0.28.1, outside that range. 0.28.2 deduplicates the version already used by Vite and Nitro. Owner: @daloni; review by 2026-12-17; remove when the font dependency chain accepts patched esbuild. |
| `source-map-js` | Remove. Current PostCSS and Vue resolve patched 1.2.2 within their ranges. |
| `shell-quote` | Remove. `launch-editor ^2.14.2` accepts patched 1.12.0 within `^1.10.0`. |
| `@modelcontextprotocol/client` | Remove. The updated config inspector's parent chain accepts 2.4.0 without an override. |

The old `braces` exception [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
is withdrawn. The four remaining exceptions were also removed individually:
[GHSA-x6jw-m9v5-85vh](https://github.com/advisories/GHSA-x6jw-m9v5-85vh),
[GHSA-g4wm-2vf7-vfgr](https://github.com/advisories/GHSA-g4wm-2vf7-vfgr),
[GHSA-858h-whjf-mvg5](https://github.com/advisories/GHSA-858h-whjf-mvg5) and
[GHSA-v5rq-49vh-5v5c](https://github.com/advisories/GHSA-v5rq-49vh-5v5c).
`@nuxt/devtools` / `@nuxt/devtools-wizard` 3.4.4 removed `simple-git` and its parser;
neither appears in the final dependency tree. No incompatible simple-git override
is needed. Nuxt still constrains DevTools to `^3.4.4`, so its newer 4.x line is
outside the supported parent range.

### One unresolved advisory exception

[GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) affects
picomatch <=4.0.7, including the resolved 2.3.2 and 4.0.7 copies. Repeated extglob
patterns can cause exponential regex backtracking. The GitHub advisory and npm
metadata were rechecked on 2026-11-17: 4.0.7 is still the latest stable release and
there is no patched version. It reaches the tree through Nuxt/Nitro, file watchers,
icon discovery, ESLint and test/build tooling. These consume repository-owned glob
patterns; the learning forms do not accept globs or pass answers into this tooling,
and publication serves only the static artifact.

Owner: @daloni; review by **2026-11-24**. Remove this single GHSA exception as soon
as patched picomatch versions are available through every affected parent range
and the unfiltered audit no longer reports it. Do not replace it with a package or
severity-wide exclusion. Deploying a Node server that accepts untrusted glob
patterns would invalidate this exposure assessment.

Two findings remain visible, with no audit suppression:

| Advisory | Upstream restriction and exposure | Owner / review / removal condition |
| --- | --- | --- |
| [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) | `@vue/test-utils` 2.6.0 uses `js-beautify` 2.0.3, which requires `glob ^13.0.6`. The AbortSignal traversal fix requires glob >=14.0.2. Used to format test output; absent from the static site. | @daloni / 2026-12-17 / update when js-beautify accepts glob 14 or a 13.x fix ships. |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | `glob` 13, `editorconfig` 3.0.2 and Nitro's `archiver` → `readdir-glob` 3 require minimatch 10. The globparts amplification fix requires >=11.0.1. Build/test patterns come from the repository, not learner input; absent from the static site. | @daloni / 2026-12-17 / update those parents when they accept minimatch 11 or a 10.x fix ships. |

pnpm's `minimumReleaseAgeExclude` entries name only exact releases reviewed during
this update, including today's icons and the parser needed to satisfy the ESLint
plugin's peer range. These are release-age exceptions, not advisory exceptions;
the normal age policy remains in force for all other releases. Owner: @daloni;
review by 2026-11-24 and remove after the releases meet the default age policy.

## Local validation

Validated with Node 22.23.5 and pnpm 12.21.0, using `.env.example` for the required
public configuration. The baseline passed all 4,178 existing tests, lint,
typecheck, build, generation and PWA validation before the update.

The updated tree passes:

- A clean `pnpm install --frozen-lockfile` with `node_modules` moved aside. The
  SHA-256 of the committed lockfile stayed identical, including both YAML documents.
- `pnpm lint`, `pnpm typecheck`, `pnpm test --maxWorkers=2` (22 files, 4,183 tests)
  and `pnpm build`, run sequentially.
- `pnpm generate` and `pnpm check-pwa` at `/`, then both commands again with
  `NUXT_APP_BASE_URL=/english-course/` and
  `NUXT_PUBLIC_SITE_URL=http://localhost:3000/english-course/` for generation.
  Each artifact precaches 195 entries and emits a 42-URL sitemap.
- `pnpm peers check` (no issues), `pnpm outdated` (only the documented TypeScript
  restriction), the unfiltered advisory review and the final high-threshold audit.
- A comparison of the HTML for all 19 theory/reading Markdown documents: identical
  to the baseline, alongside the existing renderer security tests.

Chromium served each generated artifact from its matching base at a mobile
viewport. The root check reused the browser profile and progress created before
the dependency update, including a service-worker update. Both bases passed:

- Skip-link navigation into the main content, a full sentence round corrected
  with Enter (9/10 including an intentional miss), and focus on the round result.
- A reading scored 5/5, progress surviving reload, actual JSON download/import,
  idempotent import and merging a new valid verb attempt.
- Offline navigation **and reload** of 14 routes: home, theory index/detail,
  verbs and verb practice, sentences and sentence practice, reading index/detail,
  progress, review, clips and clip practice, and speaking. Offline sentence correction also
  passed. No local resource failed and no JavaScript or hydration error occurred.
- A missing route served through `404.html` with a 404 status renders the Spanish
  error page with the base-relative manifest link and no unresolved components.

Clips and speaking retain their documented network limits. Live YouTube playback,
Web Speech recognition and the operating system's native installation UI were not
exercised in headless Chromium.
No remote CI or deployment was queried or used for validation. Rootless Podman
was unavailable (`newuidmap: open of uid_map failed: Permission denied`); browser
checks ran natively with the available cached shared libraries instead.
