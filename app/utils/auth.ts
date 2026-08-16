// La puerta de entrada a la web: usuario y contraseña por defecto y una marca de sesión en
// el localStorage del navegador, con las mismas guardas que el progreso para el prerender y
// los tests sin DOM.
//
// ponytail: la sesión guardada es una marca simple, sin firmar ni cifrar, y las credenciales
// viajan en el bundle porque el sitio es estático y no hay servidor donde esconderlas. Quien
// abra las DevTools puede leerlas y escribir la marca a mano, así que un token falso solo
// añadiría código sin añadir seguridad. Esto es una puerta, no autenticación: una sesión de
// verdad necesita un servidor que valide y firme una cookie (Cloudflare Pages Function o
// Worker), y ese es el camino de subida el día que haga falta.

// El nombre completo (y no `storageKey` a secas) porque los ficheros de `app/utils` se
// autoimportan todos juntos y el progreso ya usa ese nombre.
export const authKey = 'ingles:auth'

/** Sin localStorage (prerender o un test sin DOM) no hay sesión: la puerta está cerrada. */
export function isAuthenticated(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(authKey) === 'ok'
}

export function signIn() {
  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    localStorage.setItem(authKey, 'ok')
  } catch {
    // Sin sitio donde guardar (modo privado de Safari, almacenamiento lleno) la sesión no
    // persiste: al recargar habrá que volver a entrar.
  }
}

export function signOut() {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.removeItem(authKey)
}

/** SHA-256 en hexadecimal con la Web Crypto del navegador, que es nativa y no pide librería. */
export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))

  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Las credenciales de `runtimeConfig.public`. De la contraseña solo se guarda su SHA-256:
 * no es seguridad (sigue siendo fuerza bruta contra un hash conocido), pero evita que esté
 * literalmente escrita en el bundle.
 */
export async function checkCredentials(user: string, password: string): Promise<boolean> {
  const { authUser, authPasswordHash } = useRuntimeConfig().public

  return user === authUser && await sha256(password) === authPasswordHash
}
