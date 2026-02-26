import { defineRouter } from '#q-app/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'

// ✅ Add this import:
import { useUserStore } from 'stores/userStore'

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  // ✅ Add this global navigation guard:
  Router.beforeEach(async (to, from, next) => {
    const userStore = useUserStore()

    // Load user info if not loaded yet
    if (!userStore.userInfo) {
      await userStore.loadUserInfo()
    }

    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
    const expectedRole = to.meta.role
    const user = userStore.userInfo

    if (requiresAuth && !user) {
      // Not logged in
      return next({ name: 'LoginPage' })
    }

    if (requiresAuth && expectedRole && user?.role !== expectedRole) {
      // Wrong role
      return next({ name: 'LoginPage' }) // or a custom AccessDenied page
    }

    next()
  })

  return Router
})
