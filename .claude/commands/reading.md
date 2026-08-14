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
4. Ejecuta `pnpm test test/content.spec.ts`. Si falla, corrige el JSON y repite.

## Esquema

`content/readings/<slug>.json` es un **objeto**:

```json
{
  "id": "travel",
  "title": "A weekend in Lisbon",
  "level": "A2",
  "text": "Last spring I spent three days in Lisbon...\n\nThe second morning...",
  "questions": [
    {
      "id": "travel-q1",
      "question": "How long did the writer stay in Lisbon?",
      "options": ["One day", "Three days", "Two weeks"],
      "answer": "Three days"
    }
  ]
}
```

- `id`: el slug, **igual al nombre del fichero** sin `.json`. El test lo comprueba.
- `title`: título en inglés.
- `level`: uno de `A1`, `A2`, `B1`, `B2`, `C1`. Aquí: **$2**.
- `text`: el texto en inglés, en Markdown, con los párrafos separados por `\n\n`. Longitud
  orientativa: 120-150 palabras en A1-A2, 200-300 en B1-B2, 350+ en C1.
- `questions`: entre 4 y 6 preguntas de comprensión, en inglés.
  - `id`: `<slug>-q<n>`, **único**; si el fichero ya existe, continúa la numeración.
  - `options`: 3 opciones (4 a partir de B1). Los distractores tienen que ser plausibles y
    estar relacionados con el texto, no rellenos absurdos.
  - `answer`: **una de las cadenas de `options`, copiada literalmente**. El test falla si no
    coincide.

## Reglas

- La respuesta a cada pregunta tiene que poder deducirse del texto, sin conocimientos previos.
- Ajusta el inglés al nivel: en A1-A2, present y past simple, frases cortas y vocabulario
  frecuente; nada de idioms ni condicionales.
- Al fusionar, el texto nuevo sustituye al anterior y las preguntas se añaden por `id`: si
  vuelves a lanzar el comando con las mismas preguntas, el fichero no cambia.
