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

## Estructura

```
app/
  app.vue                 raíz: layout + página
  layouts/default.vue     cabecera con la navegación y pie
  pages/index.vue         home con las tarjetas de cada sección
  utils/sections.ts       secciones del sitio (navegación y tarjetas)
test/
  smoke.spec.ts           test de humo: monta la home
```
