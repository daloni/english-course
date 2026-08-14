---
description: Genera frases con hueco para un tiempo verbal en content/exercises/
argument-hint: <tiempo> <nivel> <n>
allowed-tools: Read, Write, Glob, Bash(node scripts/merge-content.mjs:*), Bash(pnpm test:*)
---

Genera **$3** frases con hueco de nivel **$2** para el tiempo verbal **$1** y añádelas a
`content/exercises/$1.json`.

## Pasos

1. Lee `content/tenses/$1.json` para ajustarte a la estructura, los time markers y los
   ejemplos de ese tiempo. Si el fichero no existe, para y dilo: el `tenseId` tiene que
   ser un tiempo que exista (`/teoria` lo crea).
2. Lee `content/exercises/$1.json` si ya existe, para no repetir frases ni ids.
3. Escribe las frases nuevas en `/tmp/frases.json` con el esquema de abajo.
4. Fusiona sin sobrescribir el fichero:
   `node scripts/merge-content.mjs content/exercises/$1.json < /tmp/frases.json`
5. Ejecuta `pnpm test test/content.spec.ts`. Si falla, corrige el JSON y repite.

## Esquema

`content/exercises/<tiempo>.json` es un **array** de objetos:

```json
[
  {
    "id": "present-simple-001",
    "tenseId": "present-simple",
    "prompt": "She ___ (live) in Madrid.",
    "solution": "lives"
  }
]
```

- `id`: `<tiempo>-<nnn>` con tres dígitos. **Único en todo `content/exercises/`**: continúa
  la numeración a partir del id más alto que ya haya en el fichero (si el último es
  `present-simple-012`, la siguiente frase es `present-simple-013`).
- `tenseId`: exactamente `$1`.
- `prompt`: la frase en inglés con **un solo hueco** marcado con `___` y, entre paréntesis,
  el infinitivo del verbo que hay que conjugar: `They ___ (not / work) on Sundays.`
- `solution`: solo lo que va en el hueco (`lives`, `didn't go`, `have you seen`), no la frase
  entera.
- No hay campo de nivel: **$2** decide el vocabulario y la longitud de la frase (A1-A2 frases
  cortas y cotidianas, B1+ frases más largas, con subordinadas o phrasal verbs).

### Otros tipos de ejercicio

Sin `type` la frase es de hueco. Los otros dos tipos van en el mismo fichero y usan `prompt`
para la frase **entera**, sin `___`:

```json
[
  {
    "id": "present-simple-011",
    "tenseId": "present-simple",
    "type": "transform",
    "form": "negative",
    "prompt": "Sarah works in a bank.",
    "solution": "Sarah doesn't work in a bank.",
    "explanation": "La -s de la tercera persona pasa al auxiliar: doesn't work."
  },
  {
    "id": "present-simple-012",
    "tenseId": "present-simple",
    "type": "choice",
    "prompt": "My brother gets up at seven every morning.",
    "options": ["Present Simple", "Present Continuous", "Past Simple"],
    "solution": "Present Simple",
    "explanation": "every morning describe una rutina."
  }
]
```

- `transform`: `form` es la forma a la que hay que pasar la frase (`negative` o
  `interrogative`) y `solution` es la frase entera reescrita.
- `choice`: `options` son los tiempos verbales entre los que elegir (uno de ellos es
  `solution`, y es el nombre del tiempo **$1**); los otros deben ser plausibles.
- `explanation`: una línea en español con el porqué, que se muestra al fallar. Opcional en las
  frases de hueco, donde si falta se enseña la estructura del tiempo.

## Reglas

- Vocabulario y verbos variados: no diez frases con el mismo verbo ni todas afirmativas.
  Reparte entre afirmativa, negativa e interrogativa.
- Cada frase debe tener una única solución correcta: incluye el time marker o el contexto que
  obliga a usar ese tiempo (*yesterday*, *every day*, *since 2010*...).
- Si una frase que ibas a escribir ya está en el fichero, sustitúyela por otra distinta.
- Nunca reescribas ni borres entradas existentes: el script de fusión se encarga de añadir.
