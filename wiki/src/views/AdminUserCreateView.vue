<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import SearchableSelect from '../components/SearchableSelect.vue'
import { createUser, type AdminUserRole } from '../services/adminService'

const router = useRouter()

const submitting = ref(false)
const errorMessage = ref('')

const id = ref('')
const username = ref('')
const password = ref('')
const role = ref<AdminUserRole>('player')

async function submitCreate() {
  errorMessage.value = ''
  submitting.value = true

  try {
    const trimmedId = id.value.trim()
    const trimmedUsername = username.value.trim()

    if (!trimmedId || !trimmedUsername || !password.value) {
      throw new Error('ID, username, and password are all required.')
    }
    if (password.value.length < 8) {
      throw new Error('Password must be at least 8 characters.')
    }

    const created = await createUser({
      id: trimmedId,
      username: trimmedUsername,
      password: password.value,
      role: role.value,
    })

    await router.push({ name: 'admin-user-detail', params: { userId: created.id } })
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Could not create the user.'
    }
  } finally {
    submitting.value = false
  }
}

function cancelCreate() {
  router.push({ name: 'admin-users' })
}
</script>

<template>
  <section>
    <header class="view-header">
      <h2>Add User</h2>
      <p>
        <RouterLink :to="{ name: 'admin-users' }">Back to all users</RouterLink>
      </p>
    </header>

    <form class="wiki-article entity-form" @submit.prevent="submitCreate">
      <div class="form-row">
        <label for="new-user-id">User ID <span class="required-marker" aria-hidden="true">*</span></label>
        <input id="new-user-id" v-model="id" type="text" required />
        <p class="field-hint">Unique, permanent identifier (e.g. "player-two"). Cannot be changed later.</p>
      </div>

      <div class="form-row">
        <label for="new-username">Username <span class="required-marker" aria-hidden="true">*</span></label>
        <input id="new-username" v-model="username" type="text" required />
        <p class="field-hint">Used to log in. Can be changed later.</p>
      </div>

      <div class="form-row">
        <label for="new-password">Password <span class="required-marker" aria-hidden="true">*</span></label>
        <input id="new-password" v-model="password" type="password" required minlength="8" />
        <p class="field-hint">At least 8 characters.</p>
      </div>

      <div class="form-row">
        <label for="new-role">Role</label>
        <SearchableSelect
          id="new-role"
          v-model="role"
          :options="[
            { value: 'player', label: 'Player' },
            { value: 'viewer', label: 'Viewer' },
            { value: 'dm', label: 'DM' },
          ]"
        />
      </div>

      <div class="form-actions">
        <button class="primary-button" type="submit" :disabled="submitting">
          {{ submitting ? 'Adding...' : 'Add user' }}
        </button>
        <button class="secondary-button" type="button" :disabled="submitting" @click="cancelCreate">Cancel</button>
      </div>

      <p v-if="errorMessage" class="status-card error">{{ errorMessage }}</p>
    </form>
  </section>
</template>

<style scoped>
.entity-form select {
  border: 1px solid var(--line);
  background: var(--paper);
  border-radius: var(--radius-sm);
  font: inherit;
  padding: 0.62rem 0.72rem;
}
</style>
