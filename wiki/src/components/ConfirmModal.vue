<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean
    title?: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    busy?: boolean
    errorMessage?: string
  }>(),
  {
    title: 'Confirm',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    busy: false,
    errorMessage: '',
  }
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="!busy && emit('cancel')">
    <div class="modal-card" role="dialog" aria-modal="true">
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>

      <p v-if="errorMessage" class="status-card error">{{ errorMessage }}</p>

      <div class="form-actions">
        <button type="button" class="danger-button" :disabled="busy" @click="emit('confirm')">
          {{ busy ? 'Deleting...' : confirmLabel }}
        </button>
        <button type="button" class="secondary-button" :disabled="busy" @click="emit('cancel')">
          {{ cancelLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
