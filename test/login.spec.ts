import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { RouteLocationNormalized } from 'vue-router'
import Login from '../app/pages/login.vue'
import DefaultLayout from '../app/layouts/default.vue'
import middleware from '../app/middleware/auth.global'
import { authKey, checkCredentials, isAuthenticated, sha256, signIn, signOut } from '../app/utils/auth'

const user = 'alumno'
const password = 'ingles2026'

const { navigateTo } = vi.hoisted(() => ({ navigateTo: vi.fn() }))

mockNuxtImport('navigateTo', () => navigateTo)

/** Lo que hace el middleware global al entrar en una ruta, sin montar el router entero. */
const visit = (path: string) =>
  (middleware as (to: RouteLocationNormalized, from: RouteLocationNormalized) => unknown)(
    { path, fullPath: path } as RouteLocationNormalized,
    { path: '/', fullPath: '/' } as RouteLocationNormalized
  )

/**
 * El widget de Turnstile no existe en Vitest: se sustituye por uno que devuelve el token en
 * cuanto se pinta, que es lo que hace el de verdad al resolverse el captcha.
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
    // Sobrevive a recargar: lo que se lee es el localStorage, no un estado en memoria.
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
  it('acepta el usuario y la contraseña por defecto', async () => {
    await expect(checkCredentials(user, password)).resolves.toBe(true)
  })

  it('rechaza la contraseña equivocada y el usuario equivocado', async () => {
    await expect(checkCredentials(user, 'otra')).resolves.toBe(false)
    await expect(checkCredentials('otro', password)).resolves.toBe(false)
    await expect(checkCredentials('', '')).resolves.toBe(false)
  })

  // La contraseña no está escrita en claro en el repo: lo que se compara es su hash.
  it('compares the password against its SHA-256', async () => {
    await expect(sha256(password)).resolves.toBe('6bbd88e8c327bb10d12f274a514e1c87024f4971fa724bdcd752271f2873b953')
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
    // Sin `window.turnstile` (un navegador que no carga el script, o este mismo test) la
    // página tiene que montar igual, solo que sin widget.
    const page = await mountSuspended(Login)

    expect(page.find('button[type="submit"]').attributes('disabled')).toBeDefined()

    fakeTurnstile()
    const withWidget = await mountSuspended(Login)
    await flushPromises()

    expect(withWidget.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('entra con las credenciales correctas y vuelve a donde se iba', async () => {
    fakeTurnstile()
    const page = await mountSuspended(Login, { route: '/login?redirect=/frases' })
    await flushPromises()

    await page.findAll('input')[0]!.setValue(user)
    await page.findAll('input')[1]!.setValue(password)
    await page.find('form').trigger('submit')
    // El hash de la contraseña se calcula fuera del bucle de eventos: se espera al resultado.
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
    // Montar la página ya ha navegado a /login: lo que se mire después es del formulario.
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
