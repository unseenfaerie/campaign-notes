<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { type DomainEntity } from '../services/domainService'
import {
  getEntitySchema,
  getRelationSchemas,
  type EditProposal,
  type EntityFieldSchema,
  type RelationFormSchema,
} from '../services/metaService'
import FieldList from './FieldList.vue'

type Props = {
  proposal: EditProposal
  value: 'old' | 'new'
}

const props = defineProps<Props>()
const fields = ref<EntityFieldSchema[]>([])
const relationSchema = ref<RelationFormSchema | undefined>()

function parseStoredValue(value: string | null | undefined): unknown {
  if (!value) {
    return undefined
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const displayData = computed<DomainEntity>(() => {
  const storedValue = parseStoredValue(props.value === 'old' ? props.proposal.old_value : props.proposal.new_value)

  if (!props.proposal.relation_name) {
    return storedValue === undefined ? {} : { [props.proposal.field_name]: storedValue }
  }

  if (!storedValue || typeof storedValue !== 'object' || Array.isArray(storedValue)) {
    return {}
  }

  const relationValue = storedValue as { updates?: DomainEntity; historyValue?: unknown }
  const data = { ...(relationValue.updates || {}) }
  if (relationSchema.value?.historyKey && relationValue.historyValue !== undefined) {
    data[relationSchema.value.historyKey] = relationValue.historyValue
  }

  return data
})

onMounted(async () => {
  if (props.proposal.relation_name) {
    const relationSchemas = await getRelationSchemas(props.proposal.entity_route)
    relationSchema.value = relationSchemas.find((schema) => schema.relationName === props.proposal.relation_name)
    fields.value = relationSchema.value?.fields ?? []
    return
  }

  fields.value = (await getEntitySchema(props.proposal.entity_route))?.fields ?? []
})
</script>

<template>
  <FieldList
    :data="displayData"
    :empty-message="value === 'old' ? 'No current value was recorded.' : 'No proposed values were recorded.'"
    :fields="fields"
  />
</template>