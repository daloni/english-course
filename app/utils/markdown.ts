import { Marked } from 'marked'

/**
 * Allowlist of link destinations: absolute http(s), mailto, and links inside the site
 * (`/teoria/...`, `#anchor`, `?query`). Everything else — `javascript:`, `data:`, `vbscript:`
 * or any other scheme — would run or load in the origin of the course when a student clicks
 * the link, so it never becomes an anchor.
 */
const allowedUrl = /^(?:https?:\/\/|mailto:|[/#?])/i

/**
 * A browser ignores control characters and spaces inside a URL, so "java\tscript:" runs: they
 * are removed before checking. Case does not matter, and an entity-encoded scheme
 * ("&#106;avascript:") is left as is because it never matches the allowlist either.
 */
export function isSafeUrl(url: string): boolean {
  // eslint-disable-next-line no-control-regex -- stripping the control characters is the point
  return allowedUrl.test(url.replace(/[\u0000-\u0020\u007F-\u009F]/g, ''))
}

const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\u0027': '&#39;'
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, character => htmlEntities[character] ?? character)

// Returning false from a renderer method falls back to the default renderer of marked.
const renderer = new Marked({
  renderer: {
    /** Raw HTML is displayed as text, so content cannot add executable DOM. */
    html({ text }) {
      return escapeHtml(text)
    },
    /** An unsafe link keeps its text without the anchor: inert, and nothing disappears. */
    link(token) {
      return isSafeUrl(token.href) ? false : this.parser.parseInline(token.tokens)
    },
    /** Same policy for images: an unsafe source is replaced by its alt text. */
    image(token) {
      return isSafeUrl(token.href) ? false : this.parser.parseInline(token.tokens ?? [])
    }
  }
})

/**
 * Renders the Markdown of content/ (theory and readings) as HTML for v-html. Raw HTML in the
 * content is escaped here; the content tests reject it earlier as a CI guard. Links and images
 * also go through a scheme allowlist because Markdown alone can turn their URLs executable.
 */
export const renderMarkdown = (markdown: string) => renderer.parse(markdown, { async: false })
