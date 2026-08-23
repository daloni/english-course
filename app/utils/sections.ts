// Single source of truth for the site sections: used by the layout nav and the home cards.
export const sections = [
  {
    label: 'Teoría',
    to: '/teoria',
    icon: 'i-lucide-book-open',
    description: 'Los tiempos verbales explicados: cuándo se usa cada uno y cómo se forma.'
  },
  {
    label: 'Verbos',
    to: '/verbos',
    icon: 'i-lucide-list-checks',
    description: 'Conjugación de verbos regulares e irregulares en todos los tiempos.'
  },
  {
    label: 'Frases',
    to: '/frases',
    icon: 'i-lucide-message-square-text',
    description: 'Frases de ejemplo para fijar cada tiempo verbal en contexto.'
  },
  {
    label: 'Reading',
    to: '/reading',
    icon: 'i-lucide-newspaper',
    description: 'Lecturas cortas con preguntas de comprensión.'
  },
  {
    label: 'Clips',
    to: '/clips',
    icon: 'i-lucide-clapperboard',
    description: 'Inglés real en trozos de vídeo: escucha la frase y rellena el hueco.'
  },
  {
    label: 'Repaso',
    to: '/repaso',
    icon: 'i-lucide-rotate-ccw',
    description: 'Repasa los ejercicios que te tocan hoy.'
  },
  {
    label: 'Speaking',
    to: '/speaking',
    icon: 'i-lucide-mic',
    description: 'Practica la pronunciación en voz alta con el reconocimiento de voz del navegador.'
  },
  {
    label: 'Progreso',
    to: '/progreso',
    icon: 'i-lucide-trending-up',
    description: 'Tu avance por sección, guardado en este navegador.'
  }
]
