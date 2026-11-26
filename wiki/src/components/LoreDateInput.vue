<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue'
import { getDateSystem } from '../services/metaService'
import {
  decodeLoreDate,
  encodeLoreDate,
  getCalendarsForEra,
  type DateSystem,
} from '../utils/loreDate'
import SearchableSelect from './SearchableSelect.vue'

const props = defineProps<{
  modelValue: string
  label: string
  required?: boolean
  initiallyOpen?: boolean
  singleLine?: boolean
}>()

const inputId = useId()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'validity-change': [valid: boolean]
}>()

const dateSystem = ref<DateSystem | null>(null)
const eraId = ref('')
const calendarId = ref('')
const monthIndex = ref<number | string>('')
const day = ref<number | string>('')
const year = ref<number | string>('')
const isDateSet = ref(Boolean(props.required || props.modelValue || props.initiallyOpen))
let preserveMonthOnCalendarChange = false

const calendarsForEra = computed(() => (dateSystem.value ? getCalendarsForEra(dateSystem.value, eraId.value) : []))

const selectedCalendar = computed(() => calendarsForEra.value.find((calendar) => calendar.id === calendarId.value))

const monthsForCalendar = computed(() => selectedCalendar.value?.months ?? [])

const eraOptions = computed(() => (dateSystem.value?.eras ?? [])
  .slice()
  .sort((a, b) => b.order - a.order)
  .map((era) => ({ value: era.id, label: era.name })))
const calendarOptions = computed(() => calendarsForEra.value.map((calendar) => ({ value: calendar.id, label: calendar.name })))
const monthOptions = computed(() => monthsForCalendar.value.map((month, index) => ({ value: index, label: month.name })))

const maxDayForMonth = computed(() => (
  typeof monthIndex.value === 'number'
    ? monthsForCalendar.value[monthIndex.value]?.days ?? 1
    : 1
))

function applyDecoded(value: string) {
  if (!dateSystem.value || !value) {
    return
  }

  const decoded = decodeLoreDate(dateSystem.value, value)
  if (!decoded) {
    return
  }

  preserveMonthOnCalendarChange = true
  eraId.value = decoded.era.id
  calendarId.value = decoded.calendar.id
  monthIndex.value = decoded.monthIndex
  day.value = decoded.day
  year.value = decoded.year
}

function initializeDefaults() {
  if (!dateSystem.value) {
    return
  }

  eraId.value = ''
  calendarId.value = ''
  monthIndex.value = ''
  day.value = ''
  year.value = ''
}

function encodedValue(): string | null {
  if (!isDateSet.value || !dateSystem.value || !calendarId.value || typeof monthIndex.value !== 'number' ||
      typeof year.value !== 'number' || !Number.isInteger(year.value) || year.value < 1 || year.value > 99999 ||
      typeof day.value !== 'number') {
    return null
  }

  try {
    return encodeLoreDate(dateSystem.value, {
      eraId: eraId.value,
      year: year.value,
      calendarId: calendarId.value,
      monthIndex: monthIndex.value,
      day: day.value,
    })
  } catch {
    return null
  }
}

function emitEncodedValue() {
  const encoded = encodedValue()
  emit('validity-change', Boolean(encoded))
  if (encoded) emit('update:modelValue', encoded)
}

function setDate() {
  initializeDefaults()
  isDateSet.value = true
  emitEncodedValue()
}

function clearDate() {
  isDateSet.value = false
  emit('update:modelValue', '')
}

onMounted(async () => {
  dateSystem.value = await getDateSystem()

  if (props.modelValue) {
    applyDecoded(props.modelValue)
  } else if (props.required) {
    initializeDefaults()
    emitEncodedValue()
  }
  emit('validity-change', Boolean(encodedValue()))
})

watch(eraId, () => {
  const firstCalendar = calendarsForEra.value[0]
  if (firstCalendar && firstCalendar.id !== calendarId.value) {
    calendarId.value = firstCalendar.id
  }
})

watch(calendarId, () => {
  if (preserveMonthOnCalendarChange) {
    preserveMonthOnCalendarChange = false
    return
  }

  monthIndex.value = ''
})

watch([eraId, calendarId, monthIndex, day, year], () => {
  if (typeof monthIndex.value === 'number' && typeof day.value === 'number' && day.value > maxDayForMonth.value) {
    day.value = maxDayForMonth.value
  }
  emitEncodedValue()
})

watch(
  () => props.modelValue,
  (value) => {
    if (value) {
      isDateSet.value = true
      applyDecoded(value)
    } else if (!props.required) {
      isDateSet.value = false
    }
  }
)
</script>

<template>
  <div class="lore-date-container">
  <fieldset class="lore-date-group">
    <legend :class="{ 'lore-date-visually-hidden': initiallyOpen }">
      {{ label }}
      <span v-if="required" class="required-marker" aria-hidden="true">*</span>
    </legend>
    <div v-if="!isDateSet" class="lore-date-input-empty">
      <button type="button" class="secondary-button" :disabled="!dateSystem" @click="setDate">Set date</button>
    </div>
    <div v-else class="lore-date-input" :class="{ 'lore-date-single-line': singleLine }">
      <div class="lore-date-field">
        <label class="lore-date-visually-hidden" :for="`${inputId}-era`">Age</label>
        <SearchableSelect v-model="eraId" :id="`${inputId}-era`" :options="eraOptions" placeholder="Age" open-on-click required />
      </div>
      <div class="lore-date-field">
        <label class="lore-date-visually-hidden" :for="`${inputId}-calendar`">Calendar</label>
        <SearchableSelect v-model="calendarId" :id="`${inputId}-calendar`" :options="calendarOptions" placeholder="Calendar" open-on-click required />
      </div>
      <div class="lore-date-field lore-date-number lore-date-year">
        <label class="lore-date-visually-hidden" :for="`${inputId}-year`">Year</label>
        <input :id="`${inputId}-year`" v-model.number="year" type="number" min="1" max="99999" placeholder="Year" required />
      </div>
      <span class="lore-date-line-break" aria-hidden="true"></span>
      <div class="lore-date-field lore-date-month">
        <label class="lore-date-visually-hidden" :for="`${inputId}-month`">Month</label>
        <SearchableSelect v-model="monthIndex" :id="`${inputId}-month`" :options="monthOptions" placeholder="Month" open-on-click required />
      </div>
      <div class="lore-date-field lore-date-number">
        <label class="lore-date-visually-hidden" :for="`${inputId}-day`">Day</label>
        <input :id="`${inputId}-day`" v-model.number="day" type="number" min="1" :max="maxDayForMonth" placeholder="Day" required />
      </div>
      <slot name="actions" />
      <button v-if="!required" type="button" class="lore-date-action" @click="clearDate">Delete</button>
    </div>
  </fieldset>
  </div>
</template>

<style scoped>
.lore-date-container {
  width: 100%;
  min-width: 0;
  container-type: inline-size;
}

.lore-date-group {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.lore-date-group legend {
  padding: 0 0.25rem;
  font-size: 0.88rem;
  color: var(--ink-700);
  font-weight: 700;
}

.lore-date-input {
  display: flex;
  align-items: stretch;
  width: 100%;
}

.lore-date-field {
  flex: 1 1 8rem;
  min-width: 0;
}

.lore-date-field.lore-date-number {
  flex: 0 1 5rem;
}

.lore-date-line-break {
  display: none;
}

.lore-date-field :deep(input),
.lore-date-input :deep(.lore-date-action) {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  margin: 0;
  border: 1px solid var(--line);
  border-radius: 0;
  background: var(--paper);
  color: var(--ink-900);
  font: inherit;
  padding: 0.62rem 0.72rem;
}

.lore-date-field :deep(.searchable-select input) {
  padding-right: 1.4rem;
  cursor: pointer;
}

.lore-date-field :deep(.searchable-select input:focus) {
  cursor: text;
}

.lore-date-field :deep(.searchable-select input:hover) {
  background: var(--paper-soft);
}

.lore-date-field :deep(.searchable-select-toggle) {
  width: 1.25rem;
  padding: 0;
  border-left: 0;
}

.lore-date-field :deep(.searchable-select-chevron) {
  width: 0.4rem;
  height: 0.4rem;
}

.lore-date-field:not(:first-child) :deep(input),
.lore-date-input :deep(.lore-date-action) {
  border-left: 0;
}

.lore-date-field:first-child :deep(input) {
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
}

.lore-date-field:last-child :deep(input) {
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.lore-date-input :deep(.lore-date-action) {
  width: auto;
  flex: 0 0 auto;
  cursor: pointer;
  font-weight: 600;
}

.lore-date-input :deep(.lore-date-action:last-child) {
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.lore-date-input :deep(.lore-date-action:hover:not(:disabled)) {
  background: var(--paper-soft);
}

.lore-date-input :deep(.lore-date-action:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

.lore-date-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@container (max-width: 38rem) {
  .lore-date-input:not(.lore-date-single-line) {
    flex-wrap: wrap;
  }

  .lore-date-input:not(.lore-date-single-line) .lore-date-field:not(.lore-date-number) {
    flex-basis: 1px;
  }

  .lore-date-input:not(.lore-date-single-line) .lore-date-line-break {
    display: block;
    flex-basis: 100%;
  }

  .lore-date-input:not(.lore-date-single-line) .lore-date-year :deep(input) {
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  }

  .lore-date-input:not(.lore-date-single-line) .lore-date-month,
  .lore-date-input:not(.lore-date-single-line) .lore-date-month ~ .lore-date-field,
  .lore-date-input:not(.lore-date-single-line) :deep(.lore-date-action) {
    margin-top: 0.25rem;
  }

  .lore-date-input:not(.lore-date-single-line) .lore-date-month :deep(input) {
    border-left: 1px solid var(--line);
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  }
}
</style>
