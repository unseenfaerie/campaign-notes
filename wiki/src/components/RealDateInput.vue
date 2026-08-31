<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue'
import { daysInMonth, decodeRealDate, encodeRealDate, REAL_WORLD_MONTH_NAMES } from '../utils/realDate'

const props = defineProps<{
  modelValue: string
  required?: boolean
}>()

const inputId = useId()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const year = ref(1)
const month = ref(1)
const day = ref(1)
const isDateSet = ref(Boolean(props.required || props.modelValue))

const monthOptions = REAL_WORLD_MONTH_NAMES.map((name, index) => ({ value: index + 1, label: name }))

const maxDayForMonth = computed(() => daysInMonth(year.value, month.value))

function applyDecoded(value: string) {
  const decoded = decodeRealDate(value)
  if (!decoded) {
    return
  }

  year.value = decoded.year
  month.value = decoded.month
  day.value = decoded.day
}

function initializeDefaults() {
  const now = new Date()
  year.value = now.getFullYear()
  month.value = now.getMonth() + 1
  day.value = now.getDate()
}

function emitEncodedValue() {
  if (!isDateSet.value) {
    return
  }

  emit('update:modelValue', encodeRealDate({ year: year.value, month: month.value, day: day.value }))
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

onMounted(() => {
  if (props.modelValue) {
    applyDecoded(props.modelValue)
  } else if (props.required) {
    initializeDefaults()
    emitEncodedValue()
  }
})

watch([year, month, day], () => {
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
  <div v-if="!isDateSet" class="real-date-input-empty">
    <button type="button" class="secondary-button" @click="setDate">Set date</button>
  </div>
  <div v-else class="real-date-input">
    <div class="real-date-field">
      <label :for="`${inputId}-year`">Year</label>
      <input :id="`${inputId}-year`" v-model.number="year" type="number" min="1" max="9999" :required="required" />
    </div>
    <div class="real-date-field">
      <label :for="`${inputId}-month`">Month</label>
      <select :id="`${inputId}-month`" v-model.number="month" :required="required">
        <option v-for="option in monthOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
    </div>
    <div class="real-date-field">
      <label :for="`${inputId}-day`">Day</label>
      <input :id="`${inputId}-day`" v-model.number="day" type="number" min="1" :max="maxDayForMonth" :required="required" />
    </div>
    <button v-if="!required" type="button" class="secondary-button" @click="clearDate">Clear date</button>
  </div>
</template>

<style scoped>
.real-date-input {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.5rem;
}

.real-date-field {
  display: flex;
  flex-direction: column;
  gap: 0.36rem;
}

.real-date-field label {
  font-size: 0.88rem;
  color: var(--ink-700);
  font-weight: 700;
}

.real-date-input input[type='number'] {
  width: 6rem;
}
</style>
