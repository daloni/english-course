<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>
}

const { pending } = useProgress()
const items = sections.map(({ label, to, icon }) => ({
  label,
  to,
  icon,
  ...(to === '/repaso' ? { slot: 'review' } : {})
}))
const footerSections = sections.filter(({ to }) => to !== '/repaso' && to !== '/progreso')
const footerColumns = [
  { label: 'Secciones', children: footerSections.map(({ label, to }) => ({ label, to })) },
  {
    label: 'Legal',
    children: [
      { label: 'Aviso legal', to: '/aviso-legal' },
      { label: 'Privacidad', to: '/privacidad' },
      { label: 'Cookies', to: '/cookies' }
    ]
  }
]
const installPrompt = ref<InstallPromptEvent | null>(null)
const installing = ref(false)

function onBeforeInstallPrompt(event: Event) {
  event.preventDefault()
  installPrompt.value = event as InstallPromptEvent
}

function onAppInstalled() {
  installPrompt.value = null
}

async function installApp() {
  const prompt = installPrompt.value

  if (!prompt || installing.value) {
    return
  }

  installing.value = true

  try {
    await prompt.prompt()
    await prompt.userChoice
  } finally {
    installPrompt.value = null
    installing.value = false
  }
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.addEventListener('appinstalled', onAppInstalled)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.removeEventListener('appinstalled', onAppInstalled)
})
</script>

<template>
  <div>
    <!-- First tab stop of the page: skip the navigation and land on the content. -->
    <a
      href="#contenido"
      class="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-default focus:px-4 focus:py-2 focus:font-medium focus:ring-2 focus:ring-primary"
    >
      Saltar al contenido
    </a>

    <UHeader :ui="{ center: 'flex-1' }">
      <template #title>
        <span class="font-bold">Inglés</span>
      </template>

      <UNavigationMenu :items="items">
        <template #review-trailing>
          <ClientOnly>
            <UBadge
              v-if="pending.length"
              :label="pending.length"
              aria-label="ejercicios pendientes"
            />
          </ClientOnly>
        </template>
      </UNavigationMenu>

      <template #right>
        <UButton
          v-if="installPrompt && !installing"
          label="Instalar app"
          aria-label="Instalar app"
          type="button"
          @click="installApp"
        />
        <UColorModeButton />
      </template>

      <template #body>
        <UNavigationMenu
          :items="items"
          orientation="vertical"
        >
          <template #review-trailing>
            <ClientOnly>
              <UBadge
                v-if="pending.length"
                :label="pending.length"
                aria-label="ejercicios pendientes"
              />
            </ClientOnly>
          </template>
        </UNavigationMenu>
      </template>
    </UHeader>

    <UMain id="contenido">
      <slot />
    </UMain>

    <UFooter>
      <template #top>
        <UContainer>
          <UFooterColumns
            :columns="footerColumns"
            aria-label="Enlaces del sitio"
            :ui="{
              center: 'grid grid-cols-2 gap-8',
              label: 'text-base font-semibold',
              list: 'mt-2 space-y-1 lg:flex lg:flex-wrap lg:gap-x-4 lg:gap-y-1 lg:space-y-0',
              link: 'min-h-8 px-1.5 py-1.5 text-sm rounded-sm focus-visible:outline-primary/25 focus-visible:outline-3'
            }"
          />
        </UContainer>
      </template>
      <template #left>
        <p class="text-center text-sm text-muted lg:text-left">
          Plataforma personal para aprender inglés
        </p>
      </template>
    </UFooter>
  </div>
</template>
