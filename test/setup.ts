import { beforeEach } from 'vitest'
import { authKey } from '../app/utils/auth'

// The global middleware sends you to /login while there is no session, so page tests would
// mount the sign-in screen instead of their own page: they all start with an open session.
// `test/login.spec.ts` clears it on its own, which is exactly what it is testing.
// Tests that never touch the DOM (`test/merge-content.spec.ts`) run without localStorage.
beforeEach(() => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(authKey, 'ok')
  }
})
