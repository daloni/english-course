<script setup lang="ts">
const { legalOwner, legalEmail } = useRuntimeConfig().public

useSeo({
  title: 'Aviso legal',
  description: 'Información sobre el titular, el contacto, el uso educativo, la propiedad intelectual y las condiciones de este sitio web.'
})
</script>

<template>
  <UPage>
    <UPageHeader
      title="Aviso legal"
      description="Información general y condiciones de uso del sitio."
    />
    <UPageBody>
      <article class="legal-text">
        <h2>Titular y contacto</h2>
        <p>El titular de este sitio es {{ legalOwner }}. Puedes contactar por correo electrónico en <a :href="`mailto:${legalEmail}`">{{ legalEmail }}</a>.</p>

        <h2>Objeto del sitio</h2>
        <p>Este sitio personal y gratuito ofrece materiales educativos para aprender inglés. No requiere crear una cuenta ni contratar ningún servicio.</p>

        <h2>Propiedad intelectual</h2>
        <p>Los textos y materiales propios del sitio pertenecen a su titular, salvo indicación distinta. Los vídeos enlazados pertenecen a sus respectivos titulares y se muestran mediante el reproductor oficial de YouTube; este sitio no aloja copias de esos vídeos.</p>

        <h2>Responsabilidad y enlaces externos</h2>
        <p>Los materiales se ofrecen con fines educativos. Se procura mantenerlos correctos y disponibles, pero no se garantiza la ausencia de errores ni la disponibilidad continua. El uso de los contenidos es responsabilidad de cada persona.</p>
        <p>Los enlaces a sitios externos llevan a servicios ajenos, cuyo contenido, disponibilidad y políticas corresponden a sus respectivos responsables.</p>

        <h2>Legislación aplicable</h2>
        <p>Este aviso se rige por la legislación española, incluida la Ley 34/2002 de servicios de la sociedad de la información y de comercio electrónico.</p>
      </article>
    </UPageBody>
  </UPage>
</template>
