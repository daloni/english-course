import { beforeEach } from 'vitest'
import { authKey } from '../app/utils/auth'

// El middleware global manda a /login mientras no haya sesión, así que los tests de página
// montarían la pantalla de acceso en vez de lo suyo: todos arrancan con la sesión abierta.
// `test/login.spec.ts` la borra por su cuenta, que es justo lo que prueba.
// Los tests que no tocan el DOM (`test/merge-content.spec.ts`) corren sin localStorage.
beforeEach(() => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(authKey, 'ok')
  }
})
