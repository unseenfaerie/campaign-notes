import { createRouter, createWebHistory } from 'vue-router'
import { DEFAULT_ENTITY_ROUTE, isKnownEntityRoute } from '../config/entities'
import { useAuthStore } from '../stores/auth'
import EntityDetailView from '../views/EntityDetailView.vue'
import EntityListView from '../views/EntityListView.vue'
import LoginView from '../views/LoginView.vue'
import NotFoundView from '../views/NotFoundView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      redirect: `/${DEFAULT_ENTITY_ROUTE}`,
    },
    {
      path: '/:entityRoute/:id',
      name: 'entity-detail',
      component: EntityDetailView,
      props: (route) => ({
        entityRoute: String(route.params.entityRoute),
        id: String(route.params.id),
      }),
    },
    {
      path: '/:entityRoute',
      name: 'entity-list',
      component: EntityListView,
      props: (route) => ({
        entityRoute: String(route.params.entityRoute),
      }),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
      meta: { requiresAuth: false },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.initialized.value) {
    await auth.bootstrap()
  }

  if (to.name === 'login' && auth.isAuthenticated.value) {
    const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : `/${DEFAULT_ENTITY_ROUTE}`
    return redirect
  }

  if (to.meta.requiresAuth === false) {
    return true
  }

  if (!auth.isAuthenticated.value) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  if ((to.name === 'entity-list' || to.name === 'entity-detail') && !isKnownEntityRoute(String(to.params.entityRoute))) {
    return { name: 'not-found' }
  }

  return true
})

export default router
