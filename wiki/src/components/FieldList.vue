<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { listEntities, type DomainEntity } from '../services/domainService'
import { getMentionTargets, type MentionTarget } from '../services/mentionService'
import { getDateSystem, type EntityFieldSchema } from '../services/metaService'
import { formatLoreDate, isCanonicalLoreDate, type DateSystem } from '../utils/loreDate'
import { formatRealDate, isCanonicalRealDate } from '../utils/realDate'
import { linkifyText } from '../utils/linkify'

type Props = {
  data: Record<string, unknown>
  fields?: EntityFieldSchema[]
  emptyMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  emptyMessage: 'No fields available.',
})

const dateSystem = ref<DateSystem | null>(null)
const referenceNames = ref<Record<string, Record<string, string>>>({})
const mentionTargets = ref<MentionTarget[]>([])

onMounted(async () => {
  const referencedRoutes = [...new Set((props.fields || []).flatMap((field) => (field.ref ? [field.ref] : [])))]

  const [loadedDateSystem, loadedMentionTargets, ...referencedEntities] = await Promise.all([
    getDateSystem(),
    getMentionTargets().catch(() => [] as MentionTarget[]),
    ...referencedRoutes.map((route) => listEntities(route).catch(() => [] as DomainEntity[])),
  ])

  dateSystem.value = loadedDateSystem
  mentionTargets.value = loadedMentionTargets
  referenceNames.value = Object.fromEntries(
    referencedRoutes.map((route, index) => [
      route,
      Object.fromEntries(
        referencedEntities[index]
          .filter((entity) => entity.id !== undefined && entity.id !== null && typeof entity.name === 'string')
          .map((entity) => [String(entity.id), entity.name as string])
      ),
    ])
  )
})

const entries = computed(() =>
  Object.entries(props.data || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
)

function prettyKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function fieldLabel(key: string): string {
  const labelKey = fieldReferenceRoute(key) ? key.replace(/_id$/, '') : key
  return prettyKey(labelKey)
}

function fieldType(key: string): string | undefined {
  return props.fields?.find((field) => field.name === key)?.type
}

function fieldEnumValues(key: string): string[] | undefined {
  return props.fields?.find((field) => field.name === key)?.enum
}

function fieldReferenceRoute(key: string): string | undefined {
  return props.fields?.find((field) => field.name === key)?.ref
}

function fieldReferenceId(value: unknown): string {
  if (value === undefined || value === null || value === '') {
    return ''
  }

  return String(value)
}

function fieldReferenceName(key: string, value: unknown): string {
  const route = fieldReferenceRoute(key)
  const id = fieldReferenceId(value)
  return (route && referenceNames.value[route]?.[id]) || id
}

function prettyEnumValue(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function prettyValue(key: string, value: unknown): string {
  const enumValues = fieldEnumValues(key)
  if (enumValues && enumValues.includes(String(value))) {
    return prettyEnumValue(String(value))
  }

  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).join(', ')
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value)
  }

  if (dateSystem.value && isCanonicalLoreDate(value) && (fieldType(key) === 'loreDate' || !props.fields)) {
    return formatLoreDate(dateSystem.value, value)
  }

  if (isCanonicalRealDate(value) && (fieldType(key) === 'realDate' || !props.fields)) {
    return formatRealDate(value)
  }

  return String(value)
}

function isDescriptionField(key: string): boolean {
  return key === 'short_description' || key === 'long_explanation' || key === 'description'
}

function descriptionFragments(key: string, value: unknown) {
  if (!isDescriptionField(key) || typeof value !== 'string') {
    return [{ text: prettyValue(key, value) }]
  }

  return linkifyText(value, mentionTargets.value)
}
</script>

<template>
  <div>
    <p v-if="entries.length === 0" class="status-card">{{ props.emptyMessage }}</p>
    <dl v-else class="field-list">
      <template v-for="[key, value] in entries" :key="key">
        <dt>{{ fieldLabel(key) }}</dt>
        <dd>
          <RouterLink
            v-if="fieldReferenceRoute(key) && fieldReferenceId(value)"
            :to="{
              name: 'entity-detail',
              params: { entityRoute: fieldReferenceRoute(key), id: fieldReferenceId(value) },
            }"
          >
            {{ fieldReferenceName(key, value) }}
          </RouterLink>
          <template v-else-if="isDescriptionField(key) && typeof value === 'string'">
            <template v-for="(fragment, index) in descriptionFragments(key, value)" :key="`${key}-${index}`">
              <RouterLink
                v-if="fragment.target"
                :to="{
                  name: 'entity-detail',
                  params: { entityRoute: fragment.target.route, id: fragment.target.id },
                }"
              >
                {{ fragment.text }}
              </RouterLink>
              <template v-else>{{ fragment.text }}</template>
            </template>
          </template>
          <template v-else>{{ prettyValue(key, value) }}</template>
        </dd>
        <slot name="after-field" :field-key="key" />
      </template>
      <slot name="after-fields" />
    </dl>
  </div>
</template>

