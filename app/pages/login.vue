<script setup lang="ts">
// The sign-in screen: user, password and the Cloudflare Turnstile captcha.
const { turnstileSiteKey } = useRuntimeConfig().public
const route = useRoute()

const state = reactive({ user: '', password: '' })
const token = ref('')
const error = ref('')
const widget = ref<HTMLElement>()

/** What the Turnstile widget leaves on `window` once it finishes loading. */
interface Turnstile {
  render: (element: HTMLElement, options: {
    'sitekey': string
    'callback': (token: string) => void
    'expired-callback': () => void
  }) => void
}

// Where to go back to after signing in: internal routes only. Without the check, a link with
// ?redirect=https://... would turn the login into an open redirect towards wherever whoever
// sent the link wanted. `//` is out too, which is a scheme-relative URL (//evil.com).
const target = computed(() => {
  const redirect = route.query.redirect

  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : '/'
})

// ponytail: the captcha token is not validated. Real validation is a server-to-server call
// to /turnstile/v0/siteverify with the secret key, and this site is static: there is nowhere
// to hide it. The ceiling here is that without a token the form cannot be submitted, which
// stops trivial bots; the day there is a server, the check goes there.
useHead({
  script: [{
    src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad',
    async: true,
    defer: true
  }]
})

/**
 * The widget is rendered by hand because the script is `async`: it can arrive before or after
 * its slot exists, so it is attempted from both sides and only the first one gets through. In
 * an environment with no `window.turnstile` (the tests) it simply does not show up, and
 * nothing breaks.
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
    // Tokens expire after five minutes: with no token, the button goes back to disabled.
    'expired-callback': () => token.value = ''
  })
}

if (import.meta.client) {
  Object.assign(window, { onTurnstileLoad: renderTurnstile })
}

// The slot lives inside <ClientOnly>, which renders it one render after mounting: wait for it
// instead of looking in onMounted, when it does not exist yet.
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

// A sign-in screen has no business in Google.
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

          <!-- The widget is browser only: during the prerender it has nothing to render. -->
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
