# Aprender inglés

Plataforma web personal para aprender inglés centrada en los tiempos verbales:
teoría, conjugación de verbos, frases, reading con preguntas y speaking.

Sin backend y sin base de datos: una sola app Nuxt 4 con
[@nuxt/ui](https://ui.nuxt.com), el contenido versionado como ficheros en el
repo, el progreso en `localStorage` y el speaking con la Web Speech API del
navegador. Delante hay una pantalla de acceso con usuario, contraseña y captcha,
pero es una puerta de cliente: lo que se cuenta en [Acceso](#acceso).

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
| `NUXT_PUBLIC_AUTH_USER` | El usuario de la pantalla de acceso | `alumno` |
| `NUXT_PUBLIC_AUTH_PASSWORD_HASH` | El **SHA-256 en hexadecimal** de la contraseña | el de `ingles2026` |
| `NUXT_PUBLIC_TURNSTILE_SITE_KEY` | La sitekey de Turnstile | `1x00000000000000000000AA`, la de pruebas de Cloudflare, que siempre pasa |

Si falta alguna, el build se para nombrándola en vez de publicar un sitio sin canonical y con
el login imposible. Lo que venga por entorno gana sobre el fichero, que es como el workflow
pasa la `NUXT_PUBLIC_SITE_URL` de GitHub Pages.

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

## Acceso

`/login` pide usuario y contraseña y no deja enviar el formulario hasta que el captcha de
[Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) devuelve un token. Si el
widget no carga en cinco segundos, lo avisa y permite enviar el formulario sin captcha. Un
middleware global manda ahí cualquier ruta mientras no haya sesión, que se guarda en
`localStorage` (clave `ingles:auth`) y sobrevive a recargar. El botón **Salir** de la cabecera
la cierra.

Si el navegador bloquea el almacenamiento del sitio no hay dónde guardar la sesión, así que
`/login` no navega: se queda en pantalla y lo explica, en vez de mandarte a una página que
volvería a pedirte entrar sin decir por qué.

Credenciales de `.env.example`:

| | |
| --- | --- |
| Usuario | `alumno` |
| Contraseña | `ingles2026` |

Se cambian en el `.env`, sin tocar el código: `NUXT_PUBLIC_AUTH_USER`,
`NUXT_PUBLIC_AUTH_PASSWORD_HASH` y `NUXT_PUBLIC_TURNSTILE_SITE_KEY`, las tres de
[Configuración](#configuración).

```bash
# El hash de una contraseña nueva, para NUXT_PUBLIC_AUTH_PASSWORD_HASH
node -e "console.log(require('node:crypto').createHash('sha256').update('la nueva').digest('hex'))"
```

Para cambiarlas en el sitio publicado se añaden como `env` del paso `Generate the static site`
de `.github/workflows/ci.yml`, que es quien genera el sitio; en local basta con el `.env`, que
funciona con los valores de `.env.example` y sin cuenta de Cloudflare.

**El límite, escrito:** el sitio es estático, así que todo esto ocurre en el navegador.

- Las credenciales viajan en el bundle JS y quien abra las DevTools las ve; de la contraseña
  solo va el SHA-256, que evita tenerla escrita en claro pero no aguanta un ataque de fuerza
  bruta. Aunque las variables se pasen como *secret*, acaban en el bundle: son valores por
  defecto configurables, no secretos.
- El token del captcha no se valida: la comprobación de verdad es una llamada de servidor a
  servidor a `siteverify` con la *secret key*, y aquí no hay servidor donde esconderla. Frena
  bots triviales y nada más.
- El HTML de `/teoria`, `/frases`… está prerenderizado, así que pedir la URL directamente
  sigue devolviéndolo.

Es una puerta para que la web no esté abierta de par en par, no autenticación, y el contenido
de `content/` es material de estudio público. Para un muro de verdad hace falta hosting con
función de servidor (Cloudflare Pages Functions o un Worker) que valide el token del captcha y
firme una cookie de sesión.

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

## Progreso y repaso espaciado

Cada respuesta de `/frases`, `/verbos/practica` y `/reading` se apunta en `localStorage` (una
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
  layouts/default.vue     cabecera con la navegación, el botón de salir y pie
  pages/index.vue         home con las tarjetas de cada sección
  pages/login.vue         pantalla de acceso: usuario, contraseña y captcha
  pages/teoria/           listado de tiempos por nivel y teoría de cada uno
  pages/verbos/           tabla de verbos y ejercicio de conjugación
  pages/frases/           elección de tiempo y ronda de ejercicios en frases
  pages/reading/          listado de lecturas y lectura con glosario y preguntas
  pages/speaking.vue      escuchar la frase, repetirla al micrófono y comparar
  pages/progreso.vue      resumen de lo practicado, fallos y exportar / importar
  pages/repaso.vue        sesión de repaso con lo que vence hoy
  components/Exercise*.vue  un componente por tipo de ejercicio de content/exercises/
  composables/useSpeech.ts  Web Speech API: síntesis de voz y reconocimiento
  composables/useProgress.ts  el progreso del navegador: apuntar, resumir y exportar
  composables/useSeo.ts   título, descripción y tarjeta social de cada página
  utils/check.ts          corrección de las respuestas escritas y tercera persona
  utils/diff.ts           comparación palabra a palabra de lo que se ha dicho
  utils/progress.ts       cajas Leitner, guardado en localStorage e ítems repasables
  utils/content.ts        tipos del contenido y carga de content/*.json
  utils/explain.ts        componente y explicación de cada tipo de ejercicio
  utils/sections.ts       secciones del sitio (navegación y tarjetas)
  utils/auth.ts           la sesión del navegador y las credenciales de la puerta
  middleware/auth.global.ts  manda a /login mientras no haya sesión
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
  diff.spec.ts            comparación palabra a palabra: acierto, omisión y sobrante
  speaking.spec.ts        /speaking avisa cuando el navegador no reconoce la voz
  progress.spec.ts        cajas Leitner, persistencia serializada y sesión de repaso
  a11y-seo.spec.ts        SEO propio de cada página y recorrido con teclado
  error.spec.ts           la página de error explica el 404 y deja volver
  smoke.spec.ts           test de humo: monta la home
  login.spec.ts           la puerta: middleware, credenciales, captcha y salir
  setup.ts                abre la sesión antes de cada test, que si no todo va a /login
```
