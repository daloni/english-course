// Single source of truth for the site sections: used by the layout nav and the home cards,
// which show them under their `group` heading.
export const sections = [
  {
    label: 'Teoría',
    to: '/teoria',
    group: 'Aprende',
    icon: 'i-lucide-book-open',
    description: 'Los tiempos verbales explicados: cuándo se usa cada uno y cómo se forma.'
  },
  {
    label: 'Verbos',
    to: '/verbos',
    group: 'Aprende',
    icon: 'i-lucide-list-checks',
    description: 'Conjugación de verbos regulares e irregulares en todos los tiempos.'
  },
  {
    label: 'Frases',
    to: '/frases',
    group: 'Practica',
    icon: 'i-lucide-message-square-text',
    description: 'Frases de ejemplo para fijar cada tiempo verbal en contexto.'
  },
  {
    label: 'Reading',
    to: '/reading',
    group: 'Practica',
    icon: 'i-lucide-newspaper',
    description: 'Lecturas cortas con preguntas de comprensión.'
  },
  {
    label: 'Clips',
    to: '/clips',
    group: 'Practica',
    icon: 'i-lucide-clapperboard',
    description: 'Inglés real en trozos de vídeo: escucha la frase y rellena el hueco.'
  },
  {
    label: 'Repaso',
    to: '/repaso',
    group: 'Tu avance',
    icon: 'i-lucide-rotate-ccw',
    description: 'Repasa los ejercicios que te tocan hoy.'
  },
  {
    label: 'Speaking',
    to: '/speaking',
    group: 'Practica',
    icon: 'i-lucide-mic',
    description: 'Practica la pronunciación en voz alta con el reconocimiento de voz del navegador.'
  },
  {
    label: 'Progreso',
    to: '/progreso',
    group: 'Tu avance',
    icon: 'i-lucide-trending-up',
    description: 'Tu avance por sección, guardado en este navegador.'
  }
]
