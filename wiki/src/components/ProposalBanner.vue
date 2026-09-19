<script setup lang="ts">
import type { PendingProposal } from '../services/domainService'

defineProps<{
  proposal: PendingProposal
  viewMode: 'proposed' | 'accepted'
  isAdmin: boolean
  busy: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  (event: 'set-view-mode', mode: 'proposed' | 'accepted'): void
  (event: 'accept'): void
  (event: 'reject'): void
}>()
</script>

<template>
  <div class="proposal-banner">
    <span>Pending edit proposed by {{ proposal.proposedByUsername }} &mdash; awaiting DM review.</span>
    <div class="button-group">
      <div class="view-mode-toggle">
        <button
          type="button"
          :class="{ 'is-active': viewMode === 'proposed' }"
          @click="emit('set-view-mode', 'proposed')"
        >
          Proposed
        </button>
        <button
          type="button"
          :class="{ 'is-active': viewMode === 'accepted' }"
          @click="emit('set-view-mode', 'accepted')"
        >
          Accepted
        </button>
      </div>
      <template v-if="isAdmin">
        <button type="button" class="primary-button" :disabled="busy" @click="emit('accept')">Accept</button>
        <button type="button" class="danger-button" :disabled="busy" @click="emit('reject')">Reject</button>
      </template>
    </div>
    <p v-if="errorMessage" class="status-card error">{{ errorMessage }}</p>
  </div>
</template>
