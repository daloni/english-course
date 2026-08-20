# Learn English

Personal web platform for learning English, built around the tenses: theory, verb
conjugation, sentences, reading with questions, speaking and clips of real video.

No backend and no database: a single Nuxt 4 app with [@nuxt/ui](https://ui.nuxt.com), the
content versioned as files in the repo, the progress in `localStorage` and the speaking on the
browser's Web Speech API. The site is public: there are no accounts and no login screen.

The interface and the content are in Spanish, because that is who the course is for. Everything
else — code, comments and this documentation — is in English.

## Requirements

- Node 22+
- pnpm

## Getting started

```bash
cp .env.example .env   # the configuration; without it the build stops
pnpm install
pnpm dev               # http://localhost:3000
```

## Configuration

Everything configurable lives in the `.env`, never written in the code: `nuxt.config.ts`
declares the keys empty and Nuxt fills them from the matching `NUXT_PUBLIC_*` variables.
`.env.example` carries the development values and starts the project as is.

| Variable | What it is | Development value |
| --- | --- | --- |
| `NUXT_PUBLIC_SITE_URL` | The public URL of the site, for the `<link rel="canonical">` and the `og:url` | `http://localhost:3000` |
| `NUXT_PUBLIC_SITE_NAME` | The name of the site, in the `<title>` of every page and in the share cards | `Aprender inglés` |
| `NUXT_PUBLIC_SITE_DESCRIPTION` | The description of the home and its social card | the one of the course |

If any of them is missing the build stops naming it instead of publishing a site with no
canonical. What comes from the environment wins over the file, which is how the workflow passes
the `NUXT_PUBLIC_SITE_URL` of GitHub Pages.

## Commands

| Command          | What it does                                    |
| ---------------- | ----------------------------------------------- |
| `pnpm dev`       | Development server on `http://localhost:3000`   |
| `pnpm build`     | Builds the app for production                   |
| `pnpm generate`  | Generates the static site in `.output/public`   |
| `pnpm preview`   | Serves the production build                     |
| `pnpm test`      | Tests with Vitest                               |
| `pnpm lint`      | ESLint                                          |
| `pnpm typecheck` | Type checking                                   |

## Publishing

The site is static: `pnpm generate` follows the links from the home and writes every page into
`.output/public`. If one of them blows up the command fails instead of publishing half a site.

```bash
pnpm generate
npx serve .output/public   # check it locally before publishing
```

`.github/workflows/ci.yml` runs on every push and every pull request: lint, typecheck, tests and
`pnpm generate`. If the push is to `main` **and the repository has GitHub Pages enabled**, it
also publishes the result. The workflow cannot enable the site on its own, so that has to be
done once by hand:

1. The repository has to be **public** (Pages on private repositories requires a paid plan).
2. **Settings → Pages → Source: GitHub Actions**.

Until that is done the CI validates but does not publish: the Pages steps and the `deploy` job
are skipped and the push stays green. As soon as it is enabled the workflow starts publishing on
its own, with nothing else to change.

Since on GitHub Pages the site hangs off `https://<user>.github.io/<repo>/`, the workflow passes
that subpath to Nuxt with `NUXT_APP_BASE_URL` and the full public URL with `NUXT_PUBLIC_SITE_URL`,
which is the one the `<link rel="canonical">` and the `og:url` of every page carry; locally
nothing is needed. To serve it from somewhere else (Netlify, an `nginx`…) it is enough to upload
`.output/public` as it is, passing `NUXT_PUBLIC_SITE_URL` with the new domain.

## Installable app

The site is a PWA: it can be installed on a phone or a desktop from the browser itself — Chrome
offers "Install" when the page is served over HTTPS, or from `localhost` to try it — and once
installed it starts instantly and **works with no connection**.

Offline, the theory, the verbs, the sentences, the reading, `/progreso` and `/repaso` keep
working: the content of `content/` is compiled into the bundle, so there is nothing to fetch.
What does **not** work are the clips, which need the YouTube iframe, and the speaking, which
needs the Web Speech API; both say so instead of breaking.

The service worker precaches every prerendered page with its own HTML, so any URL opens offline,
not only the home. Since on GitHub Pages the site hangs off `/<repo>/`, the `scope` and the
`start_url` of the manifest come from the same `NUXT_APP_BASE_URL` the build uses: left at `/`,
the service worker would not control the site and the install would never be offered — and on
`localhost` it would not show. `test/pwa.spec.ts` guards that, and that the icons the manifest
declares are really there.

Installed, the app also asks for persistent storage (`app/plugins/persist.client.ts`): the
progress lives only in this browser, and without that request a browser running out of disk can
discard it.

## Accessibility

Everything can be done with the keyboard: the first tab is "Saltar al contenido", the exercises
are answered and corrected without a mouse (Enter submits the form, which corrects first and
moves on afterwards) and the focus is always visible. The fields and the audio buttons carry
their label, the correction is announced in an `aria-live` region, and the English texts are
marked with `lang="en"` so the screen reader does not read them in Spanish.

## Speaking

`/speaking` uses the browser's Web Speech API: it reads the sentence out with `SpeechSynthesis`
(en-US or en-GB accent and three speeds). It corrects the repetition
with `SpeechRecognition`: although the course does not receive or store the voice, the browser or
its provider may process it remotely, outside the device. The exact behaviour depends on the
browser; recognition today only exists in Chrome and Edge and asks for microphone permission. On
Firefox or Safari the page says so and still lets you listen to the sentences.

## Clips

`/clips` practises with real English: a few seconds of a YouTube video, what is said in them and
a gap on top. `/clips/practica` draws a round of 10, never two from the same clip.

**No video is hosted here.** Of every clip what is stored is the `videoId`, the window (`startMs`
to `endMs`) and the transcribed sentence; the official YouTube iframe plays it against the user's
browser. It is the way of YouGlish or Playphrase, and the corollary is firm: any idea that means
downloading, cutting or serving video is out.

The gap is an ordinary `gap` exercise, so the same `isCorrect()` as the rest of the site corrects
it, and `test/clips.spec.ts` checks the invariant everything rests on: the `prompt` with the
solution in it **is** the sentence of the clip.

A video can be deleted, made private or lose its embedding permission. When the player finds out,
the `videoId` is recorded in `ingles:clips-unavailable` and its clips stop coming up in the rounds
— in `/repaso` too — so a dead embed cannot stall the session. That list is not progress and does
not travel in the export: it is a fact about the video.

## Markdown of the content

The theory of `content/tenses/` and the text of `content/readings/` are Markdown, rendered as
HTML in `/teoria/<slug>` and `/reading/<slug>`. Both pages go through the same renderer,
`app/utils/markdown.ts`, which only lets a link keep its `href` when the destination is
`https://`, `http://`, `mailto:` or somewhere inside the site (`/teoria/...`, `#anchor`,
`?query`). Any other scheme — `javascript:`, `data:`, `vbscript:` — loses the anchor and stays
as plain text, and the same applies to the source of an image. The check ignores case and the
control characters and spaces a URL can hide a scheme behind.

Raw HTML in the content is rejected apart, by `test/content.spec.ts` and `test/reading.spec.ts`:
what the content writes is Markdown. `test/markdown.spec.ts` covers both the allowlist and the
two pages with malicious payloads.

## Progress and spaced repetition

Every answer in `/frases`, `/verbos/practica`, `/reading` and `/clips/practica` is recorded in
`localStorage` (a single key, `ingles:progress`) with its hits, its misses and a Leitner box of
three:

| Box | When it comes back |
| --- | ------------------ |
| 1   | the same day       |
| 2   | in 2 days          |
| 3   | in 7 days          |

A hit moves up at most one box a day and pushes the review further away; a miss sends the
exercise back to box 1, so it stays in today's queue even if the page is reloaded. `/progreso`
sums up what has been practised by tense and by section, lists what is missed most and lets you
export the progress to JSON, import it or reset it. The **Repasar hoy** button opens `/repaso`, a
session with what is due today and only that, mixing sentences, verbs and reading questions.

The rounds are drawn from that progress: `/frases/<tense>` and `/verbos/practica` take 10
exercises (all of them, if the tense has fewer), first what has never been practised or is due
today and then, only to fill up, what is already learned. **Otra ronda** draws again, so two
rounds in a row are not the same list and what was missed today comes back in the next one. Since
they depend on the progress and on chance, they are built in the browser: the prerendered HTML
does not carry them.

The queue of `/repaso` is frozen when the session starts, so it does not shrink as you answer;
when it ends, **Otra ronda** snapshots it again and starts another one with what was missed,
without reloading the page. If nothing is left pending, the button does not show.

In `/reading` the correction records one attempt per question the first time the reading is
corrected in that visit: trying it again does not count twice. A blank question counts as a miss
of the round, but is not stored as an attempt.

If the browser does not let the site write to `localStorage` (storage full, Safari private mode),
the session keeps working all the same: answers and imports remain in memory and later writes
retry them together with newer progress from other tabs. `/progreso` warns that this volatile
progress will be lost on reload and links to the JSON export. If storage is blocked entirely and
cannot even be read, the progress starts empty on every visit, but the site does not go blank.

On import, the file is merged with the progress of this browser by id: the most recently
practised attempt is kept and, if the dates tie, the one with more answers. Importing the same
file twice does not add the counters up. Attempts the site itself could not have exported are
dropped: with no id, with hits or misses that are not whole positive numbers, with a date that
does not exist, or with a review earlier than the day it was practised. Attempts dated after
tomorrow are dropped too, so as not to import a device clock running ahead; tomorrow is allowed
because of timezone differences between devices. If the file has no valid attempt at all, the
import is rejected whole.

The course can be open in several tabs at once without losing anything: before saving, each
answer is rebased on what is stored at that moment, so a tab never overwrites what another one
recorded, and the `storage` event of the browser brings the change into the tabs that are already
open, updating their stats and their review queue. Importing merges the same way, and resetting
empties the key: the other tabs are left empty too, and an outdated one does not bring back what
was wiped.

The speaking does not count towards the progress: its correction is a percentage of words, not a
hit or a miss.

## Generating content with Claude Code and Codex

The content lives in `content/` as versioned JSON and is written with
[Claude Code](https://claude.com/claude-code) commands defined in `.claude/commands/`. Codex uses
the [repository skills](https://learn.chatgpt.com/docs/build-skills) in `.agents/skills/`, which
load those same commands as their canonical workflow instead of copying the instructions. Every
flow carries the exact schema of the file it touches, merges instead of overwriting, and ends by
running the test that validates that content (`pnpm test test/content.spec.ts`, or
`test/reading.spec.ts` for reading content).

Run either agent from the repository root. In Claude Code, invoke a flow with `/`; in Codex, use
`/skills` to list the five repository skills and invoke one with `$`. The agent instructions are
in English, while translations, explanations and theory shown to the learner remain in Spanish.

| Claude Code | Codex | What it does |
| --- | --- | --- |
| `/sentences <tense> <level> <n>` | `$sentences <tense> <level> <n>` | Adds `<n>` sentences (gap, transform or pick the tense) to `content/exercises/<tense>.json` |
| `/verb <infinitive>` | `$verb <infinitive>` | Adds or completes the verb in `content/verbs.json` |
| `/reading <topic> <level>` | `$reading <topic> <level>` | Writes a text with questions in `content/readings/<slug>.json` |
| `/theory <tense>` | `$theory <tense>` | Writes or extends the theory of `content/tenses/<slug>.json` |
| `/clips [file \| --all]` | `$clips [file \| --all]` | Turns ingested sentences into clips with gaps in `content/clips/<source>.json` |

### Ingesting clips

`/clips` does not go out to the internet: it spreads gaps over sentences that are already in
`data/candidates/`, and that is what the ingest fills:

```bash
node scripts/ingest.mjs                 # every source in data/sources.json
node scripts/ingest.mjs easy-english    # one
node scripts/ingest.mjs easy-english --limit 3
```

It needs [yt-dlp](https://github.com/yt-dlp/yt-dlp) in the PATH and **a machine on a home
connection**: YouTube blocks the player and subtitle endpoints from datacenter IPs, so on a
server discovery works and extraction fails with *"Sign in to confirm you're not a bot"*. If you
see that error do not debug the script: you are on the wrong machine. Playback is not affected,
it is done by the browser of whoever is studying.

It downloads metadata and the subtitle track, never video. It drops whatever cannot be played
embedded — age-restricted, embedding disabled, no English subtitles — and cuts the track into
sentences: the ones lasting between 1.5 and 12 seconds and holding between 4 and 25 words. Half
an hour of video leaves a few dozen. `data/candidates/` is throwaway and is not versioned; what
is versioned is what `/clips` publishes in `content/clips/`.

```bash
/sentences present-simple A2 10 # content/exercises/present-simple.json, ids present-simple-0NN
/verb understand                # a new entry in content/verbs.json
/reading travel A2             # content/readings/travel.json
/theory past-continuous         # content/tenses/past-continuous.json
```

The commands never rewrite a whole file: they prepare the new JSON and pass it through
`scripts/merge-content.mjs`, which merges by `id` (or by `infinitive`). Running the same command
again completes the entries that already exist, but does not duplicate them.

```bash
node scripts/merge-content.mjs content/exercises/present-simple.json < patch.json
```

## Structure

```
.claude/commands/          Claude Code commands that generate the content
.github/workflows/ci.yml   lint, typecheck, tests, generate and deploy to GitHub Pages
.env.example               the configuration variables, with their development values
public/.nojekyll           so GitHub Pages serves the _nuxt/ directory
public/icon*.png|svg       icons of the installable app, generated from icon.svg
app/
  app.vue                 root: layout + page, canonical and og:url of every route
  error.vue               error page of its own, in Spanish and inside the layout
  layouts/default.vue     header with the navigation, and footer
  pages/index.vue         home with the cards of every section
  pages/teoria/           tenses listed by level, and the theory of each one
  pages/verbos/           table of verbs and conjugation drill
  pages/frases/           tense picker and a drawn round of 10 sentences
  pages/reading/          list of readings, and a reading with glossary and questions
  pages/speaking.vue      listen to the sentence, repeat it into the mic and compare
  pages/clips/            list of clips and a drawn round with the video first
  pages/progreso.vue      summary of what was practised, misses, and export / import
  pages/repaso.vue        review session with what is due today
  plugins/persist.client.ts  asks the browser for persistent storage
  components/Exercise*.vue  one component per exercise type of content/exercises/
  components/ClipPlayer.vue  YouTube iframe bounded to the clip window, looping
  composables/useSpeech.ts  Web Speech API: speech synthesis and recognition
  composables/useProgress.ts  the progress of the browser: record, sum up and export
  composables/useSeo.ts   title, description and social card of every page
  composables/useClips.ts   the videos that can no longer be played
  composables/useYouTubePlayer.ts  single load of the IFrame Player API
  utils/check.ts          correction of the written answers, and third person
  utils/diff.ts           word-by-word comparison of what was said
  utils/progress.ts       Leitner boxes, localStorage persistence and reviewable items
  utils/content.ts        types of the content and loading of content/*.json
  utils/markdown.ts       renders the Markdown of the content, with a link allowlist
  utils/explain.ts        component and explanation of every exercise type
  utils/sections.ts       sections of the site (navigation and cards)
  utils/unavailable.ts    list of dead videos, stored apart from the progress
content/
  tenses/<slug>.json      theory, structure and examples of every tense
  exercises/<slug>.json   sentence exercises: gap, transform and pick the tense
  readings/<slug>.json    reading with glossary and comprehension questions
  clips/<source>.json     video clips with their sentence and their gaps
  verbs.json              list of verbs with past, participle and translation
data/
  sources.json            catalogue of YouTube channels for the ingest
scripts/
  merge-content.mjs       merges JSON into content/ without duplicating entries
  ingest.mjs              pulls timed sentences out of the subtitles of a channel
  subtitles.mjs           parsing of json3 tracks and cutting into sentences
test/
  content.spec.ts         validates the tenses, verbs and exercises of content/
  merge-content.spec.ts   validates the merge without duplicates
  teoria.spec.ts          every file of content/tenses/ has its route in /teoria
  check.spec.ts           normalization and correction of the answers
  verbos.spec.ts          table of verbs and a full conjugation round
  frases.spec.ts          every file of content/exercises/ and its exercise type
  reading.spec.ts         validates content/readings/ and corrects the questions in /reading
  markdown.spec.ts        the link allowlist of the Markdown renderer, and the two pages
  clips.spec.ts           validates content/clips/ and plays a round in /clips/practica
  subtitles.spec.ts       subtitle parsing and cutting into usable sentences
  pwa.spec.ts             the manifest declares icons that exist, and the scope of the base
  diff.spec.ts            word-by-word comparison: hit, omission and extra
  speaking.spec.ts        /speaking says so when the browser cannot recognise speech
  progress.spec.ts        Leitner boxes, serialized persistence and review session
  a11y-seo.spec.ts        SEO of each page and a keyboard walkthrough
  error.spec.ts           the error page explains the 404 and lets you go back
  smoke.spec.ts           smoke test: mounts the home
```
