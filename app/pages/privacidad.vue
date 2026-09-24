<script setup lang="ts">
const { legalOwner, legalEmail } = useRuntimeConfig().public

useSeo({
  title: 'Política de privacidad',
  description: 'Cómo se guardan el progreso y las preferencias en tu navegador, qué datos reciben GitHub, YouTube y el proveedor de voz y cómo ejercer tus derechos.'
})
</script>

<template>
  <UPage>
    <UPageHeader
      title="Política de privacidad"
      description="Qué ocurre con tus datos al utilizar el curso."
    />
    <UPageBody>
      <article class="prose dark:prose-invert mx-auto max-w-3xl">
        <p><strong>Última actualización:</strong> 24 de septiembre de 2026.</p>
        <h2>Responsable y contacto</h2>
        <p>El responsable de este sitio es {{ legalOwner }}. Para cualquier consulta sobre privacidad, escribe a <a :href="`mailto:${legalEmail}`">{{ legalEmail }}</a>.</p>

        <h2>Datos y finalidades</h2>
        <p>El curso no tiene cuentas ni servidor propio que reciba tu progreso. Las respuestas, el progreso, los identificadores de vídeos no disponibles y la preferencia de modo de color se guardan en el <code>localStorage</code> de tu navegador para recordar tu aprendizaje y tus preferencias. El service worker guarda recursos en Cache Storage para que puedas usar el curso sin conexión. Estos datos permanecen en tu dispositivo y no se envían al titular.</p>
        <p>GitHub Pages, como proveedor de alojamiento, registra la dirección IP de cada visita en sus logs técnicos. Al pulsar «Reproducir» en un clip se carga el reproductor de YouTube y tu navegador se conecta con Google. Antes de ese clic no se carga el reproductor.</p>
        <p>En Speaking, el reconocimiento de voz utiliza la Web Speech API. El navegador o su proveedor pueden procesar el audio fuera de tu dispositivo; en Chrome el reconocimiento puede procesarse en servidores de Google. El curso no recibe ni almacena tu voz.</p>

        <h2>Base jurídica, destinatarios y transferencias</h2>
        <p>El almacenamiento del progreso y las preferencias responde a tu solicitud de usar las funciones del curso. La conexión con YouTube y el reconocimiento de voz se producen cuando decides activar esas funciones. Los registros técnicos del alojamiento responden al interés legítimo en prestar y proteger el servicio.</p>
        <p>GitHub recibe los datos técnicos de alojamiento; Google/YouTube puede recibir datos de conexión y, según el navegador, audio al usar sus funciones. Estos proveedores pueden tratar datos en Estados Unidos; consulta sus políticas y garantías de transferencias internacionales. No vendemos ni compartimos datos de progreso con terceros.</p>

        <h2>Conservación y derechos</h2>
        <p>El progreso, las preferencias y la caché permanecen en tu navegador hasta que los borres desde sus ajustes. GitHub y Google conservan sus propios registros conforme a sus políticas. Puedes solicitar al responsable acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad escribiendo al correo indicado; cuando proceda, también puedes retirar tu consentimiento sin efecto retroactivo.</p>
        <p>Si consideras que tus derechos no se han atendido, puedes presentar una reclamación ante la <a href="https://www.aepd.es/">Agencia Española de Protección de Datos (AEPD)</a>.</p>
      </article>
    </UPageBody>
  </UPage>
</template>
