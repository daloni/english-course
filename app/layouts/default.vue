<script setup lang="ts">
const items = sections.map(({ label, to, icon }) => ({ label, to, icon }))
</script>

<template>
  <div>
    <UHeader :ui="{ center: 'flex-1' }">
      <template #title>
        <span class="font-bold">Inglés</span>
      </template>

      <UNavigationMenu :items="items" />

      <template #right>
        <UColorModeButton />
      </template>

      <template #body>
        <UNavigationMenu
          :items="items"
          orientation="vertical"
        />
      </template>
    </UHeader>

    <UMain>
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
