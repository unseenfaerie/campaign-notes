<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DEFAULT_ENTITY_ROUTE } from '../config/entities'
import { ApiError } from '../services/apiClient'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const username = ref('')
const password = ref('')
const errorMessage = ref('')
const submitting = ref(false)

async function submitLogin() {
  errorMessage.value = ''
  submitting.value = true

  try {
    await auth.login(username.value, password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : `/${DEFAULT_ENTITY_ROUTE}`
    await router.push(redirect)
  } catch (error) {
    if (error instanceof ApiError) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Login failed unexpectedly.'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="login-card">
    <h2>Sign In</h2>
    <p>Welcome to Ash's AD&D Campaign Wiki!</p>

    <form @submit.prevent="submitLogin">
      <div class="form-row">
        <label for="username">Username</label>
        <input id="username" v-model="username" type="text" autocomplete="username" required />
      </div>

      <div class="form-row">
        <label for="password">Password</label>
        <input id="password" v-model="password" type="password" autocomplete="current-password" required />
      </div>

      <button class="primary-button" type="submit" :disabled="submitting">
        {{ submitting ? 'Signing in...' : 'Sign in' }}
      </button>
    </form>

    <p v-if="errorMessage" class="status-card error" style="margin-top: 0.85rem">{{ errorMessage }}</p>
  </section>
</template>
