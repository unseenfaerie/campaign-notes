<script setup lang="ts">
defineProps<{
  modelValue: 'proposed' | 'accepted'
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', mode: 'proposed' | 'accepted'): void
}>()

function onChange(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  emit('update:modelValue', checked ? 'proposed' : 'accepted')
}
</script>

<template>
  <label class="proposal-view-toggle">
    <input type="checkbox" :checked="modelValue === 'proposed'" @change="onChange" />
    Show proposed changes
  </label>
</template>
