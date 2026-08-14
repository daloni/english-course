# Aprender inglés

Plataforma web personal para aprender inglés centrada en los tiempos verbales:
teoría, conjugación de verbos, frases, reading con preguntas y speaking.

Sin backend, sin base de datos y sin login: una sola app Nuxt 4 con
[@nuxt/ui](https://ui.nuxt.com), el contenido versionado como ficheros en el
repo, el progreso en `localStorage` y el speaking con la Web Speech API del
navegador.

## Requisitos

- Node 22+
- pnpm

## Puesta en marcha

```bash
pnpm install
pnpm dev      # http://localhost:3000
```

## Comandos

| Comando          | Qué hace                                        |
| ---------------- | ----------------------------------------------- |
| `pnpm dev`       | Servidor de desarrollo en `http://localhost:3000` |
| `pnpm build`     | Compila la app para producción                  |
| `pnpm generate`  | Genera el sitio estático en `.output/public`    |
| `pnpm preview`   | Sirve la build de producción                    |
| `pnpm test`      | Tests con Vitest                                |
| `pnpm lint`      | ESLint                                          |
| `pnpm typecheck` | Comprobación de tipos                           |

## Generar contenido con Claude Code

El contenido vive en `content/` como JSON versionado y se escribe con comandos de
[Claude Code](https://claude.com/claude-code) definidos en `.claude/commands/`. Cada comando
lleva el esquema exacto del fichero que toca, fusiona en vez de sobrescribir y termina
ejecutando el test que valida ese contenido (`pnpm test test/content.spec.ts`, o
`test/reading.spec.ts` en el caso de `/reading`).

| Comando                    | Qué hace                                                              |
| -------------------------- | --------------------------------------------------------------------- |
| `/frases <tiempo> <nivel> <n>` | Añade `<n>` frases (hueco, transformar o elegir el tiempo) a `content/exercises/<tiempo>.json` |
| `/verbo <infinitivo>`      | Añade o completa el verbo en `content/verbs.json`                      |
| `/reading <tema> <nivel>`  | Escribe un texto con preguntas en `content/readings/<slug>.json`       |
| `/teoria <tiempo>`         | Redacta o amplía la teoría de `content/tenses/<slug>.json`             |

```bash
/frases present-simple A2 10   # content/exercises/present-simple.json, ids present-simple-0NN
/verbo understand              # entrada nueva en content/verbs.json
/reading travel A2             # content/readings/travel.json
/teoria past-continuous        # content/tenses/past-continuous.json
```

Los comandos nunca reescriben un fichero entero: preparan el JSON nuevo y lo pasan por
`scripts/merge-content.mjs`, que fusiona por `id` (o por `infinitive`). Volver a lanzar el
mismo comando completa las entradas que ya existen, pero no las duplica.

```bash
node scripts/merge-content.mjs content/exercises/present-simple.json < patch.json
```

## Estructura

```
.claude/commands/          comandos de Claude Code que generan el contenido
app/
  app.vue                 raíz: layout + página
  layouts/default.vue     cabecera con la navegación y pie
  pages/index.vue         home con las tarjetas de cada sección
  pages/teoria/           listado de tiempos por nivel y teoría de cada uno
  pages/verbos/           tabla de verbos y ejercicio de conjugación
  pages/frases/           elección de tiempo y ronda de ejercicios en frases
  pages/reading/          listado de lecturas y lectura con glosario y preguntas
  components/Exercise*.vue  un componente por tipo de ejercicio de content/exercises/
  utils/check.ts          corrección de las respuestas escritas y tercera persona
  utils/content.ts        tipos del contenido y carga de content/*.json
  utils/sections.ts       secciones del sitio (navegación y tarjetas)
content/
  tenses/<slug>.json      teoría, estructura y ejemplos de cada tiempo verbal
  exercises/<slug>.json   ejercicios en frases: hueco, transformar y elegir el tiempo
  readings/<slug>.json    lectura con glosario y preguntas de comprensión
  verbs.json              lista de verbos con pasado, participio y traducción
scripts/
  merge-content.mjs       fusiona JSON en content/ sin duplicar entradas
test/
  content.spec.ts         valida los tiempos, verbos y ejercicios de content/
  merge-content.spec.ts   valida la fusión sin duplicados
  teoria.spec.ts          cada fichero de content/tenses/ tiene su ruta en /teoria
  check.spec.ts           normalización y corrección de las respuestas
  verbos.spec.ts          tabla de verbos y ronda completa de conjugación
  frases.spec.ts          cada fichero de content/exercises/ y su tipo de ejercicio
  reading.spec.ts         valida content/readings/ y corrige las preguntas en /reading
  smoke.spec.ts           test de humo: monta la home
```
