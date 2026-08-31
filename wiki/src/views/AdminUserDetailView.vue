<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ApiError } from '../services/apiClient'
import {
  anchorCharacter,
  deleteUser,
  listAllCharacterAnchors,
  listUserCharacterAnchors,
  listUsers,
  unanchorCharacter,
  updateUser,
  type AdminUser,
  type AdminUserRole,
  type CharacterAnchor,
} from '../services/adminService'
import { listEntities, type DomainEntity } from '../services/domainService'
import { useAuthStore } from '../stores/auth'
import SearchableSelect from '../components/SearchableSelect.vue'

const props = defineProps<{
  userId: string
}>()

const router = useRouter()
const auth = useAuthStore()

const loading = ref(true)
const errorMessage = ref('')
const user = ref<AdminUser | null>(null)
const userAnchors = ref<CharacterAnchor[]>([])
const allAnchors = ref<CharacterAnchor[]>([])
const usersById = ref<Record<string, string>>({})
const charactersById = ref<Record<string, DomainEntity>>({})

const detailForm = ref({ username: '', role: 'player' as AdminUserRole, disabled: false })
const detailSaving = ref(false)
const detailMessage = ref('')
const detailError = ref('')

const newPassword = ref('')
const confirmPassword = ref('')
const passwordSaving = ref(false)
const passwordMessage = ref('')
const passwordError = ref('')

const selectedCharacterId = ref('')
const anchorSaving = ref(false)
const anchorError = ref('')

const deleting = ref(false)
const deleteError = ref('')

const isSelf = computed(() => auth.user.value?.id === props.userId)

const userCharacters = computed(() => {
  return userAnchors.value
    .map((anchor) => charactersById.value[anchor.character_id])
    .filter((character): character is DomainEntity => Boolean(character))
    .sort((a, b) => characterName(a).localeCompare(characterName(b)))
})

const assignableCharacters = computed(() => {
  const anchoredElsewhere = new Map<string, string>()
  for (const anchor of allAnchors.value) {
    if (anchor.user_id !== props.userId) {
      anchoredElsewhere.set(anchor.character_id, anchor.user_id)
    }
  }

  return Object.values(charactersById.value)
    .filter((character) => character.player_character === true)
    .filter((character) => !userAnchors.value.some((anchor) => anchor.character_id === character.id))
    .map((character) => {
      const otherUserId = anchoredElsewhere.get(String(character.id))
      const otherUsername = otherUserId ? usersById.value[otherUserId] : undefined
      return {
        id: String(character.id),
        name: characterName(character),
        anchoredTo: otherUsername,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
})

function characterName(character: DomainEntity): string {
  if (typeof character.name === 'string' && character.name.trim()) {
    return character.name
  }
  return String(character.id)
}

async function loadAll() {
  loading.value = true
  errorMessage.value = ''
  detailMessage.value = ''
  passwordMessage.value = ''

  try {
    const [users, anchors, allCharacterAnchors, characters] = await Promise.all([
      listUsers(),
      listUserCharacterAnchors(props.userId),
      listAllCharacterAnchors(),
      listEntities('characters'),
    ])

    const found = users.find((candidate) => candidate.id === props.userId)
    if (!found) {
      errorMessage.value = `No user found with ID "${props.userId}".`
      return
    }

    user.value = found
    userAnchors.value = anchors
    allAnchors.value = allCharacterAnchors

    usersById.value = Object.fromEntries(users.map((entry) => [entry.id, entry.username]))
    charactersById.value = Object.fromEntries(characters.map((character) => [String(character.id), character]))

    detailForm.value = {
      username: found.username,
      role: found.role,
      disabled: found.disabled,
    }
  } catch (error) {
    if (error instanceof ApiError) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Could not load the user.'
    }
  } finally {
    loading.value = false
  }
}

async function saveDetails() {
  detailError.value = ''
  detailMessage.value = ''
  detailSaving.value = true

  try {
    const username = detailForm.value.username.trim()
    if (!username) {
      throw new Error('Username is required.')
    }

    const updated = await updateUser(props.userId, {
      username,
      role: detailForm.value.role,
      disabled: detailForm.value.disabled,
    })

    user.value = updated
    usersById.value = { ...usersById.value, [updated.id]: updated.username }
    detailMessage.value = 'Saved.'
  } catch (error) {
    if (error instanceof Error) {
      detailError.value = error.message
    } else {
      detailError.value = 'Could not save changes.'
    }
  } finally {
    detailSaving.value = false
  }
}

async function savePassword() {
  passwordError.value = ''
  passwordMessage.value = ''
  passwordSaving.value = true

  try {
    if (newPassword.value.length < 8) {
      throw new Error('Password must be at least 8 characters.')
    }
    if (newPassword.value !== confirmPassword.value) {
      throw new Error('Passwords do not match.')
    }

    await updateUser(props.userId, { password: newPassword.value })

    newPassword.value = ''
    confirmPassword.value = ''
    passwordMessage.value = 'Password updated. The user has been logged out of all sessions.'
  } catch (error) {
    if (error instanceof Error) {
      passwordError.value = error.message
    } else {
      passwordError.value = 'Could not reset the password.'
    }
  } finally {
    passwordSaving.value = false
  }
}

async function assignCharacter() {
  anchorError.value = ''
  anchorSaving.value = true

  try {
    if (!selectedCharacterId.value) {
      throw new Error('Choose a character to assign.')
    }

    await anchorCharacter(props.userId, selectedCharacterId.value)

    const [anchors, allCharacterAnchors] = await Promise.all([
      listUserCharacterAnchors(props.userId),
      listAllCharacterAnchors(),
    ])
    userAnchors.value = anchors
    allAnchors.value = allCharacterAnchors
    selectedCharacterId.value = ''
  } catch (error) {
    if (error instanceof Error) {
      anchorError.value = error.message
    } else {
      anchorError.value = 'Could not assign the character.'
    }
  } finally {
    anchorSaving.value = false
  }
}

async function removeCharacter(characterId: string) {
  anchorError.value = ''

  try {
    await unanchorCharacter(props.userId, characterId)

    const [anchors, allCharacterAnchors] = await Promise.all([
      listUserCharacterAnchors(props.userId),
      listAllCharacterAnchors(),
    ])
    userAnchors.value = anchors
    allAnchors.value = allCharacterAnchors
  } catch (error) {
    if (error instanceof Error) {
      anchorError.value = error.message
    } else {
      anchorError.value = 'Could not remove the character.'
    }
  }
}

async function confirmDelete() {
  deleteError.value = ''

  if (!window.confirm(`Delete user "${user.value?.username}"? This cannot be undone.`)) {
    return
  }

  deleting.value = true

  try {
    await deleteUser(props.userId)
    await router.push({ name: 'admin-users' })
  } catch (error) {
    if (error instanceof Error) {
      deleteError.value = error.message
    } else {
      deleteError.value = 'Could not delete the user.'
    }
  } finally {
    deleting.value = false
  }
}

onMounted(loadAll)
</script>

<template>
  <section>
    <header class="view-header">
      <h2>{{ user ? user.username : 'User' }}</h2>
      <p>
        <RouterLink :to="{ name: 'admin-users' }">Back to all users</RouterLink>
      </p>
    </header>

    <p v-if="loading" class="status-card">Loading user...</p>
    <p v-else-if="errorMessage" class="status-card error">{{ errorMessage }}</p>

    <template v-else-if="user">
      <article class="wiki-article entity-form">
        <h3>Account details</h3>
        <form @submit.prevent="saveDetails">
          <div class="form-row">
            <label for="detail-username">Username <span class="required-marker" aria-hidden="true">*</span></label>
            <input id="detail-username" v-model="detailForm.username" type="text" required />
          </div>

          <div class="form-row">
            <label for="detail-role">Role</label>
            <SearchableSelect
              id="detail-role"
              v-model="detailForm.role"
              :options="[
                { value: 'player', label: 'Player' },
                { value: 'dm', label: 'DM' },
              ]"
            />
          </div>

          <div class="form-row checkbox-row">
            <input id="detail-disabled" v-model="detailForm.disabled" type="checkbox" />
            <label for="detail-disabled">Account disabled (blocks login)</label>
          </div>

          <div class="form-actions">
            <button class="primary-button" type="submit" :disabled="detailSaving">
              {{ detailSaving ? 'Saving...' : 'Save changes' }}
            </button>
          </div>

          <p v-if="detailMessage" class="status-card">{{ detailMessage }}</p>
          <p v-if="detailError" class="status-card error">{{ detailError }}</p>
        </form>
      </article>

      <article class="wiki-article entity-form">
        <h3>Reset password</h3>
        <form @submit.prevent="savePassword">
          <div class="form-row">
            <label for="new-password">New password <span class="required-marker" aria-hidden="true">*</span></label>
            <input id="new-password" v-model="newPassword" type="password" required minlength="8" />
            <p class="field-hint">At least 8 characters. The user will be logged out of all sessions.</p>
          </div>

          <div class="form-row">
            <label for="confirm-password">Confirm password <span class="required-marker" aria-hidden="true">*</span></label>
            <input id="confirm-password" v-model="confirmPassword" type="password" required />
          </div>

          <div class="form-actions">
            <button class="primary-button" type="submit" :disabled="passwordSaving">
              {{ passwordSaving ? 'Updating...' : 'Reset password' }}
            </button>
          </div>

          <p v-if="passwordMessage" class="status-card">{{ passwordMessage }}</p>
          <p v-if="passwordError" class="status-card error">{{ passwordError }}</p>
        </form>
      </article>

      <article class="wiki-article">
        <h3>Characters</h3>

        <p v-if="userCharacters.length === 0" class="article-note">No characters associated with this user.</p>

        <div v-else class="section-stack">
          <p v-for="character in userCharacters" :key="String(character.id)" class="related-record character-row">
            <RouterLink
              :to="{ name: 'entity-detail', params: { entityRoute: 'characters', id: String(character.id) } }"
            >
              {{ characterName(character) }}
            </RouterLink>
            <button class="secondary-button" type="button" @click="removeCharacter(String(character.id))">
              Remove
            </button>
          </p>
        </div>

        <form class="assign-form" @submit.prevent="assignCharacter">
          <div class="form-row">
            <label for="assign-character">Associate a character</label>
            <SearchableSelect
              id="assign-character"
              v-model="selectedCharacterId"
              :options="assignableCharacters.map((option) => ({
                value: option.id,
                label: `${option.name}${option.anchoredTo ? ` (currently: ${option.anchoredTo})` : ''}`,
              }))"
              placeholder="Choose a character..."
            />
            <p class="field-hint">
              Only player characters are listed. Assigning a character currently associated with another user moves it
              to this user.
            </p>
          </div>

          <div class="form-actions">
            <button class="primary-button" type="submit" :disabled="anchorSaving || !selectedCharacterId">
              {{ anchorSaving ? 'Assigning...' : 'Assign character' }}
            </button>
          </div>

          <p v-if="anchorError" class="status-card error">{{ anchorError }}</p>
        </form>
      </article>

      <article class="wiki-article danger-zone">
        <h3>Delete user</h3>
        <p class="article-note">
          Deleting a user removes their sessions and character associations. This cannot be undone.
        </p>
        <div class="form-actions">
          <button
            class="danger-button"
            type="button"
            :disabled="deleting || isSelf"
            :title="isSelf ? 'You cannot delete your own account.' : undefined"
            @click="confirmDelete"
          >
            {{ deleting ? 'Deleting...' : 'Delete user' }}
          </button>
        </div>
        <p v-if="isSelf" class="field-hint">You cannot delete your own account.</p>
        <p v-if="deleteError" class="status-card error">{{ deleteError }}</p>
      </article>
    </template>
  </section>
</template>

<style scoped>
.wiki-article + .wiki-article {
  margin-top: 1rem;
}

.entity-form select {
  border: 1px solid var(--line);
  background: var(--paper);
  border-radius: var(--radius-sm);
  font: inherit;
  padding: 0.62rem 0.72rem;
}

.checkbox-row {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-row label {
  font-weight: 400;
}

.character-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
}

.character-row .secondary-button {
  padding: 0.3rem 0.7rem;
  font-size: 0.85rem;
}

.assign-form {
  margin-top: 1rem;
}

.danger-zone h3 {
  color: var(--warning);
}

.danger-button {
  border: 1px solid rgba(155, 47, 31, 0.46);
  border-radius: var(--radius-sm);
  background: var(--paper);
  color: var(--warning);
  font: inherit;
  font-weight: 600;
  padding: 0.6rem 1.1rem;
  cursor: pointer;
}

.danger-button:hover {
  background: rgba(155, 47, 31, 0.08);
}

.danger-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
