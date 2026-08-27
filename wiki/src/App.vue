<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { ENTITY_ROUTES } from './config/entities'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const showShell = computed(() => auth.isAuthenticated.value && route.name !== 'login')

async function handleLogout() {
  await auth.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <div class="app-root">
    <div v-if="showShell" class="app-shell">
      <aside class="left-nav">
        <header>
          <p class="nav-kicker">Campaign Notes</p>
          <h1>World Wiki</h1>
          <p class="nav-user">Signed in as {{ auth.user.value?.username }}</p>
        </header>

        <nav aria-label="Entity navigation" class="nav-links">
          <RouterLink
            v-for="entity in ENTITY_ROUTES"
            :key="entity.route"
            :to="`/${entity.route}`"
            class="nav-link"
          >
            {{ entity.label }}
          </RouterLink>
        </nav>

        <nav v-if="auth.isAdmin.value" aria-label="Admin navigation" class="nav-links admin-nav">
          <RouterLink :to="{ name: 'admin-users' }" class="nav-link">Manage Users</RouterLink>
        </nav>

        <button class="logout-button" type="button" @click="handleLogout">Logout</button>
      </aside>

      <main class="content-area">
        <RouterView />
      </main>
    </div>

    <div v-else class="public-shell">
      <RouterView />
    </div>
  </div>
</template>
