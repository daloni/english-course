import { beforeAll, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { RouteLocationNormalized } from 'vue-router'
import Login from '../app/pages/login.vue'
import DefaultLayout from '../app/layouts/default.vue'
import middleware from '../app/middleware/auth.global'
import { authKey, checkCredentials, isAuthenticated, sha256, signIn, signOut } from '../app/utils/auth'

const user = 'usuario-de-prueba'
const password = 'contrasena-de-prueba'

const { navigateTo } = vi.hoisted(() => ({ navigateTo: vi.fn() }))

mockNuxtImport('navigateTo', () => navigateTo)

// The gate is checked against credentials of this test, not against the ones the site is
// configured with: changing the password of the site cannot break the tests of the door. The
// hash is computed here, the same SHA-256 the .env carries, for a password that lives nowhere
// else.
const config = () => useRuntimeConfig().public

beforeAll(async () => {
  Object.assign(config(), { authUser: user, authPasswordHash: await sha256(password) })
})

/** What the global middleware does on entering a route, without mounting the whole router. */
const visit = (path: string) =>
  (middleware as (to: RouteLocationNormalized, from: RouteLocationNormalized) => unknown)(
    { path, fullPath: path } as RouteLocationNormalized,
    { path: '/', fullPath: '/' } as RouteLocationNormalized
  )

/**
 * The Turnstile widget does not exist in Vitest: it is replaced by one that hands back the
 * token as soon as it renders, which is what the real one does once the captcha resolves.
 */
function fakeTurnstile(token = 'turnstile-token') {
  Object.assign(window, {
    turnstile: {
      render: (_element: HTMLElement, options: { callback: (token: string) => void }) => options.callback(token)
    }
  })
}

beforeEach(() => {
  localStorage.clear()
  navigateTo.mockClear()
  Reflect.deleteProperty(window, 'turnstile')
})

describe('la sesión', () => {
  it('empieza cerrada, se abre al entrar y se cierra al salir', () => {
    expect(isAuthenticated()).toBe(false)

    signIn()
    expect(localStorage.getItem(authKey)).toBe('ok')
    // It survives a reload: what is read is localStorage, not some state in memory.
    expect(isAuthenticated()).toBe(true)

    signOut()
    expect(localStorage.getItem(authKey)).toBe(null)
    expect(isAuthenticated()).toBe(false)
  })

  it('no acepta cualquier cosa guardada en su clave', () => {
    localStorage.setItem(authKey, 'no')

    expect(isAuthenticated()).toBe(false)
  })
})

describe('las credenciales', () => {
  it('acepta el usuario y la contraseña configurados', async () => {
    await expect(checkCredentials(user, password)).resolves.toBe(true)
  })

  it('rechaza la contraseña equivocada y el usuario equivocado', async () => {
    await expect(checkCredentials(user, 'otra')).resolves.toBe(false)
    await expect(checkCredentials('otro', password)).resolves.toBe(false)
    await expect(checkCredentials('', '')).resolves.toBe(false)
  })

  // The password is never written in the clear, neither here nor in the .env: what is
  // configured and what is compared is its digest. The known vector pins the digest itself.
  it('compares the password against its SHA-256', async () => {
    expect(config().authPasswordHash).not.toContain(password)
    await expect(sha256(password)).resolves.toBe(config().authPasswordHash)
    await expect(sha256('abc')).resolves
      .toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})

describe('el middleware', () => {
  it('manda a /login sin sesión, guardando a dónde se iba', () => {
    visit('/frases')

    expect(navigateTo).toHaveBeenCalledWith({ path: '/login', query: { redirect: '/frases' } })
  })

  it('deja pasar con sesión', () => {
    signIn()
    visit('/frases')

    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('deja pasar al propio /login, que si no sería un bucle', () => {
    visit('/login')

    expect(navigateTo).not.toHaveBeenCalled()
  })
})

describe('/login', () => {
  it('no deja enviar el formulario hasta que Turnstile devuelve token', async () => {
    // Without `window.turnstile` (a browser that does not load the script, or this very test)
    // the page has to mount all the same, only with no widget.
    const page = await mountSuspended(Login)

    expect(page.find('button[type="submit"]').attributes('disabled')).toBeDefined()

    fakeTurnstile()
    const withWidget = await mountSuspended(Login)
    await flushPromises()

    expect(withWidget.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('permite entrar si Turnstile no carga en cinco segundos', async () => {
    vi.useFakeTimers()
    const page = await mountSuspended(Login)

    onTestFinished(() => {
      page.unmount()
      vi.useRealTimers()
    })

    expect(page.find('button[type="submit"]').attributes('disabled')).toBeDefined()

    await vi.advanceTimersByTimeAsync(5000)

    expect(page.text()).toContain('El captcha no se ha podido cargar')
    expect(page.find('button[type="submit"]').attributes('disabled')).toBeUndefined()

    await page.findAll('input')[0]!.setValue(user)
    await page.findAll('input')[1]!.setValue(password)
    await page.find('form').trigger('submit')
    await vi.waitFor(() => expect(navigateTo).toHaveBeenCalledWith('/'))

    expect(isAuthenticated()).toBe(true)
  })

  it('entra con las credenciales correctas y vuelve a donde se iba', async () => {
    fakeTurnstile()
    const page = await mountSuspended(Login, { route: '/login?redirect=/frases' })
    await flushPromises()

    await page.findAll('input')[0]!.setValue(user)
    await page.findAll('input')[1]!.setValue(password)
    await page.find('form').trigger('submit')
    // The password hash is computed off the event loop: the result has to be waited for.
    await vi.waitFor(() => expect(navigateTo).toHaveBeenCalledWith('/frases'))

    expect(isAuthenticated()).toBe(true)
  })

  it('no acepta un redirect a otro sitio', async () => {
    fakeTurnstile()
    const page = await mountSuspended(Login, { route: '/login?redirect=//malo.example' })
    await flushPromises()

    await page.findAll('input')[0]!.setValue(user)
    await page.findAll('input')[1]!.setValue(password)
    await page.find('form').trigger('submit')

    await vi.waitFor(() => expect(navigateTo).toHaveBeenCalledWith('/'))
  })

  it('avisa del error con las credenciales equivocadas y no abre la sesión', async () => {
    fakeTurnstile()
    const page = await mountSuspended(Login, { route: '/login' })
    await flushPromises()
    // Mounting the page has already navigated to /login: what is looked at next is the form.
    navigateTo.mockClear()

    await page.findAll('input')[0]!.setValue(user)
    await page.findAll('input')[1]!.setValue('la que no es')
    await page.find('form').trigger('submit')

    await vi.waitFor(() => expect(page.find('[aria-live="polite"]').text()).toContain('no son correctos'))
    expect(isAuthenticated()).toBe(false)
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('etiqueta sus dos campos', async () => {
    const page = await mountSuspended(Login)

    for (const input of page.findAll('input')) {
      const id = input.attributes('id')

      expect(id, 'input sin id que etiquetar').toBeDefined()
      expect(page.find(`label[for="${id}"]`).text(), 'input sin nombre accesible').not.toBe('')
    }

    expect(page.findAll('input')[1]!.attributes('type')).toBe('password')
  })
})

describe('la cabecera', () => {
  it('cierra la sesión y vuelve a /login desde el botón de salir', async () => {
    signIn()
    const layout = await mountSuspended(DefaultLayout)

    const leave = layout.findAll('button').find(button => button.text() === 'Salir')!

    await leave.trigger('click')

    expect(isAuthenticated()).toBe(false)
    expect(navigateTo).toHaveBeenCalledWith('/login')
  })
})
