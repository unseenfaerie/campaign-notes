<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
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
const openDates = ref(new Set<string>())
const incompleteDates = ref(new Set<string>())
const openDescriptions = ref(new Set<string>())
const editorFields = ref<HTMLElement | null>(null)
const drag = ref<{ id: string; pointerId: number; x: number; y: number; active: boolean; targetId: string | null } | null>(null)
const reorderMessage = ref('')
const reorderHintId = useId()
let scrollFrame: number | null = null
let pointerX = 0
let pointerY = 0

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
  openDates.value = new Set()
  incompleteDates.value = new Set()
  openDescriptions.value = new Set()
  if (!draft.value.length) addEntry()
  error.value = ''
  reorderMessage.value = ''
  editing.value = true
}

function move(index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= draft.value.length) return
  const entry = draft.value.splice(index, 1)[0]!
  draft.value.splice(target, 0, entry)
  reorderMessage.value = `Entry moved to position ${target + 1} of ${draft.value.length}.`
}

async function moveWithKeyboard(event: KeyboardEvent, index: number, offset: number) {
  const handle = event.currentTarget as HTMLButtonElement
  move(index, offset)
  await nextTick()
  handle.focus({ preventScroll: true })
}

function startDrag(event: PointerEvent, id: string) {
  if (!event.isPrimary || event.button !== 0 || saving.value) return
  const handle = event.currentTarget as HTMLElement
  handle.setPointerCapture(event.pointerId)
  drag.value = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, active: false, targetId: null }
}

function updateDropTarget() {
  const target = document.elementFromPoint(pointerX, pointerY)?.closest<HTMLElement>('.timeline-edit-entry')
  if (drag.value) drag.value.targetId = target && editorFields.value?.contains(target) ? target.dataset.entryId ?? null : null
}

function scrollDuringDrag() {
  scrollFrame = null
  if (!drag.value?.active) return
  const direction = pointerY < 60 ? -1 : pointerY > window.innerHeight - 60 ? 1 : 0
  if (!direction) return
  window.scrollBy(0, direction * 12)
  updateDropTarget()
  scrollFrame = requestAnimationFrame(scrollDuringDrag)
}

function stopDrag() {
  if (scrollFrame !== null) cancelAnimationFrame(scrollFrame)
  scrollFrame = null
  drag.value = null
}

function updateDrag(event: PointerEvent) {
  const current = drag.value
  if (!current || current.pointerId !== event.pointerId) return
  if (!current.active && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 5) return
  current.active = true
  pointerX = event.clientX
  pointerY = event.clientY
  updateDropTarget()
  if (scrollFrame === null && (pointerY < 60 || pointerY > window.innerHeight - 60)) {
    scrollFrame = requestAnimationFrame(scrollDuringDrag)
  }
}

function endDrag(event: PointerEvent) {
  if (!drag.value || drag.value.pointerId !== event.pointerId) return
  updateDrag(event)
  const { id, active, targetId } = drag.value
  stopDrag()
  if (!active || !targetId) return
  const index = draft.value.findIndex(entry => entry.id === id)
  const target = draft.value.findIndex(entry => entry.id === targetId)
  if (index >= 0 && target >= 0 && index !== target) move(index, target - index)
}

function cancelDrag(event: PointerEvent) {
  if (drag.value?.pointerId === event.pointerId) stopDrag()
}

function updateDate(entry: TimelineEntry, value: string) {
  entry.date = value || null
  if (!value) {
    openDates.value.delete(entry.id)
    incompleteDates.value.delete(entry.id)
    void focusEntryControl(entry.id, '.timeline-add-date')
  }
}

function editDate(id: string) {
  incompleteDates.value.add(id)
  openDates.value.add(id)
}

function updateDateValidity(id: string, valid: boolean) {
  if (valid) incompleteDates.value.delete(id)
  else incompleteDates.value.add(id)
}

function addEntry() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const id = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  draft.value.push({ id, description: '', date: null })
  openDescriptions.value.add(id)
  void focusDescription(id)
}

async function focusDescription(id: string) {
  await nextTick()
  const input = Array.from(editorFields.value?.querySelectorAll<HTMLTextAreaElement>('textarea') ?? [])
    .find(textarea => textarea.id === `timeline-${id}`)
  input?.focus()
}

function editDescription(id: string) {
  openDescriptions.value.add(id)
  void focusDescription(id)
}

async function focusEntryControl(id: string, selector: string) {
  await nextTick()
  const entry = Array.from(editorFields.value?.querySelectorAll<HTMLElement>('.timeline-edit-entry') ?? [])
    .find(element => element.dataset.entryId === id)
  entry?.querySelector<HTMLButtonElement>(selector)?.focus()
}

function finishDescription(id: string) {
  openDescriptions.value.delete(id)
  void focusEntryControl(id, '.timeline-description-pencil')
}

function finishDate(id: string) {
  openDates.value.delete(id)
  void focusEntryControl(id, '.timeline-date-pencil')
}

function removeEntry(index: number) {
  const entry = draft.value.splice(index, 1)[0]
  if (!entry) return
  openDates.value.delete(entry.id)
  incompleteDates.value.delete(entry.id)
  openDescriptions.value.delete(entry.id)
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    if (draft.value.some(entry => !entry.description.trim())) throw new Error('Each timeline entry needs a description.')
    if (incompleteDates.value.size) throw new Error('Complete or clear each open date before saving.')
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
  stopDrag()
  editing.value = false
})
watch(() => props.editable, (editable) => {
  if (!editable) {
    stopDrag()
    editing.value = false
  }
})
watch(editing, (value) => {
  if (!value) stopDrag()
})
onBeforeUnmount(stopDrag)
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
      <fieldset ref="editorFields" class="inline-editor-fields" :disabled="saving">
      <p :id="reorderHintId" class="timeline-reorder-announcement">Drag the handle to reorder entries, or focus it and use the up and down arrow keys.</p>
      <span class="timeline-reorder-announcement" role="status" aria-live="polite">{{ reorderMessage }}</span>
      <ol class="timeline-edit-list">
        <li
          v-for="(entry, index) in draft"
          :key="entry.id"
          class="timeline-edit-entry"
          :class="{ 'timeline-has-next': index < draft.length - 1, 'timeline-drag-source': drag?.active && drag.id === entry.id, 'timeline-drop-target': drag?.active && drag.targetId === entry.id && drag.id !== entry.id }"
          :data-entry-id="entry.id"
        >
          <button
            type="button"
            class="timeline-drag-handle"
            :aria-label="`Reorder entry ${index + 1}: ${entry.description || 'Untitled'}`"
            :aria-describedby="reorderHintId"
            @pointerdown="startDrag($event, entry.id)"
            @pointermove="updateDrag"
            @pointerup="endDrag"
            @pointercancel="cancelDrag"
            @lostpointercapture="cancelDrag"
            @keydown.up.prevent="moveWithKeyboard($event, index, -1)"
            @keydown.down.prevent="moveWithKeyboard($event, index, 1)"
          ><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg></button>
          <div v-if="openDescriptions.has(entry.id)" class="timeline-entry-editor">
            <label :for="`timeline-${entry.id}`">Description</label>
            <textarea :id="`timeline-${entry.id}`" v-model="entry.description" required rows="2"></textarea>
            <button type="button" class="timeline-text-action" :disabled="!entry.description.trim()" @click="finishDescription(entry.id)">Done</button>
          </div>
          <div v-else class="timeline-entry-description">
            <LinkifiedText :text="entry.description" />
            <EditButton class="timeline-description-pencil" :label="`Edit description for entry ${index + 1}`" @click="editDescription(entry.id)" />
          </div>
          <div v-if="openDates.has(entry.id)" class="timeline-entry-editor">
            <LoreDateInput :model-value="entry.date || ''" label="Date" initially-open @update:model-value="updateDate(entry, $event)" @validity-change="updateDateValidity(entry.id, $event)" />
            <button type="button" class="timeline-text-action" :disabled="incompleteDates.has(entry.id)" @click="finishDate(entry.id)">Done</button>
          </div>
          <div v-else-if="entry.date" class="timeline-entry-date">
            <strong>{{ displayDate(entry.date) }}</strong>
            <EditButton class="timeline-date-pencil" :label="`Edit date for entry ${index + 1}`" @click="editDate(entry.id)" />
          </div>
          <div class="timeline-entry-actions">
            <button v-if="!entry.date && !openDates.has(entry.id)" type="button" class="timeline-text-action timeline-add-date" @click="editDate(entry.id)">Add Date</button>
            <button type="button" class="timeline-text-action timeline-remove-action" :aria-label="`Remove entry ${index + 1}`" @click="removeEntry(index)">Remove</button>
          </div>
        </li>
      </ol>
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

<style>
.timeline-edit-list {
  margin: 0.4rem 0;
  padding: 0;
  list-style: none;
}

.timeline-edit-entry {
  position: relative;
  padding: 0 0 0.6rem 2.4rem;
}

.timeline-has-next::before {
  content: '';
  position: absolute;
  top: 0.9rem;
  bottom: -0.9rem;
  left: calc(0.9rem - 1px);
  width: 2px;
  background: var(--line);
}

.timeline-drag-handle {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  cursor: grab;
  touch-action: none;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--paper);
  color: var(--ink-700);
  padding: 0.35rem;
}

.timeline-drag-handle svg {
  width: 100%;
  height: 100%;
}

.timeline-drag-handle:active {
  cursor: grabbing;
}

.timeline-drag-source {
  opacity: 0.6;
}

.timeline-drop-target {
  background: var(--paper-soft);
}

.timeline-entry-description {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.timeline-entry-description .inline-edit-button,
.timeline-entry-date .inline-edit-button {
  vertical-align: middle;
}

.timeline-entry-editor {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  margin: 0.3rem 0;
}

.timeline-entry-editor textarea,
.timeline-entry-editor .lore-date-group {
  width: 100%;
}

.timeline-entry-editor label {
  font-weight: 600;
}

.timeline-entry-actions {
  display: flex;
  gap: 0.75rem;
}

.timeline-text-action {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--link);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}

.timeline-text-action:hover {
  text-decoration: underline;
}

.timeline-text-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.timeline-remove-action {
  color: var(--warning);
}

.timeline-reorder-announcement {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
