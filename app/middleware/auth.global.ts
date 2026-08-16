export default defineNuxtRouteMiddleware((to) => {
  // During the prerender there is no browser and no session: if the middleware redirected
  // here, every page would be generated as a redirect to /login, the crawler would find no
  // links to follow and `failOnError` would bring the build down. The gate is client only,
  // on purpose.
  if (import.meta.server || to.path === '/login' || isAuthenticated()) {
    return
  }

  return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
})
