<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getDateSystem, type EntityFieldSchema } from '../services/metaService'
import { formatLoreDate, isCanonicalLoreDate, type DateSystem } from '../utils/loreDate'

type Props = {
  data: Record<string, unknown>
  fields?: EntityFieldSchema[]
  emptyMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  emptyMessage: 'No fields available.',
})

const dateSystem = ref<DateSystem | null>(null)

onMounted(async () => {
  dateSystem.value = await getDateSystem()
})

const entries = computed(() =>
  Object.entries(props.data || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
)

function prettyKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function fieldType(key: string): string | undefined {
  return props.fields?.find((field) => field.name === key)?.type
}

function prettyValue(key: string, value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).join(', ')
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value)
  }

  if (dateSystem.value && isCanonicalLoreDate(value) && (fieldType(key) === 'loreDate' || !props.fields)) {
    return formatLoreDate(dateSystem.value, value)
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
        <dd>{{ prettyValue(key, value) }}</dd>
      </template>
    </dl>
  </div>
</template>

