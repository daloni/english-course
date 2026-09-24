/**
 * The SEO of a page: its title and its description, also in the card WhatsApp, Slack or
 * Twitter show when the link is shared. Without this every page inherits the og:title of the
 * home and shares the home wherever you look.
 *
 * The og:url and the canonical live in app.vue, which is the one that knows the current route.
 */
export function useSeo(page: { title: string, description: string, noindex?: boolean, jsonLd?: object | object[] }) {
  const { siteName } = useRuntimeConfig().public

  useSeoMeta({
    title: page.title,
    description: page.description,
    // The <title> gets the titleTemplate from app.vue; the og:title does not, so it is
    // composed here.
    ogTitle: `${page.title} · ${siteName}`,
    ogDescription: page.description,
    ogType: 'website',
    ogLocale: 'es_ES',
    twitterCard: 'summary_large_image',
    // Personal or ephemeral pages: built in the browser, thin and duplicate as prerendered HTML.
    ...(page.noindex && { robots: 'noindex, follow' })
  })

  if (page.jsonLd) {
    // `<` is escaped so content can never close the script tag.
    const data = Array.isArray(page.jsonLd) ? page.jsonLd : [page.jsonLd]
    useHead({ script: data.map(item => ({ type: 'application/ld+json', innerHTML: JSON.stringify(item).replace(/</g, '\\u003c') })) })
  }
}
