<script setup lang="ts">
defineProps<{
  by?: string | null
  at?: string | null
}>()

function formatTimestamp(at: string): string {
  const parsed = new Date(at)
  return Number.isNaN(parsed.getTime()) ? at : parsed.toLocaleString()
}
</script>

<template>
  <p v-if="by && at" class="last-edited-stamp">
    Last edited by {{ by }} at {{ formatTimestamp(at) }}
  </p>
</template>
