export default defineNuxtRouteMiddleware((to) => {
  // Durante el prerender no hay navegador ni sesión: si el middleware redirige aquí, cada
  // página se genera como un redirect a /login, el crawler no encuentra enlaces que seguir
  // y `failOnError` tumba el build. La puerta es solo de cliente, a propósito.
  if (import.meta.server || to.path === '/login' || isAuthenticated()) {
    return
  }

  return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
})
