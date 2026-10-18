<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { getEntitySchemas, type EntitySchema } from './services/metaService'
import { listSelectableCharacters, type SelectableCharacter } from './services/authService'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const entitySchemas = ref<EntitySchema[]>([])
const selectableCharacters = ref<SelectableCharacter[]>([])
const navOpen = ref(true)
const compactNavQuery = '(max-width: 980px)'
let compactNavMediaQuery: MediaQueryList | null = null

const showShell = computed(() => auth.isAuthenticated.value && route.name !== 'login')
const navigationEntities = computed(() => entitySchemas.value.filter((entity) => entity.navigation))

function characterLabel(character: SelectableCharacter): string {
  return character.name?.trim() ? character.name : character.id
}

const viewingCharacterOptions = computed(() => {
  return selectableCharacters.value
    .map((character) => ({ id: character.id, label: characterLabel(character) }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

const showViewingCharacterSelect = computed(() => auth.isAdmin.value || viewingCharacterOptions.value.length > 0)

const viewingCharacterSelection = computed(() => auth.viewingCharacterId.value ?? '')

// Force a full reload so no page keeps showing data fetched under the previous perspective.
function handleViewingCharacterChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  auth.setViewingCharacterId(value || null)
  window.location.reload()
}

watch(() => auth.isAuthenticated.value, async (isAuthenticated) => {
  if (!isAuthenticated) {
    entitySchemas.value = []
    selectableCharacters.value = []
    return
  }

  entitySchemas.value = (await getEntitySchemas()).entities
  selectableCharacters.value = await listSelectableCharacters()
}, { immediate: true })

async function handleLogout() {
  await auth.logout()
  await router.push({ name: 'login' })
}

function updateNavForLayout(mediaQuery: MediaQueryList | MediaQueryListEvent) {
  navOpen.value = !mediaQuery.matches
}

function handleNavToggle(event: Event) {
  navOpen.value = (event.currentTarget as HTMLDetailsElement).open
}

onMounted(() => {
  compactNavMediaQuery = window.matchMedia(compactNavQuery)
  updateNavForLayout(compactNavMediaQuery)
  compactNavMediaQuery.addEventListener('change', updateNavForLayout)
})

onBeforeUnmount(() => {
  compactNavMediaQuery?.removeEventListener('change', updateNavForLayout)
})
</script>

<template>
  <div class="app-root">
    <div v-if="showShell" class="app-shell">
      <aside class="left-nav">
        <header>
          <p class="nav-kicker">Campaign Wiki</p>
          <h1>Digital Daercon</h1>
          <p class="nav-user">Signed in as {{ auth.user.value?.username }}</p>
          <div v-if="showViewingCharacterSelect" class="viewing-character-field">
            <label for="viewing-character-select">Browsing as</label>
            <select id="viewing-character-select" :value="viewingCharacterSelection" @change="handleViewingCharacterChange">
              <option v-if="auth.isAdmin.value" value="">Omniscient (DM)</option>
              <option v-for="option in viewingCharacterOptions" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
          </div>
          <button class="logout-button" type="button" @click="handleLogout">Logout</button>
        </header>

        <details class="nav-panel" :open="navOpen" @toggle="handleNavToggle">
          <summary>Navigation</summary>
          <div class="nav-panel-body">
            <nav aria-label="Entity navigation" class="nav-links">
              <RouterLink to="/" class="nav-link">Home</RouterLink>
              <RouterLink
                v-for="entity in navigationEntities"
                :key="entity.route"
                :to="`/${entity.route}`"
                class="nav-link"
              >
                {{ entity.label }}
              </RouterLink>
            </nav>

            <nav v-if="auth.isAdmin.value" aria-label="Admin navigation" class="nav-links admin-nav">
              <RouterLink :to="{ name: 'proposal-inbox' }" class="nav-link">Proposal Inbox</RouterLink>
              <RouterLink :to="{ name: 'admin-users' }" class="nav-link">Manage Users</RouterLink>
            </nav>
          </div>
        </details>

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
