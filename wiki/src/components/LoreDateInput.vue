<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
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
  required?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const dateSystem = ref<DateSystem | null>(null)
const eraId = ref('')
const calendarId = ref('')
const monthIndex = ref(0)
const day = ref(1)
const year = ref(1)
const isDateSet = ref(Boolean(props.required || props.modelValue))

const calendarsForEra = computed(() => (dateSystem.value ? getCalendarsForEra(dateSystem.value, eraId.value) : []))

const selectedCalendar = computed(() => calendarsForEra.value.find((calendar) => calendar.id === calendarId.value))

const monthsForCalendar = computed(() => selectedCalendar.value?.months ?? [])

const eraOptions = computed(() => (dateSystem.value?.eras ?? []).map((era) => ({ value: era.id, label: era.name })))
const calendarOptions = computed(() => calendarsForEra.value.map((calendar) => ({ value: calendar.id, label: calendar.name })))
const monthOptions = computed(() => monthsForCalendar.value.map((month, index) => ({ value: index, label: month.name })))

const maxDayForMonth = computed(() => monthsForCalendar.value[monthIndex.value]?.days ?? 1)

function applyDecoded(value: string) {
  if (!dateSystem.value || !value) {
    return
  }

  const decoded = decodeLoreDate(dateSystem.value, value)
  if (!decoded) {
    return
  }

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

  const firstEra = dateSystem.value.eras.slice().sort((a, b) => a.order - b.order)[0]
  if (!firstEra) {
    return
  }

  eraId.value = firstEra.id
  const firstCalendar = getCalendarsForEra(dateSystem.value, firstEra.id)[0]
  calendarId.value = firstCalendar?.id ?? ''
  monthIndex.value = 0
  day.value = 1
  year.value = 1
}

function emitEncodedValue() {
  if (!isDateSet.value || !dateSystem.value || !calendarId.value) {
    return
  }

  try {
    const encoded = encodeLoreDate(dateSystem.value, {
      eraId: eraId.value,
      year: year.value,
      calendarId: calendarId.value,
      monthIndex: monthIndex.value,
      day: day.value,
    })
    emit('update:modelValue', encoded)
  } catch {
    // Incomplete/invalid selection; wait for the user to finish choosing.
  }
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
})

watch(eraId, () => {
  const firstCalendar = calendarsForEra.value[0]
  if (firstCalendar && firstCalendar.id !== calendarId.value) {
    calendarId.value = firstCalendar.id
  }
})

watch(calendarId, () => {
  if (monthIndex.value >= monthsForCalendar.value.length) {
    monthIndex.value = 0
  }
})

watch([eraId, calendarId, monthIndex, day, year], () => {
  if (day.value > maxDayForMonth.value) {
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
  <div v-if="!isDateSet" class="lore-date-input-empty">
    <button type="button" class="secondary-button" :disabled="!dateSystem" @click="setDate">Set date</button>
  </div>
  <div v-else class="lore-date-input">
    <SearchableSelect v-model="eraId" :options="eraOptions" :required="required" />
    <SearchableSelect v-model="calendarId" :options="calendarOptions" :required="required" />
    <SearchableSelect v-model="monthIndex" :options="monthOptions" :required="required" />
    <input v-model.number="day" type="number" min="1" :max="maxDayForMonth" :required="required" />
    <input v-model.number="year" type="number" min="1" max="99999" :required="required" />
    <button v-if="!required" type="button" class="secondary-button" @click="clearDate">Clear date</button>
  </div>
</template>

<style scoped>
.lore-date-input {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lore-date-input input[type='number'] {
  width: 6rem;
}
</style>
