// The front door of the site: the credentials it checks against and a session mark in the
// browser localStorage, with the same guards as progress for the prerender and for tests
// with no DOM.
//
// ponytail: the stored session is a plain mark, neither signed nor encrypted, and the
// credentials travel in the bundle because the site is static and there is no server to hide
// them in. Anyone opening the DevTools can read them and write the mark by hand, so a fake
// token would only add code without adding security. This is a gate, not authentication: a
// real session needs a server that validates and signs a cookie (a Cloudflare Pages Function
// or a Worker), and that is the upgrade path the day it is needed.

// The full name (and not just `storageKey`) because the files in `app/utils` are all
// autoimported together and progress already uses that name.
export const authKey = 'ingles:auth'

/** Without localStorage (prerender or a test with no DOM) there is no session: the gate is closed. */
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
    // With nowhere to store it (Safari private mode, full storage) the session does not
    // persist: on reload you have to sign in again.
  }
}

export function signOut() {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.removeItem(authKey)
}

/** SHA-256 in hex with the browser Web Crypto, which is native and needs no library. */
export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))

  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * The credentials from `runtimeConfig.public`. Only the SHA-256 of the password is stored:
 * it is not security (brute force against a known hash still works), but it keeps it from
 * being literally written in the bundle.
 */
export async function checkCredentials(user: string, password: string): Promise<boolean> {
  const { authUser, authPasswordHash } = useRuntimeConfig().public

  return user === authUser && await sha256(password) === authPasswordHash
}
