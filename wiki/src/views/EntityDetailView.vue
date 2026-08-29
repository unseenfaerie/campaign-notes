<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AddRelatedEntityForm from '../components/AddRelatedEntityForm.vue'
import CollapseSection from '../components/CollapseSection.vue'
import FieldList from '../components/FieldList.vue'
import { entityLabelFromRoute } from '../config/entities'
import { ApiError } from '../services/apiClient'
import { getEntityFull, listEntities, updateEntity, updateRelation, type DomainEntity } from '../services/domainService'
import {
  getEntitySchema,
  getRelationSchemas,
  type EntityFieldSchema,
  type EntitySchema,
  type RelationFormSchema,
} from '../services/metaService'
import LoreDateInput from '../components/LoreDateInput.vue'
import SearchableSelect from '../components/SearchableSelect.vue'
import LinkifiedText from '../components/LinkifiedText.vue'
import { useAuthStore } from '../stores/auth'

type FullState = {
  entity: DomainEntity
  related: Record<string, DomainEntity[]>
  children?: DomainEntity[]
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
const entitySchema = ref<EntitySchema | null>(null)
const placeOptions = ref<DomainEntity[]>([])
const openAddFormRoute = ref<string | null>(null)
const showingNewRelatedPicker = ref(false)

const editingRelationKey = ref<string | null>(null)
const relationEditValues = ref<Record<string, any>>({})
const relationEditSaving = ref(false)
const relationEditError = ref('')

const editingHistoryKey = ref<string | null>(null)
const historyEditValues = ref<Record<string, any>>({})
const historyEditOriginalSelector = ref<{ key: string; value: string } | null>(null)
const historyEditSaving = ref(false)
const historyEditError = ref('')

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

// short_description/long_explanation get their own dedicated spots in the layout, so the facts box excludes them.
const entityShortDescription = computed(() => {
  const value = fullData.value?.entity?.short_description
  return typeof value === 'string' && value.trim() ? value : ''
})

const entityLongExplanation = computed(() => {
  const value = fullData.value?.entity?.long_explanation
  return typeof value === 'string' && value.trim() ? value : ''
})

const entityFactsData = computed(() =>
  Object.fromEntries(
    Object.entries(entityDisplayData.value).filter(
      ([key]) => key !== 'name' && key !== 'short_description' && key !== 'long_explanation'
    )
  )
)

const hasEntityFacts = computed(() => Object.keys(entityFactsData.value).length > 0)

const entityFactsFields = computed(() =>
  (entitySchema.value?.fields || []).filter(
    (field) => field.name !== 'name' && field.name !== 'short_description' && field.name !== 'long_explanation'
  )
)

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
  editingRelationKey.value = null
  editingHistoryKey.value = null

  try {
    const [full, schema, relations] = await Promise.all([
      getEntityFull(props.entityRoute, props.id),
      getEntitySchema(props.entityRoute),
      getRelationSchemas(props.entityRoute),
    ])
    fullData.value = full
    entitySchema.value = schema || null
    relationSchemas.value = relations
    placeOptions.value = props.entityRoute === 'places'
      ? (await listEntities('places'))
          .filter((place) => String(place.id) !== props.id)
          .sort((left, right) => String(left.name || left.id).localeCompare(String(right.name || right.id)))
      : []
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

function findRelationSchema(relatedRoute: string): RelationFormSchema | undefined {
  return relationSchemas.value.find((entry) => entry.relatedRoute === relatedRoute)
}

function isSimpleRelation(relatedRoute: string): boolean {
  return findRelationSchema(relatedRoute)?.kind === 'simple'
}

function isRelationshipKind(relatedRoute: string): boolean {
  return findRelationSchema(relatedRoute)?.kind === 'relationship'
}

function editableFields(fields: EntityFieldSchema[]): EntityFieldSchema[] {
  return fields.filter((field) => !field.primary)
}

// Non-admin players are limited to fields the manifest marks as player-editable.
function fieldsForRole(fields: EntityFieldSchema[]): EntityFieldSchema[] {
  const nonPrimary = editableFields(fields)
  return auth.isAdmin.value ? nonPrimary : nonPrimary.filter((field) => field.playerEditable)
}

function characterCandidateIdsForRelation(relatedRoute: string, record: DomainEntity): string[] {
  const schema = findRelationSchema(relatedRoute)
  const ids: string[] = []

  if (props.entityRoute === 'characters') {
    ids.push(props.id)
  }

  if (schema?.relatedEntityRoute === 'characters') {
    const relatedId = relatedRecordId(record)
    if (relatedId) {
      ids.push(relatedId)
    }
  }

  return ids
}

function canPlayerEditRelation(relatedRoute: string, record: DomainEntity): boolean {
  const schema = findRelationSchema(relatedRoute)
  if (!schema || !schema.fields.some((field) => field.playerEditable)) {
    return false
  }

  const candidateIds = characterCandidateIdsForRelation(relatedRoute, record)
  return candidateIds.some((candidateId) => auth.anchoredCharacterIds.value.includes(candidateId))
}

const canPlayerEditEntity = computed(() => {
  if (props.entityRoute !== 'characters') {
    return false
  }

  const fields = entitySchema.value?.fields ?? []
  if (!fields.some((field) => field.playerEditable)) {
    return false
  }

  return auth.anchoredCharacterIds.value.includes(props.id)
})

const visibleEditFields = computed(() =>
  auth.isAdmin.value ? editFields.value : editFields.value.filter((field) => field.playerEditable)
)

function primaryFields(fields: EntityFieldSchema[]): EntityFieldSchema[] {
  return fields.filter((field) => field.primary)
}

function primaryFieldValues(relatedRoute: string, sourceRecord: DomainEntity): DomainEntity {
  const schema = findRelationSchema(relatedRoute)
  if (!schema) {
    return {}
  }

  const values: DomainEntity = {}
  for (const field of primaryFields(schema.fields)) {
    values[field.name] = sourceRecord[field.name]
  }
  return values
}

function fieldValuesFromRecord(fields: EntityFieldSchema[], record: DomainEntity): Record<string, any> {
  const values: Record<string, any> = {}
  for (const field of fields) {
    const currentValue = record[field.name]
    if (field.type === 'boolean') {
      values[field.name] = currentValue === true
    } else {
      values[field.name] = currentValue === undefined || currentValue === null ? '' : String(currentValue)
    }
  }
  return values
}

function buildFieldsPayload(
  fields: EntityFieldSchema[],
  values: Record<string, any>,
  { clearOptionalLoreDates = false, clearOptionalReferences = false } = {}
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  for (const field of fields) {
    const rawValue = values[field.name]

    if (field.type === 'boolean') {
      payload[field.name] = rawValue === true
      continue
    }

    const text = typeof rawValue === 'string' ? rawValue.trim() : ''
    if (text === '') {
      if (field.required) {
        throw new Error(`${prettyFieldName(field.name)} is required.`)
      }
      if (clearOptionalLoreDates && field.type === 'loreDate') {
        payload[field.name] = null
      }
      if (clearOptionalReferences && field.ref) {
        payload[field.name] = null
      }
      continue
    }

    payload[field.name] = field.type === 'number' ? Number(text) : text
  }

  return payload
}

function startEditRelation(relatedRoute: string, record: DomainEntity) {
  const schema = findRelationSchema(relatedRoute)
  if (!schema) {
    return
  }

  relationEditError.value = ''
  relationEditValues.value = fieldValuesFromRecord(fieldsForRole(schema.fields), relationPayload(record))
  editingRelationKey.value = `${relatedRoute}::${relatedRecordId(record)}`
}

function cancelEditRelation() {
  editingRelationKey.value = null
  relationEditError.value = ''
}

async function saveEditRelation(relatedRoute: string, record: DomainEntity) {
  const schema = findRelationSchema(relatedRoute)
  if (!schema) {
    return
  }

  relationEditError.value = ''
  relationEditSaving.value = true

  try {
    const payload = buildFieldsPayload(fieldsForRole(schema.fields), relationEditValues.value, {
      clearOptionalLoreDates: true,
    })
    await updateRelation(props.entityRoute, props.id, relatedRoute, relatedRecordId(record), payload)
    editingRelationKey.value = null
    await loadDetail()
  } catch (error) {
    if (error instanceof ApiError || error instanceof Error) {
      relationEditError.value = error.message
    } else {
      relationEditError.value = 'Could not save changes.'
    }
  } finally {
    relationEditSaving.value = false
  }
}

function startEditHistory(relatedRoute: string, historyEntry: DomainEntity, historyKey: string) {
  const schema = findRelationSchema(relatedRoute)
  if (!schema || !schema.historyKey) {
    return
  }

  const originalValue = historyEntry[schema.historyKey]

  historyEditError.value = ''
  historyEditValues.value = fieldValuesFromRecord(fieldsForRole(schema.fields), historyEntry)
  historyEditOriginalSelector.value = { key: schema.historyKey, value: String(originalValue ?? '') }
  editingHistoryKey.value = historyKey
}

function cancelEditHistory() {
  editingHistoryKey.value = null
  historyEditError.value = ''
}

async function saveEditHistory(relatedRoute: string, record: DomainEntity) {
  const schema = findRelationSchema(relatedRoute)
  if (!schema || !historyEditOriginalSelector.value) {
    return
  }

  historyEditError.value = ''
  historyEditSaving.value = true

  try {
    const payload = buildFieldsPayload(fieldsForRole(schema.fields), historyEditValues.value, {
      clearOptionalLoreDates: true,
    })
    await updateRelation(
      props.entityRoute,
      props.id,
      relatedRoute,
      relatedRecordId(record),
      payload,
      historyEditOriginalSelector.value
    )
    editingHistoryKey.value = null
    await loadDetail()
  } catch (error) {
    if (error instanceof ApiError || error instanceof Error) {
      historyEditError.value = error.message
    } else {
      historyEditError.value = 'Could not save changes.'
    }
  } finally {
    historyEditSaving.value = false
  }
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

function prettyEnumValue(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function isLongTextField(field: EntityFieldSchema): boolean {
  return field.type === 'string' && /description|explanation|notes/i.test(field.name)
}

async function startEdit() {
  saveError.value = ''

  const schema = entitySchema.value || await getEntitySchema(props.entityRoute)
  const entity = fullData.value?.entity
  if (!schema || !entity) {
    return
  }

  editFields.value = schema.fields
  editValues.value = fieldValuesFromRecord(editFields.value, entity)

  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  saveError.value = ''
}

function buildEditPayload(): Record<string, unknown> {
  const payload = buildFieldsPayload(fieldsForRole(editFields.value), editValues.value, {
    clearOptionalLoreDates: true,
    clearOptionalReferences: true,
  })

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
      <section class="core-data-section">
        <div class="section-heading-row">
          <h3>Core data</h3>
          <button
            v-if="(auth.isAdmin.value || canPlayerEditEntity) && !isEditing"
            type="button"
            class="secondary-button"
            @click="startEdit"
          >
            Edit
          </button>
        </div>

        <form v-if="isEditing" class="entity-form" @submit.prevent="saveEdit">
          <div v-for="field in visibleEditFields" :key="field.name" class="form-row">
            <label :for="`edit-field-${field.name}`">
              {{ prettyFieldName(field.name) }}
              <span v-if="field.required" class="required-marker" aria-hidden="true">*</span>
            </label>

            <input
              v-if="field.type === 'boolean'"
              :id="`edit-field-${field.name}`"
              v-model="editValues[field.name]"
              type="checkbox"
              :disabled="field.primary"
            />
            <SearchableSelect
              v-else-if="field.enum"
              :id="`edit-field-${field.name}`"
              v-model="editValues[field.name]"
              :options="[
                ...(field.required ? [] : [{ value: '', label: `No ${prettyFieldName(field.name).toLowerCase()}` }]),
                ...field.enum.map((value) => ({ value, label: prettyEnumValue(value) })),
              ]"
              :required="field.required"
            />
            <SearchableSelect
              v-else-if="entityRoute === 'places' && field.name === 'parent_id'"
              :id="`edit-field-${field.name}`"
              v-model="editValues[field.name]"
              :options="[
                { value: '', label: 'No parent' },
                ...placeOptions.map((place) => ({ value: String(place.id), label: String(place.name || place.id) })),
              ]"
            />
            <input
              v-else-if="field.type === 'number'"
              :id="`edit-field-${field.name}`"
              v-model="editValues[field.name]"
              type="number"
              step="any"
              :required="field.required"
              :readonly="field.primary"
            />
            <textarea
              v-else-if="isLongTextField(field)"
              :id="`edit-field-${field.name}`"
              v-model="editValues[field.name]"
              rows="4"
              :required="field.required"
            ></textarea>
            <LoreDateInput
              v-else-if="field.type === 'loreDate'"
              v-model="editValues[field.name]"
              :required="field.required"
            />
            <input
              v-else
              :id="`edit-field-${field.name}`"
              v-model="editValues[field.name]"
              type="text"
              :required="field.required"
              :readonly="field.primary"
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
        <div v-else class="entity-overview">
          <FieldList
            v-if="hasEntityFacts"
            class="entity-facts"
            :data="entityFactsData"
            :fields="entityFactsFields"
            empty-message="No entity fields are available."
          >
            <template #after-field="{ fieldKey }">
              <template v-if="entityRoute === 'places' && fieldKey === 'parent_id' && fullData.children?.length">
                <dt>Children</dt>
                <dd>
                  <template v-for="(child, index) in fullData.children" :key="String(child.id)">
                    <span v-if="index > 0">, </span>
                    <RouterLink
                      v-if="child.id !== undefined && child.id !== null && child.id !== ''"
                      :to="{ name: 'entity-detail', params: { entityRoute: 'places', id: String(child.id) } }"
                    >
                      {{ relatedRecordLabel(child) }}
                    </RouterLink>
                  </template>
                </dd>
              </template>
            </template>
            <template #after-fields>
              <template v-if="entityRoute === 'places' && !entityDisplayData.parent_id && fullData.children?.length">
                <dt>Children</dt>
                <dd>
                  <template v-for="(child, index) in fullData.children" :key="String(child.id)">
                    <span v-if="index > 0">, </span>
                    <RouterLink
                      v-if="child.id !== undefined && child.id !== null && child.id !== ''"
                      :to="{ name: 'entity-detail', params: { entityRoute: 'places', id: String(child.id) } }"
                    >
                      {{ relatedRecordLabel(child) }}
                    </RouterLink>
                  </template>
                </dd>
              </template>
            </template>
          </FieldList>
          <div v-if="entityShortDescription || entityLongExplanation" class="entity-long-description">
            <template v-if="entityShortDescription">
              <h4>Description</h4>
              <p><LinkifiedText :text="entityShortDescription" /></p>
            </template>
            <template v-if="entityLongExplanation">
              <h4>Details</h4>
              <p><LinkifiedText :text="entityLongExplanation" /></p>
            </template>
          </div>
        </div>

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
            <div class="section-heading-row">
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
              <button
                v-if="(auth.isAdmin.value || canPlayerEditRelation(relatedRoute, record)) && isRelationshipKind(relatedRoute) && editingRelationKey !== `${relatedRoute}::${relatedRecordId(record)}`"
                type="button"
                class="secondary-button"
                @click="startEditRelation(relatedRoute, record)"
              >
                Edit
              </button>
            </div>

            <form
              v-if="editingRelationKey === `${relatedRoute}::${relatedRecordId(record)}`"
              class="entity-form"
              @submit.prevent="saveEditRelation(relatedRoute, record)"
            >
              <FieldList
                v-if="Object.keys(primaryFieldValues(relatedRoute, relationPayload(record))).length > 0"
                :data="primaryFieldValues(relatedRoute, relationPayload(record))"
              />

              <div
                v-for="field in fieldsForRole(relationSchemaForRoute(relatedRoute)[0]?.fields ?? [])"
                :key="field.name"
                class="form-row"
              >
                <label :for="`edit-relation-${relatedRoute}-${index}-${field.name}`">
                  {{ prettyFieldName(field.name) }}
                  <span v-if="field.required" class="required-marker" aria-hidden="true">*</span>
                </label>

                <input
                  v-if="field.type === 'boolean'"
                  :id="`edit-relation-${relatedRoute}-${index}-${field.name}`"
                  v-model="relationEditValues[field.name]"
                  type="checkbox"
                />
                <SearchableSelect
                  v-else-if="field.enum"
                  :id="`edit-relation-${relatedRoute}-${index}-${field.name}`"
                  v-model="relationEditValues[field.name]"
                  :options="[
                    ...(field.required ? [] : [{ value: '', label: `No ${prettyFieldName(field.name).toLowerCase()}` }]),
                    ...field.enum.map((value) => ({ value, label: prettyEnumValue(value) })),
                  ]"
                  :required="field.required"
                />
                <input
                  v-else-if="field.type === 'number'"
                  :id="`edit-relation-${relatedRoute}-${index}-${field.name}`"
                  v-model="relationEditValues[field.name]"
                  type="number"
                  step="any"
                  :required="field.required"
                />
                <textarea
                  v-else-if="isLongTextField(field)"
                  :id="`edit-relation-${relatedRoute}-${index}-${field.name}`"
                  v-model="relationEditValues[field.name]"
                  rows="4"
                  :required="field.required"
                ></textarea>
                <LoreDateInput
                  v-else-if="field.type === 'loreDate'"
                  v-model="relationEditValues[field.name]"
                  :required="field.required"
                />
                <input
                  v-else
                  :id="`edit-relation-${relatedRoute}-${index}-${field.name}`"
                  v-model="relationEditValues[field.name]"
                  type="text"
                  :required="field.required"
                />
              </div>

              <div class="form-actions">
                <button class="primary-button" type="submit" :disabled="relationEditSaving">
                  {{ relationEditSaving ? 'Saving...' : 'Save' }}
                </button>
                <button
                  class="secondary-button"
                  type="button"
                  :disabled="relationEditSaving"
                  @click="cancelEditRelation"
                >
                  Cancel
                </button>
              </div>

              <p v-if="relationEditError" class="status-card error">{{ relationEditError }}</p>
            </form>

            <template v-else-if="showRelationMetadata(record)">
              <FieldList
                :data="relationDisplayPayload(record)"
                :fields="relationSchemaForRoute(relatedRoute)[0]?.fields"
              />
            </template>

            <template v-if="historyDisplayPayload(record).length > 0">
              <p class="meta-title">History records</p>
              <article
                v-for="(historyEntry, historyIndex) in historyDisplayPayload(record)"
                :key="`${relatedRoute}-${index}-history-${historyIndex}`"
                class="history-record"
              >
                <div v-if="auth.isAdmin.value || canPlayerEditRelation(relatedRoute, record)" class="row-actions-end">
                  <button
                    v-if="editingHistoryKey !== `${relatedRoute}-${index}-history-${historyIndex}`"
                    type="button"
                    class="secondary-button"
                    @click="
                      startEditHistory(relatedRoute, historyEntry, `${relatedRoute}-${index}-history-${historyIndex}`)
                    "
                  >
                    Edit
                  </button>
                </div>

                <form
                  v-if="editingHistoryKey === `${relatedRoute}-${index}-history-${historyIndex}`"
                  class="entity-form"
                  @submit.prevent="saveEditHistory(relatedRoute, record)"
                >
                  <FieldList
                    v-if="Object.keys(primaryFieldValues(relatedRoute, historyEntry)).length > 0"
                    :data="primaryFieldValues(relatedRoute, historyEntry)"
                  />

                  <div
                    v-for="field in fieldsForRole(relationSchemaForRoute(relatedRoute)[0]?.fields ?? [])"
                    :key="field.name"
                    class="form-row"
                  >
                    <label :for="`edit-history-${relatedRoute}-${index}-${historyIndex}-${field.name}`">
                      {{ prettyFieldName(field.name) }}
                      <span v-if="field.required" class="required-marker" aria-hidden="true">*</span>
                    </label>

                    <input
                      v-if="field.type === 'boolean'"
                      :id="`edit-history-${relatedRoute}-${index}-${historyIndex}-${field.name}`"
                      v-model="historyEditValues[field.name]"
                      type="checkbox"
                    />
                    <SearchableSelect
                      v-else-if="field.enum"
                      :id="`edit-history-${relatedRoute}-${index}-${historyIndex}-${field.name}`"
                      v-model="historyEditValues[field.name]"
                      :options="[
                        ...(field.required ? [] : [{ value: '', label: `No ${prettyFieldName(field.name).toLowerCase()}` }]),
                        ...field.enum.map((value) => ({ value, label: prettyEnumValue(value) })),
                      ]"
                      :required="field.required"
                    />
                    <input
                      v-else-if="field.type === 'number'"
                      :id="`edit-history-${relatedRoute}-${index}-${historyIndex}-${field.name}`"
                      v-model="historyEditValues[field.name]"
                      type="number"
                      step="any"
                      :required="field.required"
                    />
                    <textarea
                      v-else-if="isLongTextField(field)"
                      :id="`edit-history-${relatedRoute}-${index}-${historyIndex}-${field.name}`"
                      v-model="historyEditValues[field.name]"
                      rows="4"
                      :required="field.required"
                    ></textarea>
                    <LoreDateInput
                      v-else-if="field.type === 'loreDate'"
                      v-model="historyEditValues[field.name]"
                      :required="field.required"
                    />
                    <input
                      v-else
                      :id="`edit-history-${relatedRoute}-${index}-${historyIndex}-${field.name}`"
                      v-model="historyEditValues[field.name]"
                      type="text"
                      :required="field.required"
                    />
                  </div>

                  <div class="form-actions">
                    <button class="primary-button" type="submit" :disabled="historyEditSaving">
                      {{ historyEditSaving ? 'Saving...' : 'Save' }}
                    </button>
                    <button
                      class="secondary-button"
                      type="button"
                      :disabled="historyEditSaving"
                      @click="cancelEditHistory"
                    >
                      Cancel
                    </button>
                  </div>

                  <p v-if="historyEditError" class="status-card error">{{ historyEditError }}</p>
                </form>
                <FieldList
                  v-else
                  :data="historyEntry"
                  :fields="relationSchemaForRoute(relatedRoute)[0]?.fields"
                />
              </article>
            </template>


            <p
              v-if="
                !isSimpleRelation(relatedRoute) &&
                !showRelationMetadata(record) &&
                historyDisplayPayload(record).length === 0
              "
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
