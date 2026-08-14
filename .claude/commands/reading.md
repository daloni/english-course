---
description: Genera un texto de lectura con preguntas en content/readings/
argument-hint: <tema> <nivel>
allowed-tools: Read, Write, Glob, Bash(node scripts/merge-content.mjs:*), Bash(pnpm test:*)
---

Escribe una lectura sobre **$1** de nivel **$2** en `content/readings/<slug>.json`, donde
`<slug>` es **$1** en minúsculas y con guiones (`city life` → `city-life.json`).

## Pasos

1. Lee `content/readings/<slug>.json` si ya existe: mantén el texto y las preguntas que haya
   y añade solo preguntas nuevas (o amplía el texto si lo pide el usuario).
2. Escribe la lectura en `/tmp/reading.json` con el esquema de abajo.
3. Fusiona: `node scripts/merge-content.mjs content/readings/<slug>.json < /tmp/reading.json`
4. Ejecuta `pnpm test test/reading.spec.ts`. Si falla, corrige el JSON y repite.

## Esquema

`content/readings/<slug>.json` es un **objeto**:

```json
{
  "id": "travel",
  "title": "A weekend in Lisbon",
  "topic": "Viajes",
  "level": "A2",
  "text": "Last spring I spent three days in Lisbon...\n\nThe second morning...",
  "glossary": [
    { "en": "tram", "es": "tranvía" }
  ],
  "questions": [
    {
      "id": "travel-q1",
      "question": "How long did the writer stay in Lisbon?",
      "options": ["One day", "Three days", "Two weeks"],
      "answer": "Three days",
      "explanation": "La primera frase lo dice: «my sister and I spent three days in Lisbon»."
    },
    {
      "id": "travel-q2",
      "question": "Which city is the text about?",
      "answer": "Lisbon / Lisboa",
      "explanation": "El texto nombra Alfama y Belém, dos barrios de Lisboa."
    }
  ]
}
```

- `id`: el slug, **igual al nombre del fichero** sin `.json`. El test lo comprueba.
- `title`: título en inglés.
- `topic`: el tema **en español**, tal como sale en el listado de `/reading` (`travel` →
  `Viajes`). Aquí: **$1** traducido y en mayúscula inicial.
- `level`: uno de `A1`, `A2`, `B1`, `B2`, `C1`. Aquí: **$2**.
- `text`: el texto en inglés, en Markdown, con los párrafos separados por `\n\n`. Longitud
  orientativa: 120-150 palabras en A1-A2, 200-300 en B1-B2, 350+ en C1.
- `glossary`: entre 5 y 10 palabras clave del texto con su traducción (`en`, `es`). Solo
  vocabulario que aparezca en el texto y que cueste al nivel **$2**.
- `questions`: entre 4 y 6 preguntas de comprensión, en inglés, **nunca menos de 3**.
  - `id`: `<slug>-q<n>`, **único**; si el fichero ya existe, continúa la numeración.
  - `options`: 3 opciones (4 a partir de B1) si la pregunta es de opción múltiple. Los
    distractores tienen que ser plausibles y estar relacionados con el texto, no rellenos
    absurdos. **Omite `options`** para una pregunta de respuesta corta, que se escribe.
  - `answer`: con `options`, **una de sus cadenas, copiada literalmente**; el test falla si no
    coincide. Sin `options`, la respuesta escrita, con las variantes válidas separadas por
    `/` (`"Lisbon / Lisboa"`): mayúsculas y contracciones ya las perdona la corrección.
  - `explanation`: **obligatoria**, en español: por qué esa es la respuesta, citando el
    fragmento del texto que lo dice. Se muestra al corregir, se acierte o no.
  - Deja al menos una pregunta de respuesta corta: se contestan escribiendo, así que la
    respuesta tiene que ser una o dos palabras que salgan del texto, no una frase larga.

## Reglas

- La respuesta a cada pregunta tiene que poder deducirse del texto, sin conocimientos previos.
- Ajusta el inglés al nivel: en A1-A2, present y past simple, frases cortas y vocabulario
  frecuente; nada de idioms ni condicionales.
- Al fusionar, el texto nuevo sustituye al anterior y las preguntas se añaden por `id`: si
  vuelves a lanzar el comando con las mismas preguntas, el fichero no cambia.
