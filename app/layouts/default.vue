<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>
}

const items = sections.map(({ label, to, icon }) => ({ label, to, icon }))
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

      <UNavigationMenu :items="items" />

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
        />
      </template>
    </UHeader>

    <UMain id="contenido">
      <slot />
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          Plataforma personal para aprender inglés
        </p>
      </template>
    </UFooter>
  </div>
</template>
