<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ApiError } from '../services/apiClient'
import { listUsers, type AdminUser } from '../services/adminService'

const loading = ref(true)
const errorMessage = ref('')
const users = ref<AdminUser[]>([])

async function loadUsers() {
  loading.value = true
  errorMessage.value = ''

  try {
    users.value = await listUsers()
  } catch (error) {
    if (error instanceof ApiError) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Could not load users.'
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadUsers)
</script>

<template>
  <section>
    <header class="view-header list-header">
      <h2>Manage Users</h2>
      <RouterLink class="create-button" :to="{ name: 'admin-user-create' }">Add user</RouterLink>
    </header>

    <p v-if="loading" class="status-card">Loading users...</p>
    <p v-else-if="errorMessage" class="status-card error">{{ errorMessage }}</p>
    <p v-else-if="users.length === 0" class="status-card">No users found.</p>

    <div v-else class="grid-list user-list">
      <article v-for="user in users" :key="user.id" class="entity-card user-card">
        <h3>
          {{ user.username }}
          <span class="badge role-badge">{{ user.role }}</span>
          <span v-if="user.disabled" class="badge disabled-badge">disabled</span>
        </h3>
        <p>
          <RouterLink :to="{ name: 'admin-user-detail', params: { userId: user.id } }">Manage</RouterLink>
        </p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.user-list {
  margin-top: 1rem;
}

.role-badge {
  margin-left: 0.4rem;
  text-transform: uppercase;
}

.disabled-badge {
  margin-left: 0.3rem;
  color: var(--warning);
  border-color: rgba(155, 47, 31, 0.46);
}
</style>
