<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { directionOptions } from '../utils/relationDirection'

const props = defineProps<{
  direction: unknown
  anchorMemberIndex: number
  subject: string
  disabled: boolean
  saving: boolean
}>()

const emit = defineEmits<{ change: [direction: string] }>()
const selectedDirection = ref('')

watch(
  () => [props.direction, props.saving] as const,
  ([direction, saving]) => {
    if (!saving) selectedDirection.value = typeof direction === 'string' ? direction : ''
  },
  { immediate: true, flush: 'sync' },
)

async function changeDirection() {
  emit('change', selectedDirection.value)
  await nextTick()
  if (!props.saving) {
    selectedDirection.value = typeof props.direction === 'string' ? props.direction : ''
  }
}
</script>

<template>
  <label class="direction-select">
    <select
      v-model="selectedDirection"
      class="secondary-button"
      :disabled="disabled"
      :aria-label="`Direction for ${subject}`"
      @change="changeDirection"
    >
      <option v-for="option in directionOptions(anchorMemberIndex)" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <span v-if="saving" role="status">Saving...</span>
  </label>
</template>
