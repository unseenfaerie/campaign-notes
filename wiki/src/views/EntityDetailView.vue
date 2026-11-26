<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRouter } from 'vue-router'
import AddRelatedEntityForm from '../components/AddRelatedEntityForm.vue'
import CollapseSection from '../components/CollapseSection.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import DirectionSelect from '../components/DirectionSelect.vue'
import EditButton from '../components/EditButton.vue'
import FieldList from '../components/FieldList.vue'
import LastEditedStamp from '../components/LastEditedStamp.vue'
import ProposalBanner from '../components/ProposalBanner.vue'
import ProposalViewToggle from '../components/ProposalViewToggle.vue'
import RelationTimeline from '../components/RelationTimeline.vue'
import { ApiError } from '../services/apiClient'
import {
  getEntityFull,
  listEntities,
  updateEntity,
  updateRelation,
  deleteEntity,
  deleteRelation,
  proposeEntityEdit,
  amendEntityProposal,
  proposeRelationEdit,
  acceptProposal,
  rejectProposal,
  revokeProposal,
  getAliases,
  createAlias,
  routeToEntityType,
  type DomainEntity,
  type PendingProposal,
} from '../services/domainService'
import { refreshMentionTargets } from '../services/mentionService'
import {
  getEntitySchema,
  getDateSystem,
  getRelationSchemas,
  type EntityFieldSchema,
  type EntitySchema,
  type RelationFormSchema,
} from '../services/metaService'
import LoreDateInput from '../components/LoreDateInput.vue'
import RealDateInput from '../components/RealDateInput.vue'
import SearchableSelect from '../components/SearchableSelect.vue'
import LinkifiedText from '../components/LinkifiedText.vue'
import { useAuthStore } from '../stores/auth'
import { useProposalStore } from '../stores/proposals'
import { directionOptions, splitRelatedSections } from '../utils/relationDirection'
import { formatLoreDate, isCanonicalLoreDate, type DateSystem } from '../utils/loreDate'

type FullState = {
  entity: DomainEntity
  related: Record<string, DomainEntity[]>
}

const props = defineProps<{
  entityRoute: string
  id: string
}>()

const auth = useAuthStore()
const proposals = useProposalStore()
const router = useRouter()

const loading = ref(true)
const errorMessage = ref('')
const fullData = ref<FullState | null>(null)
const relatedSections = ref<ReturnType<typeof splitRelatedSections>>({ outgoing: [], incoming: [] })
const dateSystem = ref<DateSystem | null>(null)

const editingEntitySection = ref<'core' | 'exposition' | null>(null)
const isEditing = computed(() => editingEntitySection.value !== null)
const editFields = ref<EntityFieldSchema[]>([])
const editValues = ref<Record<string, any>>({})
const originalEditValues = ref<Record<string, any>>({})
const saving = ref(false)
const saveError = ref('')

const aliases = ref<DomainEntity[]>([])
const showAddAliasForm = ref(false)
const newAliasValue = ref('')
const aliasFormError = ref('')
const aliasSaving = ref(false)

const relationSchemas = ref<RelationFormSchema[]>([])
const entitySchema = ref<EntitySchema | null>(null)
const refOptionsByRoute = ref<Record<string, DomainEntity[]>>({})
const openAddFormRoute = ref<string | null>(null)
const showingNewRelatedPicker = ref(false)

const editingRelationKey = ref<string | null>(null)
const relationEditValues = ref<Record<string, any>>({})
const relationEditSaving = ref(false)
const relationEditError = ref('')

const editingHistoryKey = ref<string | null>(null)
const historyEditValues = ref<Record<string, any>>({})
const historyEditOriginalSelector = ref<{ key: string; value: string; anchorMemberIndex?: number } | null>(null)
const historyEditSaving = ref(false)
const historyEditError = ref('')
const directionSavingKey = ref<string | null>(null)
const directionError = ref('')
const directionDisabled = computed(() =>
  directionSavingKey.value !== null || isEditing.value || editingRelationKey.value !== null ||
  editingHistoryKey.value !== null || openAddFormRoute.value !== null ||
  showingNewRelatedPicker.value || showAddAliasForm.value || deleteModalOpen.value ||
  proposalActionBusy.value
)

// Proposal (player edit-request) state. Keyed per record so the same view can track
// proposal UI independently for the core entity and each relation/history record.
const viewModeByKey = ref<Record<string, 'proposed' | 'accepted'>>({})
const proposalActionBusy = ref(false)
const proposalActionError = ref('')

const deleteModalOpen = ref(false)
const deleteModalMessage = ref('')
const deleteModalBusy = ref(false)
const deleteModalError = ref('')
const pendingDeleteAction = ref<(() => Promise<void>) | null>(null)

const entityTitle = computed(() => entitySchema.value?.label ?? props.entityRoute)
const entityPageTitle = computed(() => {
  const entity = fullData.value ? effectiveEntity.value : null
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

const entityPendingProposal = computed(() => (fullData.value ? pendingProposalOf(fullData.value.entity) : null))
const isEntityLocked = computed(() => Boolean(fullData.value?.entity.locked))
const effectiveEntity = computed(() =>
  fullData.value ? withProposalView(fullData.value.entity, entityPendingProposal.value, 'entity') : {}
)

const entityDisplayData = computed(() => withoutIdField(effectiveEntity.value))

const entityExpositoryFields = computed(() =>
  expositoryFieldEntries(effectiveEntity.value, entitySchema.value?.fields)
)

const entityFactsData = computed(() =>
  Object.fromEntries(
    Object.entries(entityDisplayData.value).filter(
      ([key]) =>
        !entitySchema.value?.fields.some((field) => field.name === key && field.hidden) &&
        key !== 'name' &&
        !entitySchema.value?.fields.some((field) => field.name === key && field.expository)
    )
  )
)

const hasEntityFacts = computed(() => Object.keys(entityFactsData.value).length > 0)
const orderedRelationGroups = computed(() => {
  const roles = props.entityRoute === 'places'
    ? [{ label: 'Parent', anchor: 0 }, { label: 'Children', anchor: 1 }]
    : props.entityRoute === 'events'
      ? [{ label: 'Previous Events', anchor: 1 }, { label: 'Next Events', anchor: 0 }]
      : []
  const records = fullData.value?.related[props.entityRoute] ?? []
  return roles.map(({ label, anchor }) => ({
    label,
    records: records.filter((record) => relationPayload(record).relationAnchorIndex === anchor),
  }))
})

const entityFactsFields = computed(() =>
  (entitySchema.value?.fields || []).filter(
    (field) =>
      !field.hidden &&
      field.name !== 'name' &&
      !field.expository
  )
)

const relatedSectionGroups = computed(() => [
  { key: 'outgoing', title: 'Outgoing Related Data', sections: relatedSections.value.outgoing },
  ...(auth.isAdmin.value
    ? [{ key: 'incoming', title: 'Incoming Related Data', sections: relatedSections.value.incoming }]
    : []),
])

const missingRelationSections = computed(() => {
  const outgoingRoutes = new Set(relatedSections.value.outgoing.map(([route]) => route))
  return relationSchemas.value.filter((schema) => !outgoingRoutes.has(schema.relatedRoute))
})

function titleCaseLabel(label: string): string {
  if (!label) {
    return ''
  }

  return label.charAt(0).toUpperCase() + label.slice(1)
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

// Fields returned by the API that aren't manifest-declared display fields (audit stamp columns
// live on every table, pendingProposal is attached per-request) and so need explicit stripping
// here rather than relying on the schema-driven hidden/expository filters used elsewhere.
const NON_DISPLAY_FIELDS = ['id', 'pendingProposal', 'last_edited_by', 'last_edited_at', 'relationAnchorIndex', 'visibility_direction', 'timeline']

function withoutIdField(record: DomainEntity): DomainEntity {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !NON_DISPLAY_FIELDS.includes(key)))
}

function domainEntitySignature(record: DomainEntity): string {
  return JSON.stringify(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right))
  )
}

function relationDisplayPayload(record: DomainEntity): DomainEntity {
  return withoutIdField(relationPayload(record))
}

// Like relationDisplayPayload, but reflects the proposed/accepted toggle for a given relation row
// and keeps last_edited_by/at + pendingProposal intact (factsData strips those from the rendered fields).
function relationDisplayPayloadForView(viewKey: string, record: DomainEntity): DomainEntity {
  const payload = relationPayload(record)
  return withProposalView(payload, pendingProposalOf(payload), viewKey)
}

function historyDisplayPayload(record: DomainEntity): DomainEntity[] {
  return historyPayload(record)
}

function historyEntryForView(viewKey: string, historyEntry: DomainEntity): DomainEntity {
  return withProposalView(historyEntry, pendingProposalOf(historyEntry), viewKey)
}

function showRelationMetadata(record: DomainEntity): boolean {
  const relation = relationDisplayPayload(record)
  if (Object.keys(relation).length === 0) {
    return false
  }

  const relationSignature = domainEntitySignature(relation)
  return !historyDisplayPayload(record).some((entry) => domainEntitySignature(withoutIdField(entry)) === relationSignature)
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

async function loadDetail(options: { silent?: boolean } = {}) {
  // Silent refreshes keep the article mounted so open/closed relation sections aren't reset.
  if (!options.silent) {
    loading.value = true
  }
  errorMessage.value = ''
  directionError.value = ''
  editingEntitySection.value = null
  openAddFormRoute.value = null
  showingNewRelatedPicker.value = false
  editingRelationKey.value = null
  editingHistoryKey.value = null
  showAddAliasForm.value = false
  newAliasValue.value = ''
  aliasFormError.value = ''

  try {
    const [full, schema, relations, fetchedAliases, fetchedDateSystem] = await Promise.all([
      getEntityFull(props.entityRoute, props.id),
      getEntitySchema(props.entityRoute),
      getRelationSchemas(props.entityRoute),
      getAliases(routeToEntityType(props.entityRoute), props.id),
      getDateSystem(),
    ])
    const sections = splitRelatedSections(full.related || {}, auth.isAdmin.value)
    fullData.value = full
    relatedSections.value = sections
    entitySchema.value = schema || null
    relationSchemas.value = relations
    aliases.value = fetchedAliases
    dateSystem.value = fetchedDateSystem

    const refRoutes = [...new Set((schema?.fields ?? []).map((field) => field.ref).filter((route): route is string => !!route))]
    const loadedOptions = await Promise.all(refRoutes.map((route) => listEntities(route)))
    refOptionsByRoute.value = Object.fromEntries(
      refRoutes.map((route, index) => [
        route,
        loadedOptions[index]
          .filter((option) => !(route === props.entityRoute && String(option.id) === props.id))
          .sort((left, right) => String(left.name || left.id).localeCompare(String(right.name || right.id))),
      ])
    )
  } catch (error) {
    if (error instanceof Error) {
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

function relationAnchor(relatedRoute: string, payload: DomainEntity): number {
  const index = payload.relationAnchorIndex
  return index === 0 || index === 1 ? index : (findRelationSchema(relatedRoute)?.anchorMemberIndex ?? 0)
}

function relationSelector(relatedRoute: string, payload: DomainEntity): { anchorMemberIndex?: number } {
  return relatedRoute === props.entityRoute
    ? { anchorMemberIndex: relationAnchor(relatedRoute, payload) }
    : {}
}

function historyEntryLabel(relatedRoute: string, entry: DomainEntity): string {
  const key = findRelationSchema(relatedRoute)?.historyKey
  const rawDate = key ? entry[key] : undefined
  const date = typeof rawDate === 'string'
    ? (dateSystem.value && isCanonicalLoreDate(rawDate) ? formatLoreDate(dateSystem.value, rawDate) : rawDate)
    : 'Undated'
  const description = typeof entry.short_description === 'string' ? entry.short_description.trim() : ''
  return description ? `${date}: ${description}` : date
}

async function changeRelationDirection(
  relatedRoute: string,
  record: DomainEntity,
  payload: DomainEntity,
  key: string,
  history: boolean,
  direction: string,
) {
  directionError.value = ''
  directionSavingKey.value = key
  const sourceRoute = props.entityRoute
  const sourceId = props.id
  let saved = false
  try {
    const selector: { key?: string; value?: string; anchorMemberIndex?: number } = relationSelector(relatedRoute, payload)
    if (history) {
      const historyField = findRelationSchema(relatedRoute)?.historyKey
      const historyValue = historyField ? payload[historyField] : undefined
      if (!historyField || typeof historyValue !== 'string' || !historyValue) {
        throw new Error('Missing history record selector')
      }
      selector.key = historyField
      selector.value = historyValue
    }

    if (!directionOptions(relationAnchor(relatedRoute, payload)).some(option => option.value === direction)) {
      throw new Error('Invalid relation visibility direction')
    }
    const result = await updateRelation(sourceRoute, sourceId, relatedRoute, relatedRecordId(record), {
      visibility_direction: direction,
    }, selector)
    saved = true
    if (props.entityRoute !== sourceRoute || props.id !== sourceId) return
    if (result.record.visibility_direction !== direction) {
      throw new Error('The saved relation direction did not match the requested direction')
    }

    const full = await getEntityFull(sourceRoute, sourceId)
    if (props.entityRoute !== sourceRoute || props.id !== sourceId) return
    const sections = splitRelatedSections(full.related || {}, auth.isAdmin.value)
    fullData.value = full
    relatedSections.value = sections
  } catch (error) {
    if (props.entityRoute !== sourceRoute || props.id !== sourceId) return
    const message = error instanceof Error ? error.message : 'Unexpected error'
    if (saved) {
      errorMessage.value = `Direction update may have been saved, but the detail view could not be updated: ${message}`
    } else {
      directionError.value = `Could not change relation direction: ${message}`
    }
  } finally {
    directionSavingKey.value = null
  }
}

function relatedEntityLabel(relatedRoute: string): string {
  return findRelationSchema(relatedRoute)?.relatedEntityLabel ?? relatedRoute
}

function isSimpleRelation(relatedRoute: string): boolean {
  return findRelationSchema(relatedRoute)?.kind === 'simple'
}

function isRelationshipKind(relatedRoute: string): boolean {
  return findRelationSchema(relatedRoute)?.kind === 'relationship'
}

function isHistoryKind(relatedRoute: string): boolean {
  return findRelationSchema(relatedRoute)?.kind === 'history'
}

// Simple relations only ever show a title/link, so there's nothing to collapse.
function hasCollapsibleRecordBody(relatedRoute: string): boolean {
  return !isSimpleRelation(relatedRoute)
}

const collapsedRecordKeys = ref<Set<string>>(new Set())

function recordKey(group: string, relatedRoute: string, record: DomainEntity, index: number): string {
  const identity = record.locked || !relatedRecordId(record) ? `index-${index}` : isHistoryKind(relatedRoute)
    ? 'history'
    : String(relationPayload(record).relationAnchorIndex)
  return JSON.stringify([group, relatedRoute, relatedRecordId(record), identity])
}

function historyKey(key: string, relatedRoute: string, historyEntry: DomainEntity): string {
  const field = findRelationSchema(relatedRoute)?.historyKey
  return JSON.stringify([key, historyEntry.relationAnchorIndex, field ? historyEntry[field] : null])
}

function isRecordCollapsed(key: string): boolean {
  return collapsedRecordKeys.value.has(key)
}

function expandRecord(key: string) {
  collapsedRecordKeys.value.delete(key)
}

function toggleRecordCollapse(key: string) {
  if (collapsedRecordKeys.value.has(key)) {
    collapsedRecordKeys.value.delete(key)
  } else {
    collapsedRecordKeys.value.add(key)
  }
}

function openDeleteConfirm(message: string, action: () => Promise<void>) {
  deleteModalMessage.value = message
  pendingDeleteAction.value = action
  deleteModalError.value = ''
  deleteModalOpen.value = true
}

function cancelDeleteConfirm() {
  if (deleteModalBusy.value) {
    return
  }

  deleteModalOpen.value = false
  pendingDeleteAction.value = null
}

async function confirmDeleteConfirm() {
  if (!pendingDeleteAction.value) {
    return
  }

  deleteModalBusy.value = true
  deleteModalError.value = ''

  try {
    await pendingDeleteAction.value()
    deleteModalOpen.value = false
    pendingDeleteAction.value = null
  } catch (error) {
    if (error instanceof ApiError || error instanceof Error) {
      deleteModalError.value = error.message
    } else {
      deleteModalError.value = 'Could not delete this record.'
    }
  } finally {
    deleteModalBusy.value = false
  }
}

function confirmDeleteEntity() {
  openDeleteConfirm(`Delete this ${entityPageTitle.value}? This cannot be undone.`, async () => {
    await deleteEntity(props.entityRoute, props.id)
    router.push({ name: 'entity-list', params: { entityRoute: props.entityRoute } })
  })
}

function confirmDeleteRelation(relatedRoute: string, record: DomainEntity) {
  openDeleteConfirm(
    `Remove this ${relatedEntityLabel(relatedRoute)} relationship with ${relatedRecordLabel(record)}?`,
    async () => {
      await deleteRelation(props.entityRoute, props.id, relatedRoute, relatedRecordId(record), relationSelector(relatedRoute, relationPayload(record)))
      await loadDetail({ silent: true })
    }
  )
}

function confirmDeleteHistoryEntry(relatedRoute: string, record: DomainEntity, historyEntry: DomainEntity) {
  const schema = findRelationSchema(relatedRoute)
  if (!schema || !schema.historyKey) {
    return
  }

  const selector = { key: schema.historyKey, value: String(historyEntry[schema.historyKey] ?? ''), ...relationSelector(relatedRoute, historyEntry) }

  openDeleteConfirm(`Delete this history record for ${relatedRecordLabel(record)}?`, async () => {
    await deleteRelation(props.entityRoute, props.id, relatedRoute, relatedRecordId(record), selector)
    await loadDetail({ silent: true })
  })
}

function editableFields(fields: EntityFieldSchema[]): EntityFieldSchema[] {
  return fields.filter((field) => !field.primary && !field.hidden)
}

function proposableFields(fields: EntityFieldSchema[]): EntityFieldSchema[] {
  return fields.filter((field) => field.proposable)
}

// The single edit/propose form uses this to decide which fields it renders: admins get the full
// editable set, everyone else is limited to manifest-flagged proposable fields.
function fieldsForRole(fields: EntityFieldSchema[]): EntityFieldSchema[] {
  return auth.isAdmin.value ? editableFields(fields) : proposableFields(fields)
}

// Merges any pending proposal's changes on top of the live record when the viewer has the
// "Proposed" toggle selected; otherwise shows the plain (currently accepted) record.
function withProposalView(record: DomainEntity, proposal: PendingProposal | null | undefined, viewKey: string): DomainEntity {
  if (!proposal || getViewMode(viewKey) !== 'proposed') {
    return record
  }
  return { ...record, ...proposal.proposedChanges }
}

function getViewMode(viewKey: string): 'proposed' | 'accepted' {
  return viewModeByKey.value[viewKey] ?? 'proposed'
}

function setViewMode(viewKey: string, mode: 'proposed' | 'accepted') {
  viewModeByKey.value = { ...viewModeByKey.value, [viewKey]: mode }
}

function pendingProposalOf(record: DomainEntity): PendingProposal | null {
  const candidate = (record as any).pendingProposal
  return candidate && typeof candidate === 'object' ? (candidate as PendingProposal) : null
}

function isProposalAuthor(proposal: PendingProposal): boolean {
  return proposal.proposedById === auth.user.value?.id
}

async function acceptPendingProposal(proposal: PendingProposal) {
  proposalActionError.value = ''
  proposalActionBusy.value = true
  try {
    await acceptProposal(proposal.id)
    if (auth.isAuthenticated.value && auth.isAdmin.value) void proposals.refresh()
    await loadDetail({ silent: true })
  } catch (error) {
    proposalActionError.value = error instanceof Error ? error.message : 'Could not accept this proposal.'
  } finally {
    proposalActionBusy.value = false
  }
}

async function rejectPendingProposal(proposal: PendingProposal) {
  proposalActionError.value = ''
  proposalActionBusy.value = true
  try {
    await rejectProposal(proposal.id)
    if (auth.isAuthenticated.value && auth.isAdmin.value) void proposals.refresh()
    await loadDetail({ silent: true })
  } catch (error) {
    proposalActionError.value = error instanceof Error ? error.message : 'Could not reject this proposal.'
  } finally {
    proposalActionBusy.value = false
  }
}

async function revokePendingProposal(proposal: PendingProposal) {
  proposalActionError.value = ''
  proposalActionBusy.value = true
  try {
    await revokeProposal(proposal.id)
    if (auth.isAuthenticated.value && auth.isAdmin.value) void proposals.refresh()
    await loadDetail({ silent: true })
  } catch (error) {
    proposalActionError.value = error instanceof Error ? error.message : 'Could not revoke this proposal.'
  } finally {
    proposalActionBusy.value = false
  }
}

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
  { clearOptionalLoreDates = false, clearOptionalReferences = false, clearOptionalValues = false } = {}
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  for (const field of fields) {
    const rawValue = values[field.name]

    if (field.type === 'boolean') {
      payload[field.name] = rawValue === true
      continue
    }

    if (field.type === 'number') {
      if (rawValue === '' || rawValue === null || rawValue === undefined) {
        if (field.required) {
          throw new Error(`${prettyFieldName(field.name)} is required.`)
        }
        if (clearOptionalValues) payload[field.name] = null
        continue
      }
      payload[field.name] = Number(rawValue)
      continue
    }

    const text = typeof rawValue === 'string' ? rawValue.trim() : ''
    if (text === '') {
      if (field.required) {
        throw new Error(`${prettyFieldName(field.name)} is required.`)
      }
      if (clearOptionalValues || (clearOptionalLoreDates && (field.type === 'loreDate' || field.type === 'realDate'))) {
        payload[field.name] = null
      }
      if (clearOptionalReferences && field.ref) {
        payload[field.name] = null
      }
      continue
    }

    payload[field.name] = text
  }

  return payload
}

function startEditRelation(relatedRoute: string, record: DomainEntity, key: string) {
  const schema = findRelationSchema(relatedRoute)
  if (!schema) {
    return
  }

  relationEditError.value = ''
  relationEditValues.value = fieldValuesFromRecord(fieldsForRole(schema.fields), relationPayload(record))
  editingRelationKey.value = key
  expandRecord(key)
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
    if (auth.isAdmin.value) {
      await updateRelation(props.entityRoute, props.id, relatedRoute, relatedRecordId(record), payload, relationSelector(relatedRoute, relationPayload(record)))
    } else {
      await proposeRelationEdit(props.entityRoute, props.id, relatedRoute, relatedRecordId(record), payload, relationSelector(relatedRoute, relationPayload(record)))
    }
    editingRelationKey.value = null
    await loadDetail({ silent: true })
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

function canOpenRelationEdit(relatedRoute: string): boolean {
  const schema = findRelationSchema(relatedRoute)
  if (!schema) {
    return false
  }
  return auth.isAdmin.value || proposableFields(schema.fields).length > 0
}

function startEditHistory(relatedRoute: string, recordKey: string, historyEntry: DomainEntity, entryKey: string) {
  const schema = findRelationSchema(relatedRoute)
  if (!schema || !schema.historyKey) {
    return
  }

  const originalValue = historyEntry[schema.historyKey]

  historyEditError.value = ''
  historyEditValues.value = fieldValuesFromRecord(fieldsForRole(schema.fields), historyEntry)
  historyEditOriginalSelector.value = { key: schema.historyKey, value: String(originalValue ?? ''), ...relationSelector(relatedRoute, historyEntry) }
  editingHistoryKey.value = entryKey
  expandRecord(recordKey)
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
    if (auth.isAdmin.value) {
      await updateRelation(
        props.entityRoute,
        props.id,
        relatedRoute,
        relatedRecordId(record),
        payload,
        historyEditOriginalSelector.value
      )
    } else {
      await proposeRelationEdit(
        props.entityRoute,
        props.id,
        relatedRoute,
        relatedRecordId(record),
        payload,
        historyEditOriginalSelector.value
      )
    }
    editingHistoryKey.value = null
    await loadDetail({ silent: true })
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
  await loadDetail({ silent: true })
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
  return field.type === 'string' && !!field.expository
}

function refOptionsFor(field: EntityFieldSchema): DomainEntity[] {
  return field.ref ? refOptionsByRoute.value[field.ref] ?? [] : []
}

// Splits a relation/history payload into non-expository "facts" and expository (long-text) fields,
// mirroring the core entity data box + description layout.
function factsData(data: DomainEntity, fields?: EntityFieldSchema[]): DomainEntity {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([key]) => !NON_DISPLAY_FIELDS.includes(key) && !fields?.some((field) => field.name === key && field.expository)
    )
  )
}

function factsFields(fields?: EntityFieldSchema[]): EntityFieldSchema[] {
  return (fields || []).filter((field) => !field.expository)
}

function expositoryFieldEntries(data: DomainEntity, fields?: EntityFieldSchema[]): Array<{ name: string; label?: string; value: string }> {
  return (fields || []).flatMap((field) => {
    const value = data[field.name]
    return field.expository && (!field.dmOnly || auth.isAdmin.value) &&
      typeof value === 'string' && value.trim() ? [{ name: field.name, label: field.label, value }] : []
  })
}

function canEditEntityField(field: EntityFieldSchema): boolean {
  const proposal = entityPendingProposal.value
  return !field.primary &&
    (auth.isAdmin.value || Boolean(field.proposable)) &&
    (!proposal || (!auth.isAdmin.value && isProposalAuthor(proposal)))
}

const entityEditorBusy = computed(() =>
  directionSavingKey.value !== null || editingRelationKey.value !== null ||
  editingHistoryKey.value !== null || openAddFormRoute.value !== null ||
  showingNewRelatedPicker.value || showAddAliasForm.value || deleteModalOpen.value ||
  proposalActionBusy.value
)

function startEdit(section: 'core' | 'exposition') {
  saveError.value = ''

  const schema = entitySchema.value
  const entity = fullData.value?.entity
  if (!schema || !entity || isEditing.value || entityEditorBusy.value) {
    return
  }

  editFields.value = schema.fields.filter((field) =>
    canEditEntityField(field) && (section === 'core' ? !field.expository : field.expository)
  )
  if (editFields.value.length === 0) return
  const proposed = entityPendingProposal.value
  const editRecord = proposed ? { ...entity, ...proposed.proposedChanges } : entity
  editValues.value = fieldValuesFromRecord(editFields.value, editRecord)
  originalEditValues.value = { ...editValues.value }

  editingEntitySection.value = section
}

function cancelEdit() {
  editingEntitySection.value = null
  saveError.value = ''
}

function buildEditPayload(): Record<string, unknown> {
  const changedFields = editFields.value.filter((field) => editValues.value[field.name] !== originalEditValues.value[field.name])
  const payload = buildFieldsPayload(changedFields, editValues.value, { clearOptionalValues: true })
  const entity = fullData.value?.entity
  const proposal = entityPendingProposal.value
  const current = proposal ? { ...entity, ...proposal.proposedChanges } : entity
  for (const [name, value] of Object.entries(payload)) {
    if (proposal && value === null && entity?.[name] === '') payload[name] = ''
    const currentValue = current?.[name]
    if (currentValue === payload[name] || (payload[name] === null && (currentValue === null || currentValue === undefined))) {
      delete payload[name]
    }
  }
  return payload
}

async function saveEdit() {
  saveError.value = ''
  saving.value = true

  try {
    const payload = buildEditPayload()
    if (Object.keys(payload).length === 0) {
      cancelEdit()
      return
    }
    if (auth.isAdmin.value) {
      const updated = await updateEntity(props.entityRoute, props.id, payload)
      if (fullData.value) {
        fullData.value.entity = { ...fullData.value.entity, ...updated }
      }
    } else {
      const pending = entityPendingProposal.value
      const proposal = pending
        ? await amendEntityProposal(props.entityRoute, props.id, pending.id, payload)
        : await proposeEntityEdit(props.entityRoute, props.id, payload)
      if (fullData.value) {
        fullData.value.entity = { ...fullData.value.entity, pendingProposal: proposal }
      }
      setViewMode('entity', 'proposed')
    }
    editingEntitySection.value = null
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

const canEditEntityCore = computed(() =>
  (entitySchema.value?.fields || []).some((field) => !field.expository && canEditEntityField(field))
)
const canEditEntityExposition = computed(() =>
  (entitySchema.value?.fields || []).some((field) => field.expository && canEditEntityField(field))
)
const entityEditDirty = computed(() =>
  isEditing.value && JSON.stringify(editValues.value) !== JSON.stringify(originalEditValues.value)
)

function confirmLeaveEntityEdit(): boolean {
  return !saving.value && (!entityEditDirty.value || window.confirm('Discard your unsaved entity edits?'))
}

function warnBeforeUnload(event: BeforeUnloadEvent) {
  if (entityEditDirty.value || saving.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}

onBeforeRouteLeave(confirmLeaveEntityEdit)
onBeforeRouteUpdate((to, from) =>
  (to.params.entityRoute === from.params.entityRoute && to.params.id === from.params.id) || confirmLeaveEntityEdit()
)

function toggleAddAliasForm() {
  showAddAliasForm.value = !showAddAliasForm.value
  if (showAddAliasForm.value) {
    newAliasValue.value = ''
    aliasFormError.value = ''
  }
}

async function submitAddAlias() {
  aliasFormError.value = ''
  
  const aliasText = newAliasValue.value.trim()
  if (!aliasText) {
    aliasFormError.value = 'Alias cannot be empty.'
    return
  }

  aliasSaving.value = true

  try {
    const entity = fullData.value?.entity
    if (!entity) {
      throw new Error('Entity data is not loaded.')
    }

    await createAlias(routeToEntityType(props.entityRoute), props.id, aliasText, Boolean(entity.is_public))
    refreshMentionTargets()
    newAliasValue.value = ''
    showAddAliasForm.value = false
    await loadDetail({ silent: true })
  } catch (error) {
    if (error instanceof ApiError || error instanceof Error) {
      aliasFormError.value = error.message
    } else {
      aliasFormError.value = 'Could not create alias.'
    }
  } finally {
    aliasSaving.value = false
  }
}

function cancelAddAlias() {
  showAddAliasForm.value = false
  newAliasValue.value = ''
  aliasFormError.value = ''
}

const baseDocumentTitle = document.title
watch(
  () => (fullData.value ? entityPageTitle.value : null),
  (title) => {
    document.title = title ?? baseDocumentTitle
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  document.title = baseDocumentTitle
  window.removeEventListener('beforeunload', warnBeforeUnload)
})

onMounted(() => {
  window.addEventListener('beforeunload', warnBeforeUnload)
  loadDetail()
})
watch(() => [props.entityRoute, props.id], () => loadDetail())
</script>

<template>
  <section>
    <header class="view-header entity-detail-header">
      <h1>{{ entityPageTitle }}</h1>
      <div
        v-if="fullData && !isEntityLocked && auth.isAdmin.value && !isEditing && !entityPendingProposal"
        class="button-group"
      >
        <button
          type="button"
          class="secondary-button"
          :disabled="directionSavingKey !== null"
          @click="toggleAddAliasForm"
        >
          {{ showAddAliasForm ? 'Cancel' : 'Add Alias' }}
        </button>
        <button
          type="button"
          class="danger-button"
          :disabled="directionSavingKey !== null"
          @click="confirmDeleteEntity"
        >
          Delete
        </button>
      </div>
      <p v-if="!loading && !errorMessage && fullData && !isEntityLocked && aliases.length > 0" class="aliases-list">
        <em>A.K.A {{ aliases.map(a => a.alias).join(', ') }}</em>
      </p>
    </header>

    <p v-if="loading" class="status-card">Loading entity detail...</p>
    <p v-else-if="errorMessage" class="status-card error">{{ errorMessage }}</p>

    <article v-else-if="fullData" class="wiki-article">
      <section v-if="isEntityLocked" class="core-data-section">
        <div class="entity-overview">
          <div class="entity-facts">
            <h3>Core data</h3>
            <p class="status-card">Locked</p>
          </div>
        </div>
      </section>
      <template v-else>
      <section class="core-data-section">
        <ProposalBanner
          v-if="entityPendingProposal"
          :proposal="entityPendingProposal"
          :is-admin="auth.isAdmin.value"
          :is-author="isProposalAuthor(entityPendingProposal)"
          :busy="proposalActionBusy || directionSavingKey !== null || isEditing"
          :error-message="proposalActionError"
          @accept="acceptPendingProposal(entityPendingProposal)"
          @reject="rejectPendingProposal(entityPendingProposal)"
          @revoke="revokePendingProposal(entityPendingProposal)"
        />
        <p v-if="entityPendingProposal && isProposalAuthor(entityPendingProposal)" class="field-hint">
          You can continue editing this proposal until the DM reviews it. Restoring all fields to their accepted values withdraws it.
        </p>

        <form v-if="showAddAliasForm" class="entity-form" @submit.prevent="submitAddAlias">
          <div class="form-row">
            <label for="new-alias-input">New Alias</label>
            <input
              id="new-alias-input"
              v-model="newAliasValue"
              type="text"
              placeholder="Enter alias name"
              :disabled="aliasSaving"
            />
          </div>

          <div class="form-actions">
            <button class="primary-button" type="submit" :disabled="aliasSaving">
              {{ aliasSaving ? 'Saving...' : 'Save' }}
            </button>
            <button class="secondary-button" type="button" :disabled="aliasSaving" @click="cancelAddAlias">Cancel</button>
          </div>

          <p v-if="aliasFormError" class="status-card error">{{ aliasFormError }}</p>
        </form>

        <div class="entity-overview">
        <div class="entity-facts">
        <div class="inline-edit-heading entity-section-heading">
          <h3>Core data</h3>
          <EditButton
            v-if="canEditEntityCore && !isEditing"
            label="Edit core data"
            :disabled="entityEditorBusy"
            @click="startEdit('core')"
          />
        </div>
        <form v-if="editingEntitySection === 'core'" class="entity-form" @submit.prevent="saveEdit">
          <fieldset class="inline-editor-fields" :disabled="saving">
          <div v-for="field in editFields" :key="field.name" class="form-row">
            <label v-if="field.type !== 'loreDate'" :for="`edit-field-${field.name}`">
              {{ field.label || prettyFieldName(field.name) }}
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
              v-else-if="field.ref"
              :id="`edit-field-${field.name}`"
              v-model="editValues[field.name]"
              :options="[
                ...(field.required ? [] : [{ value: '', label: `No ${prettyFieldName(field.name).toLowerCase()}` }]),
                ...refOptionsFor(field).map((option) => ({ value: String(option.id), label: String(option.name || option.id) })),
              ]"
              :required="field.required"
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
            <LoreDateInput
              v-else-if="field.type === 'loreDate'"
              v-model="editValues[field.name]"
              :label="field.label || prettyFieldName(field.name)"
              :required="field.required"
            />
            <RealDateInput
              v-else-if="field.type === 'realDate'"
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
          </fieldset>

          <div class="form-actions">
            <button class="primary-button" type="submit" :disabled="saving">
              {{ saving ? 'Saving...' : (auth.isAdmin.value ? 'Save' : (entityPendingProposal ? 'Update Proposal' : 'Submit Proposal')) }}
            </button>
            <button class="secondary-button" type="button" :disabled="saving" @click="cancelEdit">Cancel</button>
          </div>

          <p v-if="saveError" class="status-card error" role="alert">{{ saveError }}</p>
        </form>
          <FieldList
            v-else-if="hasEntityFacts || orderedRelationGroups.some((group) => group.records.length)"
            :data="entityFactsData"
            :fields="entityFactsFields"
            empty-message="No entity fields are available."
          >
            <template #after-fields>
              <template v-for="group in orderedRelationGroups" :key="group.label">
                <template v-if="group.records.length">
                <dt>{{ group.label }}</dt>
                <dd>
                  <template v-for="(record, index) in group.records" :key="String(record.id)">
                    <span v-if="index > 0">, </span>
                    <RouterLink
                      v-if="relatedRecordId(record)"
                      :to="{ name: 'entity-detail', params: { entityRoute, id: relatedRecordId(record) } }"
                    >
                      {{ relatedRecordLabel(record) }}
                    </RouterLink>
                    <template v-else>{{ relatedRecordLabel(record) }}</template>
                  </template>
                </dd>
                </template>
              </template>
            </template>
          </FieldList>
        </div>
          <div v-if="entityExpositoryFields.length > 0 || canEditEntityExposition || editingEntitySection === 'exposition'" class="entity-long-description">
            <div class="inline-edit-heading entity-section-heading">
              <h3>Exposition</h3>
              <EditButton
                v-if="canEditEntityExposition && !isEditing"
                label="Edit exposition"
                :disabled="entityEditorBusy"
                @click="startEdit('exposition')"
              />
            </div>
            <form v-if="editingEntitySection === 'exposition'" class="entity-form entity-exposition-form" @submit.prevent="saveEdit">
              <fieldset class="inline-editor-fields" :disabled="saving">
                <div v-for="field in editFields" :key="field.name" class="form-row">
                  <label :for="`edit-field-${field.name}`">
                    {{ field.label || prettyFieldName(field.name) }}
                    <span v-if="field.required" class="required-marker" aria-hidden="true">*</span>
                  </label>
                  <textarea
                    :id="`edit-field-${field.name}`"
                    v-model="editValues[field.name]"
                    rows="4"
                    :required="field.required"
                  ></textarea>
                </div>
              </fieldset>
              <div class="form-actions">
                <button class="primary-button" type="submit" :disabled="saving">
                  {{ saving ? 'Saving...' : (auth.isAdmin.value ? 'Save' : (entityPendingProposal ? 'Update Proposal' : 'Submit Proposal')) }}
                </button>
                <button class="secondary-button" type="button" :disabled="saving" @click="cancelEdit">Cancel</button>
              </div>
              <p v-if="saveError" class="status-card error" role="alert">{{ saveError }}</p>
            </form>
            <template v-for="field in entityExpositoryFields" :key="field.name">
              <template v-if="editingEntitySection !== 'exposition' || !editFields.some((entry) => entry.name === field.name)">
                <h4>{{ field.label || prettyFieldName(field.name) }}</h4>
                <p><LinkifiedText :text="field.value" /></p>
              </template>
            </template>
          </div>
        </div>

        <LastEditedStamp :by="(fullData.entity as any).last_edited_by" :at="(fullData.entity as any).last_edited_at" />
        <ProposalViewToggle
          v-if="entityPendingProposal"
          :model-value="getViewMode('entity')"
          @update:model-value="(mode) => setViewMode('entity', mode)"
        />

      </section>

      <fieldset class="related-edit-lock" :disabled="isEditing">
      <p v-if="directionError" class="status-card error" role="alert">{{ directionError }}</p>
      <template v-for="group in relatedSectionGroups" :key="group.key">
      <div
        v-if="
          group.sections.length > 0 ||
          (group.key === 'outgoing' && auth.isAdmin.value && missingRelationSections.length > 0)
        "
        class="section-heading-row related-section-heading-row"
      >
        <h3>{{ group.title }}</h3>
        <button
          v-if="group.key === 'outgoing' && auth.isAdmin.value && missingRelationSections.length > 0 && !showingNewRelatedPicker"
          type="button"
          class="secondary-button"
          :disabled="directionSavingKey !== null"
          @click="showingNewRelatedPicker = true"
        >
          New Related Entity
        </button>
      </div>

      <section v-if="group.key === 'outgoing' && auth.isAdmin.value && missingRelationSections.length > 0 && showingNewRelatedPicker" class="article-section">
        <AddRelatedEntityForm
          :entity-route="entityRoute"
          :id="id"
          :options="missingRelationSections"
          @created="onRelationCreated"
          @cancel="showingNewRelatedPicker = false"
        />
      </section>

      <CollapseSection
        v-for="[relatedRoute, records] in group.sections"
        :key="relatedRoute"
        :ref="(instance) => group.key === 'outgoing' && setCollapseSectionRef(relatedRoute, instance)"
        class="article-section"
        :title="titleCaseLabel(relatedEntityLabel(relatedRoute))"
        :count="records.length"
        :initially-open="false"
      >
        <template v-if="auth.isAdmin.value && group.key === 'outgoing'" #header-actions>
          <button type="button" class="secondary-button" :disabled="directionSavingKey !== null" @click="toggleAddForm(relatedRoute)">
            {{ openAddFormRoute === relatedRoute ? 'Cancel' : 'New' }}
          </button>
        </template>

        <div>
          <AddRelatedEntityForm
            v-if="group.key === 'outgoing' && openAddFormRoute === relatedRoute"
            :entity-route="entityRoute"
            :id="id"
            :options="relationSchemaForRoute(relatedRoute)"
            :default-related-route="relatedRoute"
            @created="onRelationCreated"
            @cancel="openAddFormRoute = null"
          />

          <article v-for="(record, index) in records" :key="recordKey(group.key, relatedRoute, record, index)" class="related-record">
            <div class="section-heading-row">
              <h4>
                <button
                  v-if="hasCollapsibleRecordBody(relatedRoute) && !record.locked"
                  type="button"
                  class="record-collapse-toggle"
                  :class="{ 'is-expanded': !isRecordCollapsed(recordKey(group.key, relatedRoute, record, index)) }"
                  :aria-expanded="!isRecordCollapsed(recordKey(group.key, relatedRoute, record, index))"
                  :aria-label="isRecordCollapsed(recordKey(group.key, relatedRoute, record, index)) ? 'Expand details' : 'Collapse details'"
                  @click="toggleRecordCollapse(recordKey(group.key, relatedRoute, record, index))"
                >
                  ▸
                </button>
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
                <small v-if="entityRoute === 'places' && relatedRoute === 'places'">
                  ({{ relationPayload(record).relationAnchorIndex === 0 ? 'Parent' : 'Child' }})
                </small>
                <small v-else-if="entityRoute === 'events' && relatedRoute === 'events'">
                  ({{ relationPayload(record).relationAnchorIndex === 0 ? 'Next' : 'Previous' }})
                </small>
              </h4>
              <div v-if="!record.locked" class="row-actions-end">
                <DirectionSelect
                  v-if="auth.isAdmin.value && !isHistoryKind(relatedRoute) && !findRelationSchema(relatedRoute)?.fields.find(field => field.name === 'visibility_direction')?.hidden && !pendingProposalOf(relationPayload(record))"
                  :direction="relationPayload(record).visibility_direction"
                  :anchor-member-index="relationAnchor(relatedRoute, relationPayload(record))"
                  :subject="relatedRecordLabel(record)"
                  :disabled="directionDisabled"
                  :saving="directionSavingKey === recordKey(group.key, relatedRoute, record, index)"
                  @change="changeRelationDirection(relatedRoute, record, relationPayload(record), recordKey(group.key, relatedRoute, record, index), false, $event)"
                />
                <button
                  v-if="(isRelationshipKind(relatedRoute) || (isSimpleRelation(relatedRoute) && auth.isAdmin.value)) && canOpenRelationEdit(relatedRoute) && editingRelationKey !== recordKey(group.key, relatedRoute, record, index) && !pendingProposalOf(relationPayload(record))"
                  type="button"
                  class="secondary-button"
                  :disabled="directionSavingKey !== null"
                  @click="startEditRelation(relatedRoute, record, recordKey(group.key, relatedRoute, record, index))"
                >
                  Edit
                </button>
                <button
                  v-if="auth.isAdmin.value && !isHistoryKind(relatedRoute) && editingRelationKey !== recordKey(group.key, relatedRoute, record, index) && !pendingProposalOf(relationPayload(record))"
                  type="button"
                  class="danger-button"
                  :disabled="directionSavingKey !== null"
                  @click="confirmDeleteRelation(relatedRoute, record)"
                >
                  Delete
                </button>
              </div>
            </div>

            <ProposalBanner
              v-if="!record.locked && isRelationshipKind(relatedRoute) && pendingProposalOf(relationPayload(record))"
              :proposal="pendingProposalOf(relationPayload(record))!"
              :is-admin="auth.isAdmin.value"
              :is-author="isProposalAuthor(pendingProposalOf(relationPayload(record))!)"
              :busy="proposalActionBusy || directionSavingKey !== null"
              :error-message="proposalActionError"
              @accept="acceptPendingProposal(pendingProposalOf(relationPayload(record))!)"
              @reject="rejectPendingProposal(pendingProposalOf(relationPayload(record))!)"
              @revoke="revokePendingProposal(pendingProposalOf(relationPayload(record))!)"
            />

            <p v-if="record.locked" class="status-card">Locked</p>
            <div
              v-if="auth.isAdmin.value && !record.locked && isHistoryKind(relatedRoute) && isRecordCollapsed(recordKey(group.key, relatedRoute, record, index))"
              class="history-direction-controls"
            >
              <div v-for="historyEntry in historyDisplayPayload(record)" :key="historyKey(recordKey(group.key, relatedRoute, record, index), relatedRoute, historyEntry)" class="history-direction-row">
                <span>{{ historyEntryLabel(relatedRoute, historyEntry) }}</span>
                <DirectionSelect
                  v-if="!pendingProposalOf(historyEntry)"
                  :direction="historyEntry.visibility_direction"
                  :anchor-member-index="relationAnchor(relatedRoute, historyEntry)"
                  :subject="`${relatedRecordLabel(record)}, ${historyEntryLabel(relatedRoute, historyEntry)}`"
                  :disabled="directionDisabled"
                  :saving="directionSavingKey === historyKey(recordKey(group.key, relatedRoute, record, index), relatedRoute, historyEntry)"
                  @change="changeRelationDirection(relatedRoute, record, historyEntry, historyKey(recordKey(group.key, relatedRoute, record, index), relatedRoute, historyEntry), true, $event)"
                />
              </div>
            </div>
            <div
              v-if="!record.locked && (!hasCollapsibleRecordBody(relatedRoute) || !isRecordCollapsed(recordKey(group.key, relatedRoute, record, index)))"
            >
            <form
              v-if="editingRelationKey === recordKey(group.key, relatedRoute, record, index)"
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
                <label v-if="field.type !== 'loreDate'" :for="`edit-relation-${group.key}-${relatedRoute}-${index}-${field.name}`">
                  {{ field.label || prettyFieldName(field.name) }}
                  <span v-if="field.required" class="required-marker" aria-hidden="true">*</span>
                </label>

                <input
                  v-if="field.type === 'boolean'"
                  :id="`edit-relation-${group.key}-${relatedRoute}-${index}-${field.name}`"
                  v-model="relationEditValues[field.name]"
                  type="checkbox"
                />
                <SearchableSelect
                  v-else-if="field.enum"
                  :id="`edit-relation-${group.key}-${relatedRoute}-${index}-${field.name}`"
                  v-model="relationEditValues[field.name]"
                  :options="field.name === 'visibility_direction' ? directionOptions(relationAnchor(relatedRoute, relationPayload(record))) : [
                    ...(field.required ? [] : [{ value: '', label: `No ${prettyFieldName(field.name).toLowerCase()}` }]),
                    ...field.enum.map((value) => ({ value, label: prettyEnumValue(value) })),
                  ]"
                  :required="field.required"
                />
                <input
                  v-else-if="field.type === 'number'"
                  :id="`edit-relation-${group.key}-${relatedRoute}-${index}-${field.name}`"
                  v-model="relationEditValues[field.name]"
                  type="number"
                  step="any"
                  :required="field.required"
                />
                <textarea
                  v-else-if="isLongTextField(field)"
                  :id="`edit-relation-${group.key}-${relatedRoute}-${index}-${field.name}`"
                  v-model="relationEditValues[field.name]"
                  rows="4"
                  :required="field.required"
                ></textarea>
                <LoreDateInput
                  v-else-if="field.type === 'loreDate'"
                  v-model="relationEditValues[field.name]"
                  :label="field.label || prettyFieldName(field.name)"
                  :required="field.required"
                />
                <RealDateInput
                  v-else-if="field.type === 'realDate'"
                  v-model="relationEditValues[field.name]"
                  :required="field.required"
                />
                <input
                  v-else
                  :id="`edit-relation-${group.key}-${relatedRoute}-${index}-${field.name}`"
                  v-model="relationEditValues[field.name]"
                  type="text"
                  :required="field.required"
                />
              </div>

              <div class="form-actions">
                <button class="primary-button" type="submit" :disabled="relationEditSaving">
                  {{ relationEditSaving ? (auth.isAdmin.value ? 'Saving...' : 'Submitting...') : (auth.isAdmin.value ? 'Save' : 'Submit Proposal') }}
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
              <div class="entity-overview">
                <FieldList
                  v-if="Object.keys(factsData(relationDisplayPayloadForView(recordKey(group.key, relatedRoute, record, index), record), relationSchemaForRoute(relatedRoute)[0]?.fields)).length > 0"
                  class="entity-facts"
                  :data="factsData(relationDisplayPayloadForView(recordKey(group.key, relatedRoute, record, index), record), relationSchemaForRoute(relatedRoute)[0]?.fields)"
                  :fields="factsFields(relationSchemaForRoute(relatedRoute)[0]?.fields)"
                />
                <div
                  v-if="expositoryFieldEntries(relationDisplayPayloadForView(recordKey(group.key, relatedRoute, record, index), record), relationSchemaForRoute(relatedRoute)[0]?.fields).length > 0"
                  class="entity-long-description"
                >
                  <template
                    v-for="field in expositoryFieldEntries(relationDisplayPayloadForView(recordKey(group.key, relatedRoute, record, index), record), relationSchemaForRoute(relatedRoute)[0]?.fields)"
                    :key="field.name"
                  >
                    <h4>{{ field.label || prettyFieldName(field.name) }}</h4>
                    <p><LinkifiedText :text="field.value" /></p>
                  </template>
                </div>
              </div>
              <LastEditedStamp
                :by="(relationPayload(record) as any).last_edited_by"
                :at="(relationPayload(record) as any).last_edited_at"
              />
              <ProposalViewToggle
                v-if="pendingProposalOf(relationPayload(record))"
                :model-value="getViewMode(recordKey(group.key, relatedRoute, record, index))"
                @update:model-value="(mode) => setViewMode(recordKey(group.key, relatedRoute, record, index), mode)"
              />
            </template>

            <RelationTimeline
              v-if="findRelationSchema(relatedRoute)?.timeline"
              :entity-route="entityRoute"
              :entity-id="id"
              :related-route="relatedRoute"
              :related-id="relatedRecordId(record)"
              :anchor-member-index="relatedRoute === entityRoute ? relationAnchor(relatedRoute, relationPayload(record)) : undefined"
              :timeline="relationPayload(record).timeline"
              :date-system="dateSystem"
              :editable="auth.isAdmin.value && !pendingProposalOf(relationPayload(record))"
              @updated="loadDetail({ silent: true })"
            />

            <template v-if="historyDisplayPayload(record).length > 0">
              <p class="meta-title">History records</p>
              <article
                v-for="(historyEntry, historyIndex) in historyDisplayPayload(record)"
                :key="historyKey(recordKey(group.key, relatedRoute, record, index), relatedRoute, historyEntry)"
                class="history-record"
              >
                <form
                  v-if="editingHistoryKey === historyKey(recordKey(group.key, relatedRoute, record, index), relatedRoute, historyEntry)"
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
                    <label v-if="field.type !== 'loreDate'" :for="`edit-history-${group.key}-${relatedRoute}-${index}-${historyIndex}-${field.name}`">
                      {{ field.label || prettyFieldName(field.name) }}
                      <span v-if="field.required" class="required-marker" aria-hidden="true">*</span>
                    </label>

                    <input
                      v-if="field.type === 'boolean'"
                      :id="`edit-history-${group.key}-${relatedRoute}-${index}-${historyIndex}-${field.name}`"
                      v-model="historyEditValues[field.name]"
                      type="checkbox"
                    />
                    <SearchableSelect
                      v-else-if="field.enum"
                      :id="`edit-history-${group.key}-${relatedRoute}-${index}-${historyIndex}-${field.name}`"
                      v-model="historyEditValues[field.name]"
                      :options="field.name === 'visibility_direction' ? directionOptions(relationAnchor(relatedRoute, historyEntry)) : [
                        ...(field.required ? [] : [{ value: '', label: `No ${prettyFieldName(field.name).toLowerCase()}` }]),
                        ...field.enum.map((value) => ({ value, label: prettyEnumValue(value) })),
                      ]"
                      :required="field.required"
                    />
                    <input
                      v-else-if="field.type === 'number'"
                      :id="`edit-history-${group.key}-${relatedRoute}-${index}-${historyIndex}-${field.name}`"
                      v-model="historyEditValues[field.name]"
                      type="number"
                      step="any"
                      :required="field.required"
                    />
                    <textarea
                      v-else-if="isLongTextField(field)"
                      :id="`edit-history-${group.key}-${relatedRoute}-${index}-${historyIndex}-${field.name}`"
                      v-model="historyEditValues[field.name]"
                      rows="4"
                      :required="field.required"
                    ></textarea>
                    <LoreDateInput
                      v-else-if="field.type === 'loreDate'"
                      v-model="historyEditValues[field.name]"
                      :label="field.label || prettyFieldName(field.name)"
                      :required="field.required"
                    />
                    <RealDateInput
                      v-else-if="field.type === 'realDate'"
                      v-model="historyEditValues[field.name]"
                      :required="field.required"
                    />
                    <input
                      v-else
                      :id="`edit-history-${group.key}-${relatedRoute}-${index}-${historyIndex}-${field.name}`"
                      v-model="historyEditValues[field.name]"
                      type="text"
                      :required="field.required"
                    />
                  </div>

                  <div class="form-actions">
                    <button class="primary-button" type="submit" :disabled="historyEditSaving">
                      {{ historyEditSaving ? (auth.isAdmin.value ? 'Saving...' : 'Submitting...') : (auth.isAdmin.value ? 'Save' : 'Submit Proposal') }}
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

                <div v-else class="entity-overview">
                  <ProposalBanner
                    v-if="pendingProposalOf(historyEntry)"
                    :proposal="pendingProposalOf(historyEntry)!"
                    :is-admin="auth.isAdmin.value"
                    :is-author="isProposalAuthor(pendingProposalOf(historyEntry)!)"
                    :busy="proposalActionBusy || directionSavingKey !== null"
                    :error-message="proposalActionError"
                    @accept="acceptPendingProposal(pendingProposalOf(historyEntry)!)"
                    @reject="rejectPendingProposal(pendingProposalOf(historyEntry)!)"
                    @revoke="revokePendingProposal(pendingProposalOf(historyEntry)!)"
                  />
                  <div
                    v-if="canOpenRelationEdit(relatedRoute) && !pendingProposalOf(historyEntry)"
                    class="history-record-actions"
                  >
                    <button
                      type="button"
                      class="secondary-button"
                      :disabled="directionSavingKey !== null"
                      @click="
                        startEditHistory(relatedRoute, recordKey(group.key, relatedRoute, record, index), historyEntry, historyKey(recordKey(group.key, relatedRoute, record, index), relatedRoute, historyEntry))
                      "
                    >
                      Edit
                    </button>
                    <DirectionSelect
                      v-if="auth.isAdmin.value"
                      :direction="historyEntry.visibility_direction"
                      :anchor-member-index="relationAnchor(relatedRoute, historyEntry)"
                      :subject="`${relatedRecordLabel(record)}, ${historyEntryLabel(relatedRoute, historyEntry)}`"
                      :disabled="directionDisabled"
                      :saving="directionSavingKey === historyKey(recordKey(group.key, relatedRoute, record, index), relatedRoute, historyEntry)"
                      @change="changeRelationDirection(relatedRoute, record, historyEntry, historyKey(recordKey(group.key, relatedRoute, record, index), relatedRoute, historyEntry), true, $event)"
                    />
                    <button
                      v-if="auth.isAdmin.value"
                      type="button"
                      class="danger-button"
                      :disabled="directionSavingKey !== null"
                      @click="confirmDeleteHistoryEntry(relatedRoute, record, historyEntry)"
                    >
                      Delete
                    </button>
                  </div>
                  <FieldList
                    v-if="Object.keys(factsData(historyEntryForView(historyKey(recordKey(group.key, relatedRoute, record, index), relatedRoute, historyEntry), historyEntry), relationSchemaForRoute(relatedRoute)[0]?.fields)).length > 0"
                    class="entity-facts"
                    :data="factsData(historyEntryForView(historyKey(recordKey(group.key, relatedRoute, record, index), relatedRoute, historyEntry), historyEntry), relationSchemaForRoute(relatedRoute)[0]?.fields)"
                    :fields="factsFields(relationSchemaForRoute(relatedRoute)[0]?.fields)"
                  />
                  <div
                    v-if="expositoryFieldEntries(historyEntryForView(historyKey(recordKey(group.key, relatedRoute, record, index), relatedRoute, historyEntry), historyEntry), relationSchemaForRoute(relatedRoute)[0]?.fields).length > 0"
                    class="entity-long-description"
                  >
                    <template
                      v-for="field in expositoryFieldEntries(historyEntryForView(historyKey(recordKey(group.key, relatedRoute, record, index), relatedRoute, historyEntry), historyEntry), relationSchemaForRoute(relatedRoute)[0]?.fields)"
                      :key="field.name"
                    >
                      <h4>{{ field.label || prettyFieldName(field.name) }}</h4>
                      <p><LinkifiedText :text="field.value" /></p>
                    </template>
                  </div>
                  <LastEditedStamp :by="(historyEntry as any).last_edited_by" :at="(historyEntry as any).last_edited_at" />
                  <ProposalViewToggle
                    v-if="pendingProposalOf(historyEntry)"
                    :model-value="getViewMode(historyKey(recordKey(group.key, relatedRoute, record, index), relatedRoute, historyEntry))"
                    @update:model-value="(mode) => setViewMode(historyKey(recordKey(group.key, relatedRoute, record, index), relatedRoute, historyEntry), mode)"
                  />
                </div>
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
            </div>
          </article>
        </div>
      </CollapseSection>

      </template>
      </fieldset>
      </template>
    </article>

    <ConfirmModal
      :open="deleteModalOpen"
      title="Confirm delete"
      :message="deleteModalMessage"
      :busy="deleteModalBusy"
      :error-message="deleteModalError"
      @confirm="confirmDeleteConfirm"
      @cancel="cancelDeleteConfirm"
    />
  </section>
</template>
