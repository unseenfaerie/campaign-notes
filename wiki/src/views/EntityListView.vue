<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { entityLabelFromRoute, entitySingularLabelFromRoute } from '../config/entities'
import { ApiError } from '../services/apiClient'
import { listEntities, type DomainEntity } from '../services/domainService'
import { getEntitySchema, type EntityFieldSchema } from '../services/metaService'
import { prettyEnumValue, prettyFieldName } from '../utils/formatting'
import { useAuthStore } from '../stores/auth'

const props = defineProps<{
  entityRoute: string
}>()

const auth = useAuthStore()

const loading = ref(true)
const errorMessage = ref('')
const records = ref<DomainEntity[]>([])
const filterableFields = ref<EntityFieldSchema[]>([])

const nameFilter = ref('')
const booleanFilters = ref<Record<string, '' | 'true' | 'false'>>({})
const enumFilters = ref<Record<string, string>>({})

const title = computed(() => entityLabelFromRoute(props.entityRoute))
const singularLabel = computed(() => entitySingularLabelFromRoute(props.entityRoute))

const booleanFilterFields = computed(() => filterableFields.value.filter((field) => field.type === 'boolean'))
const enumFilterFields = computed(() => filterableFields.value.filter((field) => field.enum))

const filteredRecords = computed(() => {
  const name = nameFilter.value.trim().toLowerCase()

  return records.value.filter((record) => {
    if (name && !getDisplayLabel(record).toLowerCase().includes(name)) {
      return false
    }

    for (const field of booleanFilterFields.value) {
      const filterValue = booleanFilters.value[field.name]
      if (filterValue && Boolean(record[field.name]) !== (filterValue === 'true')) {
        return false
      }
    }

    for (const field of enumFilterFields.value) {
      const filterValue = enumFilters.value[field.name]
      if (filterValue && record[field.name] !== filterValue) {
        return false
      }
    }

    return true
  })
})

const sortedRecords = computed(() => {
  return [...filteredRecords.value].sort((a, b) => {
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
  nameFilter.value = ''
  booleanFilters.value = {}
  enumFilters.value = {}

  try {
    const [schema, entityRecords] = await Promise.all([
      getEntitySchema(props.entityRoute),
      listEntities(props.entityRoute),
    ])

    filterableFields.value = (schema?.fields ?? []).filter(
      (field) => !field.primary && (field.type === 'boolean' || field.enum)
    )
    records.value = entityRecords
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

    <div v-if="!loading && !errorMessage && records.length > 0" class="filter-bar">
      <div class="form-row">
        <label for="filter-name">Name</label>
        <input id="filter-name" v-model="nameFilter" type="text" placeholder="Search by name..." />
      </div>

      <div v-for="field in booleanFilterFields" :key="field.name" class="form-row">
        <label :for="`filter-${field.name}`">{{ prettyFieldName(field.name) }}</label>
        <select :id="`filter-${field.name}`" v-model="booleanFilters[field.name]">
          <option value="">Any</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>

      <div v-for="field in enumFilterFields" :key="field.name" class="form-row">
        <label :for="`filter-${field.name}`">{{ prettyFieldName(field.name) }}</label>
        <select :id="`filter-${field.name}`" v-model="enumFilters[field.name]">
          <option value="">Any</option>
          <option v-for="value in field.enum" :key="value" :value="value">{{ prettyEnumValue(value) }}</option>
        </select>
      </div>
    </div>

    <p v-if="loading" class="status-card">Loading records...</p>
    <p v-else-if="errorMessage" class="status-card error">{{ errorMessage }}</p>
    <p v-else-if="records.length === 0" class="status-card">No records found for this entity.</p>
    <p v-else-if="sortedRecords.length === 0" class="status-card">No records match the current filters.</p>

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
