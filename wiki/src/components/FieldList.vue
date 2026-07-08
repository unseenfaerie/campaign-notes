<script setup lang="ts">
import { computed } from 'vue'

type Props = {
  data: Record<string, unknown>
  emptyMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  emptyMessage: 'No fields available.',
})

const entries = computed(() =>
  Object.entries(props.data || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
)

function prettyKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function prettyValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).join(', ')
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value)
  }

  return String(value)
}
</script>

<template>
  <div>
    <p v-if="entries.length === 0" class="status-card">{{ props.emptyMessage }}</p>
    <dl v-else class="field-list">
      <template v-for="[key, value] in entries" :key="key">
        <dt>{{ prettyKey(key) }}</dt>
        <dd>{{ prettyValue(value) }}</dd>
      </template>
    </dl>
  </div>
</template>
