/** El nombre del sitio: lo que cierra el <title> de cada página y sus tarjetas al compartir. */
export const siteName = 'Aprender inglés'

/**
 * El SEO de una página: su título y su descripción, también en la tarjeta que enseñan
 * WhatsApp, Slack o Twitter al compartir el enlace. Sin esto todas las páginas heredan el
 * og:title de la home y comparten la home mires donde mires.
 *
 * El og:url y el canonical van en app.vue, que es quien conoce la ruta actual.
 */
export function useSeo(page: { title: string, description: string }) {
  useSeoMeta({
    title: page.title,
    description: page.description,
    // El <title> lleva el titleTemplate de app.vue; el og:title no, así que se compone aquí.
    ogTitle: `${page.title} · ${siteName}`,
    ogDescription: page.description,
    ogType: 'website',
    ogLocale: 'es_ES',
    twitterCard: 'summary'
  })
}
