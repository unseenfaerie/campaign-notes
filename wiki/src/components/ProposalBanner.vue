<script setup lang="ts">
import type { PendingProposal } from '../services/domainService'

defineProps<{
  proposal: PendingProposal
  isAdmin: boolean
  busy: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  (event: 'accept'): void
  (event: 'reject'): void
}>()
</script>

<template>
  <div class="proposal-banner">
    <span>Pending edit proposed by {{ proposal.proposedByUsername }} &mdash; awaiting DM review.</span>
    <div v-if="isAdmin" class="button-group">
      <button type="button" class="primary-button" :disabled="busy" @click="emit('accept')">Accept</button>
      <button type="button" class="danger-button" :disabled="busy" @click="emit('reject')">Reject</button>
    </div>
    <p v-if="errorMessage" class="status-card error">{{ errorMessage }}</p>
  </div>
</template>
