// The two halves of the Web Speech API behind one composable: SpeechSynthesis to hear the
// sentence and SpeechRecognition to repeat it. Recognition only exists in Chrome and Edge,
// so `canListen` is false everywhere else and the page keeps working as listen only.

/** Accents offered for both speaking and listening. */
export const accents = [
  { label: 'Estados Unidos', value: 'en-US' },
  { label: 'Reino Unido', value: 'en-GB' }
] as const

export type Accent = typeof accents[number]['value']

// SpeechRecognition is not in lib.dom: only what this composable touches is declared here.
interface RecognitionAlternative { transcript: string }
interface RecognitionResult { 0: RecognitionAlternative }
interface RecognitionEvent { results: ArrayLike<RecognitionResult> }
interface RecognitionErrorEvent { error: string }

interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: RecognitionEvent) => void) | null
  onerror: ((event: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface SpeechWindow {
  SpeechRecognition?: new () => Recognition
  webkitSpeechRecognition?: new () => Recognition
}

const recognitionCtor = () => {
  const speech = window as unknown as SpeechWindow

  return speech.SpeechRecognition ?? speech.webkitSpeechRecognition
}

/** Why the microphone gave up, in the words of the learner instead of the spec's. */
const errors: Record<string, string> = {
  'no-speech': 'No se ha oído nada. Vuelve a intentarlo hablando más cerca del micrófono.',
  'audio-capture': 'No se encuentra ningún micrófono.',
  'not-allowed': 'El navegador no ha dado permiso para usar el micrófono.',
  'service-not-allowed': 'El navegador no ha dado permiso para usar el micrófono.',
  'network': 'El reconocimiento de voz necesita conexión a internet.'
}

export function useSpeech() {
  const accent = ref<Accent>('en-US')
  /** Slower than normal by default: the point is to catch every word. */
  const rate = ref(0.9)

  const canSpeak = ref(false)
  const canListen = ref(false)
  const speaking = ref(false)
  const listening = ref(false)
  const transcript = ref('')
  const error = ref('')

  let recognition: Recognition | null = null
  let utterance: SpeechSynthesisUtterance | null = null

  // Both APIs live in the browser: on the server the page renders as unsupported and the
  // flags turn on once it is mounted.
  onMounted(() => {
    canSpeak.value = 'speechSynthesis' in window
    canListen.value = recognitionCtor() !== undefined
  })

  function speak(sentence: string) {
    if (!canSpeak.value) {
      return
    }

    // Only one sentence at a time: a second click restarts it instead of queueing. The
    // handlers of the previous one go first, as its `end` is dispatched after this call and
    // would clear the flag of the sentence that is starting now.
    if (utterance) {
      utterance.onend = utterance.onerror = null
    }

    speechSynthesis.cancel()

    const current = new SpeechSynthesisUtterance(sentence)

    current.lang = accent.value
    current.rate = rate.value
    // The voices may not be loaded yet; `lang` alone is enough for the browser to pick one.
    current.voice = speechSynthesis.getVoices().find(voice => voice.lang.replace('_', '-') === accent.value) ?? null
    current.onend = () => speaking.value = false
    current.onerror = () => speaking.value = false

    utterance = current
    speaking.value = true
    speechSynthesis.speak(current)
  }

  function stopSpeaking() {
    if (canSpeak.value) {
      speechSynthesis.cancel()
      speaking.value = false
    }
  }

  /** Records one repetition: it stops on its own when the learner goes quiet. */
  function listen() {
    const Recognizer = recognitionCtor()

    if (!Recognizer) {
      return
    }

    recognition?.abort()
    transcript.value = ''
    error.value = ''

    const recognizer = new Recognizer()

    recognizer.lang = accent.value
    recognizer.continuous = false
    recognizer.interimResults = false
    recognizer.maxAlternatives = 1

    recognizer.onresult = (event) => {
      transcript.value = Array.from(event.results, result => result[0].transcript).join(' ').trim()
    }

    recognizer.onerror = (event) => {
      error.value = errors[event.error] ?? `No se ha podido escuchar (${event.error}).`
    }

    recognizer.onend = () => {
      listening.value = false
    }

    recognition = recognizer
    listening.value = true

    try {
      recognizer.start()
    } catch {
      // start() throws when it is already running; nothing to recover, the session goes on.
      listening.value = false
    }
  }

  function stopListening() {
    recognition?.stop()
  }

  onBeforeUnmount(() => {
    recognition?.abort()
    stopSpeaking()
  })

  return {
    accent,
    rate,
    canSpeak,
    canListen,
    speaking,
    listening,
    transcript,
    error,
    speak,
    stopSpeaking,
    listen,
    stopListening
  }
}
