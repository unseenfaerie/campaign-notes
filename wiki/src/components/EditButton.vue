<script setup lang="ts">
defineProps<{
  label: string
  disabled?: boolean
}>()
</script>

<template>
  <button type="button" class="inline-edit-button" :aria-label="label" :title="label" :disabled="disabled">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l11-11-4-4L4 16v4Zm13-17 4 4-2 2-4-4 2-2Z" fill="currentColor" />
    </svg>
  </button>
</template>
