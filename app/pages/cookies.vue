<script setup lang="ts">
const { legalOwner, legalEmail } = useRuntimeConfig().public

useSeo({
  title: 'Política de cookies',
  description: 'El curso no instala cookies propias: explica el progreso y la caché locales, el modo de color y cuándo se conecta el reproductor de YouTube.'
})
</script>

<template>
  <UPage>
    <UPageHeader
      title="Política de cookies"
      description="Almacenamiento del navegador y reproducción de vídeos."
    />
    <UPageBody>
      <article class="prose dark:prose-invert mx-auto max-w-3xl">
        <p>Este sitio no instala cookies propias ni carga cookies de terceros antes de que actives un servicio externo. No utiliza analítica ni publicidad. El almacenamiento local necesario para las funciones que solicitas está exento del consentimiento previo conforme al artículo 22.2 de la LSSI-CE; por ello no aparece un banner de cookies.</p>

        <h2>Datos guardados en este navegador</h2>
        <div
          role="region"
          tabindex="0"
          aria-label="Almacenamiento del navegador; desplázate horizontalmente si es necesario"
          class="overflow-x-auto"
        >
          <table>
            <caption class="sr-only">
              Claves, finalidad y duración del almacenamiento local
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  Almacenamiento
                </th><th scope="col">
                  Finalidad
                </th><th scope="col">
                  Duración y exención
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  <code>ingles:progress</code> (localStorage)
                </th><td>Guardar respuestas y progreso para continuar aprendiendo.</td><td>Hasta que lo borres; necesario para la función de progreso solicitada.</td>
              </tr>
              <tr>
                <th scope="row">
                  <code>nuxt-color-mode</code> (localStorage)
                </th><td>Recordar el modo claro u oscuro que elegiste.</td><td>Hasta que lo borres; necesario para mantener la preferencia solicitada.</td>
              </tr>
              <tr>
                <th scope="row">
                  <code>ingles:clips-unavailable</code> (localStorage)
                </th><td>Recordar qué vídeos no se pueden reproducir y evitar que vuelvan a salir.</td><td>Hasta que borres los datos del sitio; necesario para usar los clips sin repetir errores.</td>
              </tr>
              <tr>
                <th scope="row">
                  Service worker y Cache Storage
                </th><td>Guardar páginas y recursos para el uso sin conexión.</td><td>Hasta que borres los datos del sitio o el navegador retire la caché; necesario para la función sin conexión.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>YouTube</h2>
        <p>Los clips usan <code>youtube-nocookie.com</code> y el reproductor solo se carga cuando pulsas «Reproducir», después de mostrarte un aviso. A partir de esa acción, YouTube puede acceder a datos de conexión y usar sus propias tecnologías de almacenamiento. Consulta la <a href="https://policies.google.com/privacy?hl=es">política de privacidad de Google</a>.</p>

        <h2>Cómo borrar los datos</h2>
        <p>En los ajustes de tu navegador, abre los datos de sitios web, busca este sitio y elimina su almacenamiento local y caché. También puedes borrar el progreso desde la página de progreso. Si limpias estos datos, se perderán el avance guardado y la disponibilidad sin conexión hasta una nueva visita.</p>
        <p>Responsable: {{ legalOwner }}. Contacto: <a :href="`mailto:${legalEmail}`">{{ legalEmail }}</a>.</p>
      </article>
    </UPageBody>
  </UPage>
</template>
