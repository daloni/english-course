---
description: Añade o completa un verbo en content/verbs.json
argument-hint: <infinitivo>
allowed-tools: Read, Write, Bash(node scripts/merge-content.mjs:*), Bash(pnpm test:*)
---

Añade el verbo **$1** a `content/verbs.json`, o completa su entrada si ya está.

## Pasos

1. Lee `content/verbs.json` y busca `$1`. Si ya existe y está completo, dilo y no toques nada.
2. Escribe la entrada en `/tmp/verbo.json` (un array de un elemento) con el esquema de abajo.
3. Fusiona: `node scripts/merge-content.mjs content/verbs.json < /tmp/verbo.json`
4. Ejecuta `pnpm test test/content.spec.ts`. Si falla, corrige el JSON y repite.

## Esquema

`content/verbs.json` es un **array** de objetos:

```json
[
  { "infinitive": "go", "past": "went", "participle": "gone", "regular": false, "es": "ir" }
]
```

- `infinitive`: el verbo en minúsculas y sin `to`. Es la clave: **no puede repetirse**.
- `past`: pasado simple. Si hay dos formas, sepáralas con ` / ` (`was / were`).
- `participle`: participio pasado.
- `regular`: `true` solo si `past` y `participle` son la misma forma en `-ed`. El test lo
  comprueba, así que un verbo irregular marcado como regular deja el build en rojo.
- `es`: traducción al español, separando acepciones con coma (`saber, conocer`).

## Reglas

- El script fusiona por `infinitive`: si el verbo ya está, solo se rellenan los campos que
  falten y el resto de la lista se queda igual. Nunca reescribas el fichero entero a mano.
- Ortografía británica en las formas irregulares dobles (`got`, no `gotten`), coherente con
  el resto de la lista.
