<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { entityLabelFromRoute, entitySingularLabelFromRoute } from '../config/entities'
import { ApiError } from '../services/apiClient'
import { listEntities, type DomainEntity } from '../services/domainService'
import { useAuthStore } from '../stores/auth'

const props = defineProps<{
  entityRoute: string
}>()

const auth = useAuthStore()

const loading = ref(true)
const errorMessage = ref('')
const records = ref<DomainEntity[]>([])

const title = computed(() => entityLabelFromRoute(props.entityRoute))
const singularLabel = computed(() => entitySingularLabelFromRoute(props.entityRoute))

const sortedRecords = computed(() => {
  return [...records.value].sort((a, b) => {
    return getDisplayLabel(a).localeCompare(getDisplayLabel(b))
  })
})

function getRecordId(record: DomainEntity): string {
  const rawId = record.id
  if (rawId === undefined || rawId === null || rawId === '') {
    return ''
  }

  return String(rawId)
}

function getDisplayLabel(record: DomainEntity): string {
  if (typeof record.name === 'string' && record.name.trim()) {
    return record.name
  }

  if (typeof record.alias === 'string' && record.alias.trim()) {
    return record.alias
  }

  const id = getRecordId(record)
  return id || 'Untitled entry'
}

async function loadList() {
  loading.value = true
  errorMessage.value = ''

  try {
    records.value = await listEntities(props.entityRoute)
  } catch (error) {
    if (error instanceof ApiError) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Could not load records.'
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadList)
watch(() => props.entityRoute, loadList)
</script>

<template>
  <section>
    <header class="view-header list-header">
      <h2>{{ title }}</h2>
      <RouterLink
        v-if="auth.isAdmin.value"
        class="create-button"
        :to="{ name: 'entity-create', params: { entityRoute: props.entityRoute } }"
      >
        Create {{ singularLabel }}
      </RouterLink>
    </header>

    <p v-if="loading" class="status-card">Loading records...</p>
    <p v-else-if="errorMessage" class="status-card error">{{ errorMessage }}</p>
    <p v-else-if="records.length === 0" class="status-card">No records found for this entity.</p>

    <div v-else class="grid-list">
      <article v-for="record in sortedRecords" :key="getDisplayLabel(record)" class="entity-card">
        <h3>
          <RouterLink
            v-if="getRecordId(record)"
            :to="{ name: 'entity-detail', params: { entityRoute: props.entityRoute, id: getRecordId(record) } }"
          >
            {{ getDisplayLabel(record) }}
          </RouterLink>
          <span v-else>{{ getDisplayLabel(record) }}</span>
        </h3>
      </article>
    </div>
  </section>
</template>
