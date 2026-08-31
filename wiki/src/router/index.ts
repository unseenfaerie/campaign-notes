import { createRouter, createWebHistory } from 'vue-router'
import { getDefaultEntityRoute, getEntitySchemas } from '../services/metaService'
import { useAuthStore } from '../stores/auth'
import AdminUserCreateView from '../views/AdminUserCreateView.vue'
import AdminUserDetailView from '../views/AdminUserDetailView.vue'
import AdminUsersView from '../views/AdminUsersView.vue'
import EntityCreateView from '../views/EntityCreateView.vue'
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
            name: 'home',
            component: EntityListView,
            props: { entityRoute: '' },
        },
        {
            path: '/:entityRoute/new',
            name: 'entity-create',
            component: EntityCreateView,
            props: (route) => ({
                entityRoute: String(route.params.entityRoute),
            }),
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
            path: '/admin/users',
            name: 'admin-users',
            component: AdminUsersView,
            meta: { requiresAdmin: true },
        },
        {
            path: '/admin/users/new',
            name: 'admin-user-create',
            component: AdminUserCreateView,
            meta: { requiresAdmin: true },
        },
        {
            path: '/admin/users/:userId',
            name: 'admin-user-detail',
            component: AdminUserDetailView,
            props: (route) => ({
                userId: String(route.params.userId),
            }),
            meta: { requiresAdmin: true },
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

    if (to.name === 'home') {
        if (!auth.isAuthenticated.value) {
            return {
                name: 'login',
                query: { redirect: to.fullPath },
            }
        }

        return { path: `/${await getDefaultEntityRoute()}` }
    }

    if (to.name === 'login' && auth.isAuthenticated.value) {
        const defaultEntityRoute = await getDefaultEntityRoute()
        const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : `/${defaultEntityRoute}`
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

    const entityRouteNames = ['entity-list', 'entity-detail', 'entity-create']
    if (entityRouteNames.includes(String(to.name))) {
        const schemas = await getEntitySchemas()
        const isKnownRoute = schemas.entities.some((entity) => entity.route === String(to.params.entityRoute))
        if (!isKnownRoute) {
            return { name: 'not-found' }
        }
    }

    if (to.name === 'entity-create' && !auth.isAdmin.value) {
        return { name: 'entity-list', params: { entityRoute: String(to.params.entityRoute) } }
    }

    if (to.meta.requiresAdmin && !auth.isAdmin.value) {
        return { path: `/${await getDefaultEntityRoute()}` }
    }

    return true
})

export default router
