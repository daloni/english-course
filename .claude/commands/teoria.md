---
description: Redacta o amplía la teoría de un tiempo verbal en content/tenses/
argument-hint: <tiempo>
allowed-tools: Read, Write, Bash(node scripts/merge-content.mjs:*), Bash(pnpm test:*)
---

Redacta la teoría del tiempo verbal **$1** en `content/tenses/$1.json` (slug en minúsculas y
con guiones: `present-perfect`). Si el fichero ya existe, **amplía** lo que hay en vez de
reescribirlo de cero.

## Pasos

1. Lee `content/tenses/$1.json` si existe, y `content/tenses/present-simple.json` como
   referencia de tono y formato.
2. Escribe el objeto en `/tmp/teoria.json`: si el fichero ya existía, incluye solo los campos
   que cambian (normalmente `theory`, o `examples` para añadir ejemplos).
3. Fusiona: `node scripts/merge-content.mjs content/tenses/$1.json < /tmp/teoria.json`
4. Ejecuta `pnpm test test/content.spec.ts`. Si falla, corrige el JSON y repite.

## Esquema

`content/tenses/<slug>.json` es un **objeto**:

```json
{
  "id": "present-simple",
  "name": "Present Simple",
  "nameEs": "Presente simple",
  "level": "A1",
  "theory": "## Cuándo se usa\n\n...",
  "structure": {
    "affirmative": "Sujeto + verbo en infinitivo (+ -s en 3.ª persona)",
    "negative": "Sujeto + do / does + not + verbo en infinitivo",
    "interrogative": "Do / Does + sujeto + verbo en infinitivo + ?"
  },
  "timeMarkers": ["always", "every day", "on Mondays"],
  "examples": [
    { "form": "affirmative", "en": "I work in a small office.", "es": "Trabajo en una oficina pequeña." }
  ]
}
```

- `id`: el slug, **igual al nombre del fichero** sin `.json`. El test lo comprueba.
- `name` / `nameEs`: nombre en inglés y en español.
- `level`: uno de `A1`, `A2`, `B1`, `B2`, `C1`.
- `theory`: Markdown en español con estos apartados como mínimo: `## Cuándo se usa`,
  `## Cómo se forma` y `## Errores frecuentes`. Los ejemplos en inglés van en *cursiva*, y las
  correcciones con ❌ / ✅. Los saltos de línea van escapados como `\n` dentro del JSON.
- `structure`: las tres formas, descritas en español. Las tres son obligatorias.
- `timeMarkers`: al menos 5 marcadores temporales típicos, en inglés.
- `examples`: al menos 2 de cada `form` (`affirmative`, `negative`, `interrogative`), con `en`
  y `es`.

## Reglas

- Teoría en español, ejemplos en inglés con su traducción: es una plataforma para
  hispanohablantes.
- Al fusionar, los campos de texto (`theory`, `structure`...) se sustituyen por el valor nuevo,
  y las listas (`examples`, `timeMarkers`) se añaden sin duplicar: un ejemplo idéntico a uno
  que ya estaba no se repite.
- Si el tiempo verbal es nuevo, rellena todos los campos: un objeto incompleto deja
  `pnpm test` en rojo.
