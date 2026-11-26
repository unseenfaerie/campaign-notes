<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import EditButton from './EditButton.vue'
import LoreDateInput from './LoreDateInput.vue'
import LinkifiedText from './LinkifiedText.vue'
import { proposeRelationEdit, updateRelation } from '../services/domainService'
import { formatLoreDate, isCanonicalLoreDate, type DateSystem } from '../utils/loreDate'

type TimelineEntry = { id: string; description: string; date: string | null }

const props = defineProps<{
  entityRoute: string
  entityId: string
  relatedRoute: string
  relatedId: string
  anchorMemberIndex?: number
  timeline: unknown
  dateSystem: DateSystem | null
  editable: boolean
  isAdmin: boolean
}>()
const emit = defineEmits<{ updated: [] }>()
const editing = ref(false)
const saving = ref(false)
const error = ref('')
const draft = ref<TimelineEntry[]>([])

function isEntry(value: unknown): value is TimelineEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return 'id' in value && typeof value.id === 'string' &&
    'description' in value && typeof value.description === 'string' &&
    'date' in value && (typeof value.date === 'string' || value.date === null)
}

const entries = computed(() => {
  if (!Array.isArray(props.timeline) || !props.timeline.every(isEntry)) {
    throw new Error('Invalid relation timeline received from the server')
  }
  return props.timeline
})
const datesOutOfOrder = computed(() => {
  const dates = draft.value.map(entry => entry.date).filter((date): date is string => Boolean(date))
  return dates.some((date, index) => index > 0 && date < dates[index - 1]!)
})

function startEditing() {
  draft.value = entries.value.map(entry => ({ ...entry }))
  if (!draft.value.length) addEntry()
  error.value = ''
  editing.value = true
}

function move(index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= draft.value.length) return
  const entry = draft.value.splice(index, 1)[0]!
  draft.value.splice(target, 0, entry)
}

function addEntry() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const id = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  draft.value.push({ id, description: '', date: null })
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    if (draft.value.some(entry => !entry.description.trim())) throw new Error('Each timeline entry needs a description.')
    const saveRelation = props.isAdmin ? updateRelation : proposeRelationEdit
    await saveRelation(props.entityRoute, props.entityId, props.relatedRoute, props.relatedId,
      { timeline: draft.value.map(entry => ({ ...entry, date: entry.date || null })) },
      props.anchorMemberIndex === undefined ? undefined : { anchorMemberIndex: props.anchorMemberIndex })
    editing.value = false
    emit('updated')
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not save timeline.'
  } finally {
    saving.value = false
  }
}

function displayDate(date: string): string {
  return props.dateSystem && isCanonicalLoreDate(date) ? formatLoreDate(props.dateSystem, date) : date
}

watch(() => [props.entityRoute, props.entityId, props.relatedRoute, props.relatedId, props.anchorMemberIndex], () => {
  editing.value = false
})
watch(() => props.editable, (editable) => {
  if (!editable) editing.value = false
})
</script>

<template>
  <section v-if="entries.length || editing || editable" class="relation-timeline">
    <div class="inline-edit-heading">
      <h4>Timeline</h4>
      <EditButton
        v-if="editable && !editing"
        :label="entries.length ? 'Edit timeline' : 'Add timeline'"
        @click="startEditing"
      />
    </div>
    <form v-if="editing" class="entity-form" @submit.prevent="save">
      <fieldset class="inline-editor-fields" :disabled="saving">
      <div v-for="(entry, index) in draft" :key="entry.id" class="history-record">
        <div class="form-row">
          <label :for="`timeline-${entry.id}`">Description</label>
          <textarea :id="`timeline-${entry.id}`" v-model="entry.description" required rows="2"></textarea>
        </div>
        <LoreDateInput :model-value="entry.date || ''" label="Date" @update:model-value="entry.date = $event || null" />
        <div class="form-actions">
          <button type="button" class="secondary-button" :disabled="index === 0" @click="move(index, -1)">Move up</button>
          <button type="button" class="secondary-button" :disabled="index === draft.length - 1" @click="move(index, 1)">Move down</button>
          <button type="button" class="danger-button" @click="draft.splice(index, 1)">Remove</button>
        </div>
      </div>
      <p v-if="datesOutOfOrder" class="status-card">Some dates are out of order. The timeline will keep your chosen order.</p>
      <div class="form-actions">
        <button type="button" class="secondary-button" @click="addEntry">Add entry</button>
        <button type="submit" class="primary-button" :disabled="saving">{{ saving ? (isAdmin ? 'Saving...' : 'Submitting...') : (isAdmin ? 'Save timeline' : 'Submit proposal') }}</button>
        <button type="button" class="secondary-button" :disabled="saving" @click="editing = false">Cancel</button>
      </div>
      <p v-if="error" class="status-card error">{{ error }}</p>
      </fieldset>
    </form>
    <ol v-else-if="entries.length" class="relation-timeline-list" role="list">
      <li v-for="entry in entries" :key="entry.id">
        <strong v-if="entry.date">{{ displayDate(entry.date) }}: </strong>
        <LinkifiedText :text="entry.description" />
      </li>
    </ol>
  </section>
</template>
