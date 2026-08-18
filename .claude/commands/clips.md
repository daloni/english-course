---
description: Convierte frases ingeridas de un vídeo en clips con hueco en content/clips/
argument-hint: [fichero de data/candidates/ | --all]
allowed-tools: Read, Write, Glob, Bash(node scripts/merge-content.mjs:*), Bash(pnpm test:*)
---

Convierte las frases de `data/candidates/` en clips publicables de `content/clips/<fuente>.json`.
Sin `$ARGUMENTS`, coge el primer fichero por orden alfabético; con `--all`, los recorre todos.

Antes hace falta ingerir: `node scripts/ingest.mjs <fuente>`, y eso **solo funciona en una
máquina con IP residencial** (YouTube bloquea player y subtítulos desde IPs de datacenter). Si
`data/candidates/` está vacío, dilo y para: no inventes clips.

## Pasos

1. Lee el fichero de `data/candidates/`. Trae `videoId`, `source`, `channel`, `title` y una lista
   de frases con `startMs`, `endMs` y `text`.
2. Descarta las frases que no valen (regla de descarte, abajo). **Ser estricto aquí es lo
   correcto**: una tarjeta confusa hace más daño que una tarjeta de menos. Es normal quedarse
   con menos de la mitad.
3. Escribe los clips que sobrevivan en `/tmp/clips.json`, con el esquema de abajo.
4. Fusiona sin sobrescribir lo que ya hay:
   `node scripts/merge-content.mjs content/clips/<source>.json < /tmp/clips.json`
5. Ejecuta `pnpm test test/clips.spec.ts`. Si falla, corrige el JSON y repite.
6. Borra el fichero de `data/candidates/` que acabas de procesar y reporta: cuántas frases
   entraron, cuántas se descartaron y por qué, y cuántos ficheros quedan pendientes.

Trabaja fichero a fichero, escribiendo y borrando en cada vuelta: si la sesión se corta, lo ya
hecho queda guardado y la siguiente invocación retoma sola.

## Esquema

`content/clips/<fuente>.json` es un **array** de clips:

```json
[
  {
    "id": "mgYE-v02kds:12340",
    "videoId": "mgYE-v02kds",
    "startMs": 12340,
    "endMs": 15120,
    "text": "I've been meaning to call you back",
    "level": "B1",
    "channel": "Easy English",
    "exercises": [
      {
        "id": "verb",
        "tenseId": "present-perfect",
        "prompt": "I ___ to call you back",
        "solution": "have been meaning"
      },
      {
        "id": "mean-to",
        "tenseId": "",
        "prompt": "I've been ___ call you back",
        "solution": "meaning to",
        "explanation": "«Mean to» es tener intención de hacer algo, no significar."
      }
    ]
  }
]
```

- `id` es **siempre** `` `${videoId}:${startMs}` ``. No lo inventes: es lo que hace que volver a
  ingerir la misma fuente no rompa el repaso ya guardado.
- `startMs`, `endMs` y `text` se copian **sin tocar** del candidato. Son las coordenadas del
  clip: si las alteras, el vídeo deja de cuadrar con la frase.
- `channel` se copia del candidato; el nombre del fichero es el `source`.

### `prompt` y `solution`

El `prompt` es la frase **con el hueco ya puesto**: `___` donde va la respuesta. No calcules
posiciones de caracteres, no hay `charStart` que rellenar.

La invariante que valida `test/clips.spec.ts`: **el `prompt` con la `solution` dentro tiene que
ser la frase del clip**, comparados con `normalize()` (`app/utils/check.ts`). Eso perdona las
mayúsculas, la puntuación final y las contracciones —`We're` ↔ `We are`—, y nada más.

- El hueco del verbo lleva los auxiliares: en *"I have been waiting"*, la solución es
  `"have been waiting"`, no `"waiting"`.
- Si el texto trae una contracción, puedes poner la forma plena: `"I've been meaning"` con hueco
  `"I ___ to call you back"` y solución `"have been meaning"` pasa la validación.
- Un solo `___` por ejercicio.
- `id` del ejercicio: corto y descriptivo (`verb`, `mean-to`), único dentro del clip.

### `tenseId`

El tiempo verbal que practica el hueco, y **tiene que existir** en `content/tenses/`. Si el
tiempo del verbo no está creado todavía, usa `/teoria <tiempo>` para crearlo primero o elige
otro hueco de la misma frase.

Para expresiones —phrasal verbs, idioms, colocaciones fijas— pon `tenseId: ""`: no practican
ningún tiempo, como las preguntas de reading. En esas, `explanation` lleva el significado **en
español y en contexto**, no una traducción literal.

### `level`

El nivel de quien podría **entender la frase al oírla**, no el del verbo aislado. Uno de
`A1`, `A2`, `B1`, `B2`, `C1`.

| Nivel | Criterio | Ejemplo |
|---|---|---|
| A1 | Presente e imperativo, vocabulario básico | *"Where do you live?"* |
| A2 | Pasado simple y futuro, rutinas | *"I went to the shop yesterday."* |
| B1 | Perfectos, condicional, phrasal verbs comunes | *"I've already sorted it out."* |
| B2 | Modales matizados, pasiva, idioms transparentes | *"It should have been dealt with by now."* |
| C1 | Idioms opacos, registro coloquial denso, ironía | *"Don't give me that — you're winding me up."* |

### La regla de descarte

Fuera cualquier frase que no se entienda sin haber visto lo anterior:

- depende de un pronombre sin referente: *"He said he'd do it then."*
- es un fragmento cortado a mitad: *"...and that's why we"*
- es puro relleno: *"Yeah. Right. Okay."*
- no tiene ningún verbo conjugado ni expresión que merezca un hueco

## Consistencia

La rúbrica de arriba es el criterio, no una sugerencia. No la relajes ni la extiendas sobre la
marcha entre ficheros: la razón de que esté escrita es que un etiquetado conversacional deriva de
un lote al siguiente. Si te encuentras un caso que no cubre, resuélvelo como puedas, **anótalo en
el reporte final** y que decida el usuario si toca cambiar la rúbrica.
