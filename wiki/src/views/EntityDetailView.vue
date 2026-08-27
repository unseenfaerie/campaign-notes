<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AddRelatedEntityForm from '../components/AddRelatedEntityForm.vue'
import CollapseSection from '../components/CollapseSection.vue'
import FieldList from '../components/FieldList.vue'
import { entityLabelFromRoute } from '../config/entities'
import { ApiError } from '../services/apiClient'
import { getEntityFull, updateEntity, type DomainEntity } from '../services/domainService'
import { getEntitySchema, getRelationSchemas, type EntityFieldSchema, type RelationFormSchema } from '../services/metaService'
import { useAuthStore } from '../stores/auth'

type FullState = {
  entity: DomainEntity
  related: Record<string, DomainEntity[]>
}

const props = defineProps<{
  entityRoute: string
  id: string
}>()

const auth = useAuthStore()

const loading = ref(true)
const errorMessage = ref('')
const fullData = ref<FullState | null>(null)

const isEditing = ref(false)
const editFields = ref<EntityFieldSchema[]>([])
const editValues = ref<Record<string, any>>({})
const saving = ref(false)
const saveError = ref('')

const relationSchemas = ref<RelationFormSchema[]>([])
const openAddFormRoute = ref<string | null>(null)
const showingNewRelatedPicker = ref(false)

const entityTitle = computed(() => entityLabelFromRoute(props.entityRoute))
const entityPageTitle = computed(() => {
  const entity = fullData.value?.entity
  if (!entity) {
    return loading.value ? 'Loading...' : entityTitle.value
  }

  if (typeof entity.name === 'string' && entity.name.trim()) {
    return entity.name
  }

  if (typeof entity.alias === 'string' && entity.alias.trim()) {
    return entity.alias
  }

  return entityTitle.value
})

const entityDisplayData = computed(() => withoutIdField(fullData.value?.entity || {}))

const sortedRelatedSections = computed(() => {
  if (!fullData.value) {
    return [] as Array<[string, DomainEntity[]]>
  }

  return Object.entries(fullData.value.related || {})
    .map(([relatedRoute, records]) => [relatedRoute, dedupeRelatedRecords(records || [])] as [string, DomainEntity[]])
    .filter(([, records]) => Array.isArray(records) && records.length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
})

const missingRelationSections = computed(() => {
  const related = fullData.value?.related || {}
  return relationSchemas.value.filter((schema) => (related[schema.relatedRoute] || []).length === 0)
})

function titleCaseLabel(label: string): string {
  if (!label) {
    return ''
  }

  return label.charAt(0).toUpperCase() + label.slice(1)
}

function relatedRecordIdentity(record: DomainEntity): string {
  if (record.id !== undefined && record.id !== null && record.id !== '') {
    return `id:${String(record.id)}`
  }

  if (typeof record.name === 'string' && record.name.trim()) {
    return `name:${record.name.trim().toLowerCase()}`
  }

  if (typeof record.alias === 'string' && record.alias.trim()) {
    return `alias:${record.alias.trim().toLowerCase()}`
  }

  return `record:${JSON.stringify(record)}`
}

function dedupeRelatedRecords(records: DomainEntity[]): DomainEntity[] {
  const seen = new Set<string>()
  const unique: DomainEntity[] = []

  for (const record of records) {
    const identity = relatedRecordIdentity(record)
    if (seen.has(identity)) {
      continue
    }

    seen.add(identity)
    unique.push(record)
  }

  return unique
}

function relationPayload(record: DomainEntity): DomainEntity {
  const candidate = record.relationship
  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
    return candidate as DomainEntity
  }

  return {}
}

function historyPayload(record: DomainEntity): DomainEntity[] {
  const candidate = record.history
  if (!Array.isArray(candidate)) {
    return []
  }

  return candidate.filter((entry): entry is DomainEntity => Boolean(entry && typeof entry === 'object'))
}

function withoutIdField(record: DomainEntity): DomainEntity {
  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== 'id'))
}

function domainEntitySignature(record: DomainEntity): string {
  return JSON.stringify(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right))
  )
}

function relationDisplayPayload(record: DomainEntity): DomainEntity {
  return withoutIdField(relationPayload(record))
}

function historyDisplayPayload(record: DomainEntity): DomainEntity[] {
  const seen = new Set<string>()
  const uniqueEntries: DomainEntity[] = []

  for (const entry of historyPayload(record).map(withoutIdField)) {
    if (Object.keys(entry).length === 0) {
      continue
    }

    const signature = domainEntitySignature(entry)
    if (seen.has(signature)) {
      continue
    }

    seen.add(signature)
    uniqueEntries.push(entry)
  }

  return uniqueEntries
}

function showRelationMetadata(record: DomainEntity): boolean {
  const relation = relationDisplayPayload(record)
  if (Object.keys(relation).length === 0) {
    return false
  }

  const relationSignature = domainEntitySignature(relation)
  return !historyDisplayPayload(record).some((entry) => domainEntitySignature(entry) === relationSignature)
}

function relatedRecordLabel(record: DomainEntity): string {
  if (typeof record.name === 'string' && record.name.trim()) {
    return record.name
  }

  if (typeof record.alias === 'string' && record.alias.trim()) {
    return record.alias
  }

  return 'Related entry'
}

function relatedRecordId(record: DomainEntity): string {
  if (record.id === undefined || record.id === null || record.id === '') {
    return ''
  }

  return String(record.id)
}

async function loadDetail() {
  loading.value = true
  errorMessage.value = ''
  isEditing.value = false
  openAddFormRoute.value = null
  showingNewRelatedPicker.value = false

  try {
    const [full, relations] = await Promise.all([
      getEntityFull(props.entityRoute, props.id),
      getRelationSchemas(props.entityRoute),
    ])
    fullData.value = full
    relationSchemas.value = relations
  } catch (error) {
    if (error instanceof ApiError) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Could not load detail view.'
    }
  } finally {
    loading.value = false
  }
}

function relationSchemaForRoute(relatedRoute: string): RelationFormSchema[] {
  const schema = relationSchemas.value.find((entry) => entry.relatedRoute === relatedRoute)
  return schema ? [schema] : []
}

type CollapseSectionInstance = { expand: () => void }
const collapseSectionRefs = new Map<string, CollapseSectionInstance>()

function setCollapseSectionRef(relatedRoute: string, instance: unknown) {
  if (instance) {
    collapseSectionRefs.set(relatedRoute, instance as CollapseSectionInstance)
  } else {
    collapseSectionRefs.delete(relatedRoute)
  }
}

function toggleAddForm(relatedRoute: string) {
  const opening = openAddFormRoute.value !== relatedRoute
  openAddFormRoute.value = opening ? relatedRoute : null

  if (opening) {
    collapseSectionRefs.get(relatedRoute)?.expand()
  }
}

async function onRelationCreated() {
  await loadDetail()
}

function prettyFieldName(name: string): string {
  return name
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function isLongTextField(field: EntityFieldSchema): boolean {
  return field.type === 'string' && /description|explanation|notes/i.test(field.name)
}

async function startEdit() {
  saveError.value = ''

  const schema = await getEntitySchema(props.entityRoute)
  const entity = fullData.value?.entity
  if (!schema || !entity) {
    return
  }

  editFields.value = schema.fields.filter((field) => !field.primary)

  const initialValues: Record<string, any> = {}
  for (const field of editFields.value) {
    const currentValue = entity[field.name]
    if (field.type === 'boolean') {
      initialValues[field.name] = currentValue === true
    } else {
      initialValues[field.name] = currentValue === undefined || currentValue === null ? '' : String(currentValue)
    }
  }
  editValues.value = initialValues

  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  saveError.value = ''
}

function buildEditPayload(): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  for (const field of editFields.value) {
    const rawValue = editValues.value[field.name]

    if (field.type === 'boolean') {
      payload[field.name] = rawValue === true
      continue
    }

    const text = typeof rawValue === 'string' ? rawValue.trim() : ''
    if (text === '') {
      if (field.required) {
        throw new Error(`${prettyFieldName(field.name)} is required.`)
      }
      continue
    }

    payload[field.name] = field.type === 'number' ? Number(text) : text
  }

  return payload
}

async function saveEdit() {
  saveError.value = ''
  saving.value = true

  try {
    const payload = buildEditPayload()
    const updated = await updateEntity(props.entityRoute, props.id, payload)
    if (fullData.value) {
      fullData.value.entity = { ...fullData.value.entity, ...updated }
    }
    isEditing.value = false
  } catch (error) {
    if (error instanceof ApiError || error instanceof Error) {
      saveError.value = error.message
    } else {
      saveError.value = 'Could not save changes.'
    }
  } finally {
    saving.value = false
  }
}

onMounted(loadDetail)
watch(() => [props.entityRoute, props.id], loadDetail)
</script>

<template>
  <section>
    <header class="view-header">
      <h1>{{ entityPageTitle }}</h1>
    </header>

    <p v-if="loading" class="status-card">Loading entity detail...</p>
    <p v-else-if="errorMessage" class="status-card error">{{ errorMessage }}</p>

    <article v-else-if="fullData" class="wiki-article">
      <section>
        <div class="section-heading-row">
          <h3>Core data</h3>
          <button
            v-if="auth.isAdmin.value && !isEditing"
            type="button"
            class="secondary-button"
            @click="startEdit"
          >
            Edit
          </button>
        </div>

        <form v-if="isEditing" class="entity-form" @submit.prevent="saveEdit">
          <div v-for="field in editFields" :key="field.name" class="form-row">
            <label :for="`edit-field-${field.name}`">
              {{ prettyFieldName(field.name) }}
              <span v-if="field.required" class="required-marker" aria-hidden="true">*</span>
            </label>

            <input
              v-if="field.type === 'boolean'"
              :id="`edit-field-${field.name}`"
              v-model="editValues[field.name]"
              type="checkbox"
            />
            <input
              v-else-if="field.type === 'number'"
              :id="`edit-field-${field.name}`"
              v-model="editValues[field.name]"
              type="number"
              step="any"
              :required="field.required"
            />
            <textarea
              v-else-if="isLongTextField(field)"
              :id="`edit-field-${field.name}`"
              v-model="editValues[field.name]"
              rows="4"
              :required="field.required"
            ></textarea>
            <input
              v-else
              :id="`edit-field-${field.name}`"
              v-model="editValues[field.name]"
              type="text"
              :required="field.required"
            />
          </div>

          <div class="form-actions">
            <button class="primary-button" type="submit" :disabled="saving">
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
            <button class="secondary-button" type="button" :disabled="saving" @click="cancelEdit">Cancel</button>
          </div>

          <p v-if="saveError" class="status-card error">{{ saveError }}</p>
        </form>
        <FieldList v-else :data="entityDisplayData" empty-message="No entity fields are available." />
      </section>

      <CollapseSection
        v-for="[relatedRoute, records] in sortedRelatedSections"
        :key="relatedRoute"
        :ref="(instance) => setCollapseSectionRef(relatedRoute, instance)"
        class="article-section"
        :title="titleCaseLabel(entityLabelFromRoute(relatedRoute))"
        :count="records.length"
        :initially-open="false"
      >
        <template v-if="auth.isAdmin.value" #header-actions>
          <button type="button" class="secondary-button" @click="toggleAddForm(relatedRoute)">
            {{ openAddFormRoute === relatedRoute ? 'Cancel' : 'New' }}
          </button>
        </template>

        <div>
          <AddRelatedEntityForm
            v-if="openAddFormRoute === relatedRoute"
            :entity-route="entityRoute"
            :id="id"
            :options="relationSchemaForRoute(relatedRoute)"
            @created="onRelationCreated"
            @cancel="openAddFormRoute = null"
          />

          <article v-for="(record, index) in records" :key="`${relatedRoute}-${index}`" class="related-record">
            <h4>
              <RouterLink
                v-if="relatedRecordId(record)"
                :to="{
                  name: 'entity-detail',
                  params: { entityRoute: relatedRoute, id: relatedRecordId(record) },
                }"
              >
                {{ relatedRecordLabel(record) }}
              </RouterLink>
              <template v-else>{{ relatedRecordLabel(record) }}</template>
            </h4>

            <template v-if="showRelationMetadata(record)">
              <FieldList :data="relationDisplayPayload(record)" />
            </template>

            <template v-if="historyDisplayPayload(record).length > 0">
              <p class="meta-title">History records</p>
              <article
                v-for="(historyEntry, historyIndex) in historyDisplayPayload(record)"
                :key="`${relatedRoute}-${index}-history-${historyIndex}`"
                class="history-record"
              >
                <FieldList :data="historyEntry" />
              </article>
            </template>

            <p
              v-if="!showRelationMetadata(record) && historyDisplayPayload(record).length === 0"
              class="article-note"
            >
              No relationship metadata or history records for this entry.
            </p>
          </article>
        </div>
      </CollapseSection>

      <section v-if="auth.isAdmin.value && missingRelationSections.length > 0" class="article-section">
        <button
          v-if="!showingNewRelatedPicker"
          type="button"
          class="secondary-button"
          @click="showingNewRelatedPicker = true"
        >
          New Related Entity
        </button>

        <AddRelatedEntityForm
          v-else
          :entity-route="entityRoute"
          :id="id"
          :options="missingRelationSections"
          @created="onRelationCreated"
          @cancel="showingNewRelatedPicker = false"
        />
      </section>
    </article>
  </section>
</template>
