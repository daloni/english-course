<script setup lang="ts">
// La pantalla de acceso: usuario, contraseña y el captcha de Cloudflare Turnstile.
const { turnstileSiteKey } = useRuntimeConfig().public
const route = useRoute()

const state = reactive({ user: '', password: '' })
const token = ref('')
const error = ref('')
const widget = ref<HTMLElement>()

/** Lo que el widget de Turnstile deja en `window` cuando termina de cargarse. */
interface Turnstile {
  render: (element: HTMLElement, options: {
    'sitekey': string
    'callback': (token: string) => void
    'expired-callback': () => void
  }) => void
}

// A dónde se vuelve tras entrar: solo una ruta interna. Sin la comprobación, un enlace con
// ?redirect=https://… convertiría el login en un open redirect hacia donde quisiera quien
// mandara el enlace. `//` fuera también, que es una URL sin esquema (//evil.com).
const target = computed(() => {
  const redirect = route.query.redirect

  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : '/'
})

// ponytail: el token del captcha no se valida. La validación de verdad es una llamada de
// servidor a servidor a /turnstile/v0/siteverify con la secret key, y este sitio es estático:
// no hay dónde esconderla. Aquí el techo es que sin token no se puede enviar el formulario,
// que frena bots triviales; el día que haya servidor, la comprobación va ahí.
useHead({
  script: [{
    src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad',
    async: true,
    defer: true
  }]
})

/**
 * El widget se pinta a mano porque el script es `async`: puede llegar antes o después de que
 * el hueco exista, así que se intenta desde los dos lados y solo entra el primero. En un
 * entorno sin `window.turnstile` (los tests) simplemente no aparece, y no se rompe nada.
 */
let rendered = false

function renderTurnstile() {
  const turnstile = (window as { turnstile?: Turnstile }).turnstile

  if (rendered || !turnstile || !widget.value) {
    return
  }

  rendered = true
  turnstile.render(widget.value, {
    'sitekey': turnstileSiteKey,
    'callback': (value: string) => token.value = value,
    // Los tokens caducan a los cinco minutos: sin token, el botón vuelve a estar apagado.
    'expired-callback': () => token.value = ''
  })
}

if (import.meta.client) {
  Object.assign(window, { onTurnstileLoad: renderTurnstile })
}

// El hueco está dentro de <ClientOnly>, que lo pinta un render después de montar: se espera
// a tenerlo en vez de mirarlo en onMounted, cuando todavía no existe.
watch(widget, renderTurnstile)

async function submit() {
  if (!token.value) {
    return
  }

  if (!await checkCredentials(state.user, state.password)) {
    error.value = 'El usuario o la contraseña no son correctos.'
    return
  }

  error.value = ''
  signIn()
  await navigateTo(target.value)
}

useSeo({
  title: 'Entrar',
  description: 'Pantalla de acceso a la plataforma para aprender inglés: usuario, contraseña y captcha.'
})

// Una pantalla de acceso no pinta nada en Google.
useSeoMeta({ robots: 'noindex, nofollow' })
</script>

<template>
  <UPage>
    <UPageSection>
      <div class="mx-auto w-full max-w-sm">
        <h1 class="text-2xl font-bold">
          Entrar
        </h1>

        <p class="mt-2 text-muted">
          La web está detrás de un usuario y una contraseña.
        </p>

        <UForm
          :state="state"
          class="mt-8 space-y-4"
          @submit="submit"
        >
          <UFormField
            label="Usuario"
            name="user"
          >
            <UInput
              v-model="state.user"
              autocomplete="username"
              autocapitalize="off"
              spellcheck="false"
              autofocus
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Contraseña"
            name="password"
          >
            <UInput
              v-model="state.password"
              type="password"
              autocomplete="current-password"
              class="w-full"
            />
          </UFormField>

          <!-- El widget es puro navegador: en el prerender no tiene nada que pintar. -->
          <ClientOnly>
            <div
              ref="widget"
              class="min-h-[65px]"
            />
          </ClientOnly>

          <p
            v-if="!token"
            class="text-sm text-muted"
          >
            Marca la casilla del captcha para poder entrar.
          </p>

          <UButton
            type="submit"
            label="Entrar"
            icon="i-lucide-log-in"
            :disabled="!token"
          />
        </UForm>

        <div
          class="mt-6"
          aria-live="polite"
        >
          <UAlert
            v-if="error"
            title="No se ha podido entrar"
            :description="error"
            icon="i-lucide-x-circle"
            color="error"
            variant="subtle"
          />
        </div>
      </div>
    </UPageSection>
  </UPage>
</template>
