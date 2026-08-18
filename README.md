# Aprender inglés

Plataforma web personal para aprender inglés centrada en los tiempos verbales:
teoría, conjugación de verbos, frases, reading con preguntas, speaking y clips
de vídeo real.

Sin backend y sin base de datos: una sola app Nuxt 4 con
[@nuxt/ui](https://ui.nuxt.com), el contenido versionado como ficheros en el
repo, el progreso en `localStorage` y el speaking con la Web Speech API del
navegador. El sitio es público: no hay usuarios ni pantalla de acceso.

## Requisitos

- Node 22+
- pnpm

## Puesta en marcha

```bash
cp .env.example .env   # la configuración; sin ella el build se para
pnpm install
pnpm dev               # http://localhost:3000
```

## Configuración

Todo lo configurable vive en el `.env`, nunca escrito en el código: `nuxt.config.ts` declara
las claves vacías y Nuxt las rellena desde las variables `NUXT_PUBLIC_*`. `.env.example` trae
los valores de desarrollo y arranca el proyecto tal cual.

| Variable | Qué es | Valor de desarrollo |
| --- | --- | --- |
| `NUXT_PUBLIC_SITE_URL` | La URL pública del sitio, para el `<link rel="canonical">` y el `og:url` | `http://localhost:3000` |
| `NUXT_PUBLIC_SITE_NAME` | El nombre del sitio, en el `<title>` de cada página y en las tarjetas al compartir | `Aprender inglés` |
| `NUXT_PUBLIC_SITE_DESCRIPTION` | La descripción de la home y su tarjeta social | la del curso |

Si falta alguna, el build se para nombrándola en vez de publicar un sitio sin canonical. Lo
que venga por entorno gana sobre el fichero, que es como el workflow pasa la
`NUXT_PUBLIC_SITE_URL` de GitHub Pages.

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

## Publicación

El sitio es estático: `pnpm generate` recorre los enlaces desde la home y escribe todas las
páginas en `.output/public`. Si alguna revienta, el comando falla en vez de publicar el sitio
a medias.

```bash
pnpm generate
npx serve .output/public   # comprobarlo en local antes de publicar
```

`.github/workflows/ci.yml` corre en cada push y en cada pull request: lint, typecheck, tests y
`pnpm generate`. Si el push es a `main` **y el repositorio tiene GitHub Pages activado**, además
publica el resultado.
El workflow no puede dar de alta el sitio por su cuenta, así que hay que activarlo una vez a
mano:

1. El repositorio tiene que ser **público** (Pages en repositorios privados requiere un plan de
   pago).
2. **Settings → Pages → Source: GitHub Actions**.

Hasta que eso esté hecho la CI valida pero no publica: los pasos de Pages y el job `deploy` se
saltan y el push queda en verde. En cuanto se active, el workflow empieza a publicar solo, sin
tocar nada más.

Como en GitHub Pages el sitio cuelga de `https://<usuario>.github.io/<repo>/`, el workflow pasa
esa subruta a Nuxt con `NUXT_APP_BASE_URL` y la URL pública completa con `NUXT_PUBLIC_SITE_URL`,
que es la que llevan el `<link rel="canonical">` y el `og:url` de cada página; en local no hace
falta nada. Para servirlo desde otro sitio (Netlify, un `nginx`…) basta con subir
`.output/public` tal cual, pasando `NUXT_PUBLIC_SITE_URL` con el dominio nuevo.

## Accesibilidad

Todo se puede hacer con el teclado: la primera tabulación es «Saltar al contenido», los
ejercicios se responden y se corrigen sin ratón (Enter envía el formulario, que corrige
primero y pasa al siguiente después) y el foco siempre se ve. Los campos y los botones de
audio llevan su etiqueta, la corrección se anuncia en una región `aria-live` y los textos en
inglés van marcados con `lang="en"` para que el lector de pantalla no los lea en español.

## Speaking

`/speaking` usa la Web Speech API del navegador, sin servicios externos: escucha la frase
con `SpeechSynthesis` (acento en-US o en-GB y tres velocidades) y corrige la repetición con
`SpeechRecognition`, que hoy solo existe en Chrome y Edge y pide permiso para el micrófono.
En Firefox o Safari la página lo avisa y sigue permitiendo escuchar las frases.

## Clips

`/clips` practica con inglés real: unos segundos de un vídeo de YouTube, lo que se dice en
ellos y un hueco encima. `/clips/practica` saca una ronda de 10, nunca dos del mismo clip.

**Aquí no se aloja vídeo.** De cada clip se guardan el `videoId`, el trozo (`startMs` a
`endMs`) y la frase transcrita; lo reproduce el iframe oficial de YouTube contra el navegador
del usuario. Es la vía de YouGlish o Playphrase, y el corolario es firme: cualquier idea que
implique descargar, cortar o servir vídeo queda fuera.

El hueco es un ejercicio `gap` de los de siempre, así que lo corrige el mismo
`isCorrect()` que el resto del sitio y `test/clips.spec.ts` comprueba la invariante de la que
todo depende: `prompt` con la solución puesta **es** la frase del clip.

Un vídeo se puede borrar, hacerse privado o perder el permiso de embebido. Cuando el
reproductor lo detecta, el `videoId` se apunta en `ingles:clips-unavailable` y sus clips
dejan de salir en las rondas —también en `/repaso`— para que un embed muerto no atasque la
sesión. Esa lista no es progreso y no viaja en la exportación: es un hecho sobre el vídeo.

## Progreso y repaso espaciado

Cada respuesta de `/frases`, `/verbos/practica`, `/reading` y `/clips/practica` se apunta en `localStorage` (una
sola clave, `ingles:progress`) con sus aciertos, sus fallos y una caja Leitner de tres:

| Caja | Cuándo vuelve  |
| ---- | -------------- |
| 1    | el mismo día   |
| 2    | a los 2 días   |
| 3    | a los 7 días   |

Acertar sube como máximo una caja al día y aleja el repaso; fallar devuelve el ejercicio a la
caja 1, así que sigue en la cola de hoy aunque se recargue la página. `/progreso` resume lo practicado por
tiempo verbal y por sección, lista lo que más se falla y deja exportar el progreso a JSON,
importarlo o reiniciarlo. El botón **Repasar hoy** abre `/repaso`, una sesión con lo que
vence hoy y solo con eso, mezclando frases, verbos y preguntas de reading.

Las rondas se sortean con ese progreso: `/frases/<tiempo>` y `/verbos/practica` sacan 10
ejercicios (todos, si el tiempo verbal tiene menos), primero lo que no se ha practicado nunca o
vence hoy y luego, solo para rellenar, lo ya aprendido. **Otra ronda** vuelve a sortear, así que
dos rondas seguidas no son la misma lista y lo fallado hoy reaparece en la siguiente. Como
dependen del progreso y del azar, se arman en el navegador: el HTML prerenderizado no las trae.

La cola de `/repaso` se congela al empezar la sesión, para que no se encoja según se responde;
al terminarla, **Otra ronda** vuelve a fotografiarla y arranca otra con lo que se ha fallado,
sin recargar la página. Si ya no queda nada pendiente, el botón no aparece.

En `/reading` la corrección apunta un intento por pregunta la primera vez que se corrige la
lectura en esa visita: volver a intentarla no cuenta dos veces. Una pregunta en blanco cuenta
como fallo de la ronda, pero no se guarda como intento.

Si el navegador no deja escribir en `localStorage` (almacenamiento lleno, modo privado de
Safari), la sesión sigue funcionando igual: lo que se corrija simplemente no persiste. Si lo
bloquea del todo y ni siquiera deja leerlo, el progreso arranca vacío en cada visita, pero la
web no se queda en blanco: la lectura degrada a un progreso vacío en vez de romper la página.

Al importar, el fichero se fusiona con el progreso de este navegador por id: se conserva el
intento practicado más recientemente y, si empatan las fechas, el que acumule más respuestas.
Importar el mismo fichero dos veces no suma los contadores. Se descartan los intentos que la
propia web no puede haber exportado: sin id, con aciertos o fallos que no sean números enteros
y positivos, con una fecha que no exista o con un repaso anterior al día en que se practicó.
También se descartan los intentos fechados después de mañana, para no importar relojes del
dispositivo adelantados; se admite mañana por las diferencias de zona horaria entre dispositivos.
Si el fichero no tiene ningún intento válido, la importación se rechaza entera.

El speaking no cuenta para el progreso: su corrección es un porcentaje de palabras, no un
acierto o un fallo.

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
.github/workflows/ci.yml   lint, typecheck, tests, generate y despliegue a GitHub Pages
.env.example               las variables de configuración, con sus valores de desarrollo
public/.nojekyll           para que GitHub Pages sirva el directorio _nuxt/
app/
  app.vue                 raíz: layout + página, canonical y og:url de cada ruta
  error.vue               página de error propia, en español y dentro del layout
  layouts/default.vue     cabecera con la navegación y pie
  pages/index.vue         home con las tarjetas de cada sección
  pages/teoria/           listado de tiempos por nivel y teoría de cada uno
  pages/verbos/           tabla de verbos y ejercicio de conjugación
  pages/frases/           elección de tiempo y ronda sorteada de 10 frases
  pages/reading/          listado de lecturas y lectura con glosario y preguntas
  pages/speaking.vue      escuchar la frase, repetirla al micrófono y comparar
  pages/clips/            listado de clips y ronda sorteada con el vídeo delante
  pages/progreso.vue      resumen de lo practicado, fallos y exportar / importar
  pages/repaso.vue        sesión de repaso con lo que vence hoy
  components/Exercise*.vue  un componente por tipo de ejercicio de content/exercises/
  components/ClipPlayer.vue  iframe de YouTube acotado al trozo del clip, en bucle
  composables/useSpeech.ts  Web Speech API: síntesis de voz y reconocimiento
  composables/useProgress.ts  el progreso del navegador: apuntar, resumir y exportar
  composables/useSeo.ts   título, descripción y tarjeta social de cada página
  composables/useClips.ts   los vídeos que ya no se pueden reproducir
  composables/useYouTubePlayer.ts  carga única de la IFrame Player API
  utils/check.ts          corrección de las respuestas escritas y tercera persona
  utils/diff.ts           comparación palabra a palabra de lo que se ha dicho
  utils/progress.ts       cajas Leitner, guardado en localStorage e ítems repasables
  utils/content.ts        tipos del contenido y carga de content/*.json
  utils/explain.ts        componente y explicación de cada tipo de ejercicio
  utils/sections.ts       secciones del sitio (navegación y tarjetas)
  utils/unavailable.ts    lista de vídeos caídos, guardada aparte del progreso
content/
  tenses/<slug>.json      teoría, estructura y ejemplos de cada tiempo verbal
  exercises/<slug>.json   ejercicios en frases: hueco, transformar y elegir el tiempo
  readings/<slug>.json    lectura con glosario y preguntas de comprensión
  clips/<fuente>.json     clips de vídeo con su frase y sus huecos
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
  clips.spec.ts           valida content/clips/ y juega una ronda en /clips/practica
  diff.spec.ts            comparación palabra a palabra: acierto, omisión y sobrante
  speaking.spec.ts        /speaking avisa cuando el navegador no reconoce la voz
  progress.spec.ts        cajas Leitner, persistencia serializada y sesión de repaso
  a11y-seo.spec.ts        SEO propio de cada página y recorrido con teclado
  error.spec.ts           la página de error explica el 404 y deja volver
  smoke.spec.ts           test de humo: monta la home
```
