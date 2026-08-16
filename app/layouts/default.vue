<script setup lang="ts">
const items = sections.map(({ label, to, icon }) => ({ label, to, icon }))

function leave() {
  signOut()
  return navigateTo('/login')
}
</script>

<template>
  <div>
    <!-- Primer tabulador de la página: saltar la navegación y llegar al contenido. -->
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
        <!-- La sesión vive en el localStorage, así que el botón solo existe en el navegador:
             pintarlo en el prerender descuadraría la hidratación. -->
        <ClientOnly>
          <UButton
            label="Salir"
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            @click="leave"
          />
        </ClientOnly>

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
