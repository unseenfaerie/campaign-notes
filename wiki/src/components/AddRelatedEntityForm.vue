<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ApiError } from '../services/apiClient'
import { createRelation, listEntities, type DomainEntity } from '../services/domainService'
import { entityLabelFromRoute } from '../config/entities'
import type { EntityFieldSchema, RelationFormSchema } from '../services/metaService'
import LoreDateInput from './LoreDateInput.vue'
import SearchableSelect from './SearchableSelect.vue'

const props = defineProps<{
  entityRoute: string
  id: string
  options: RelationFormSchema[]
}>()

const emit = defineEmits<{
  created: []
  cancel: []
}>()

const loadingTargets = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const targets = ref<DomainEntity[]>([])
const selectedRelatedRoute = ref(props.options[0]?.relatedRoute ?? '')
const selectedTargetId = ref('')
const formValues = ref<Record<string, any>>({})

const selectedSchema = computed(() =>
  props.options.find((option) => option.relatedRoute === selectedRelatedRoute.value)
)

function prettyFieldName(name: string): string {
  return name
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function isLongTextField(field: EntityFieldSchema): boolean {
  return field.type === 'string' && /description|explanation|notes/i.test(field.name)
}

function targetLabel(target: DomainEntity): string {
  if (typeof target.name === 'string' && target.name.trim()) {
    return target.name
  }

  if (typeof target.alias === 'string' && target.alias.trim()) {
    return target.alias
  }

  return String(target.id ?? '')
}

async function loadTargets() {
  const schema = selectedSchema.value
  selectedTargetId.value = ''
  targets.value = []

  if (!schema) {
    return
  }

  loadingTargets.value = true
  errorMessage.value = ''

  try {
    const candidates = await listEntities(schema.relatedEntityRoute)
    targets.value = candidates.filter((candidate) => {
      if (schema.relatedEntityRoute !== props.entityRoute) {
        return true
      }
      return String(candidate.id) !== props.id
    })
  } catch (error) {
    if (error instanceof ApiError) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Could not load related entity options.'
    }
  } finally {
    loadingTargets.value = false
  }
}

function resetFormValues() {
  const initialValues: Record<string, any> = {}
  for (const field of selectedSchema.value?.fields ?? []) {
    initialValues[field.name] = field.type === 'boolean' ? false : ''
  }
  formValues.value = initialValues
}

function buildPayload(): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  for (const field of selectedSchema.value?.fields ?? []) {
    const rawValue = formValues.value[field.name]

    if (field.type === 'boolean') {
      if (rawValue === true || field.required) {
        payload[field.name] = rawValue === true
      }
      continue
    }

    const text = typeof rawValue === 'string' ? rawValue.trim() : ''
    if (text === '') {
      if (field.required) {
        throw new Error(`${prettyFieldName(field.name)} is required.`)
      }
      continue
    }

    payload[field.name] = field.type === 'number' ? Number(text) : text
  }

  return payload
}

async function submit() {
  errorMessage.value = ''

  if (!selectedSchema.value) {
    errorMessage.value = 'Choose a relation type.'
    return
  }

  if (!selectedTargetId.value) {
    errorMessage.value = 'Choose an entity to relate.'
    return
  }

  submitting.value = true

  try {
    const payload = buildPayload()
    await createRelation(props.entityRoute, props.id, selectedSchema.value.relatedRoute, {
      id: selectedTargetId.value,
      ...payload,
    })
    emit('created')
  } catch (error) {
    if (error instanceof ApiError || error instanceof Error) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Could not create the relation.'
    }
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  resetFormValues()
  loadTargets()
})

watch(selectedRelatedRoute, () => {
  resetFormValues()
  loadTargets()
})
</script>

<template>
  <form class="entity-form add-relation-form" @submit.prevent="submit">
    <div v-if="options.length > 1" class="form-row">
      <label for="add-relation-type">Relation type</label>
      <SearchableSelect
        id="add-relation-type"
        v-model="selectedRelatedRoute"
        :options="options.map((option) => ({ value: option.relatedRoute, label: entityLabelFromRoute(option.relatedRoute) }))"
      />
    </div>

    <div class="form-row">
      <label for="add-relation-target">{{ entityLabelFromRoute(selectedRelatedRoute) }}</label>
      <SearchableSelect
        id="add-relation-target"
        v-model="selectedTargetId"
        :options="targets.map((target) => ({ value: String(target.id), label: targetLabel(target) }))"
        :disabled="loadingTargets"
        :placeholder="loadingTargets ? 'Loading...' : 'Select one'"
      />
    </div>

    <div v-for="field in selectedSchema?.fields ?? []" :key="field.name" class="form-row">
      <label :for="`add-relation-field-${field.name}`">
        {{ prettyFieldName(field.name) }}
        <span v-if="field.required" class="required-marker" aria-hidden="true">*</span>
      </label>

      <input
        v-if="field.type === 'boolean'"
        :id="`add-relation-field-${field.name}`"
        v-model="formValues[field.name]"
        type="checkbox"
      />
      <input
        v-else-if="field.type === 'number'"
        :id="`add-relation-field-${field.name}`"
        v-model="formValues[field.name]"
        type="number"
        step="any"
        :required="field.required"
      />
      <textarea
        v-else-if="isLongTextField(field)"
        :id="`add-relation-field-${field.name}`"
        v-model="formValues[field.name]"
        rows="4"
        :required="field.required"
      ></textarea>
      <LoreDateInput
        v-else-if="field.type === 'loreDate'"
        v-model="formValues[field.name]"
        :required="field.required"
      />
      <input
        v-else
        :id="`add-relation-field-${field.name}`"
        v-model="formValues[field.name]"
        type="text"
        :required="field.required"
      />
    </div>

    <div class="form-actions">
      <button class="primary-button" type="submit" :disabled="submitting">
        {{ submitting ? 'Saving...' : 'Save' }}
      </button>
      <button class="secondary-button" type="button" :disabled="submitting" @click="emit('cancel')">Cancel</button>
    </div>

    <p v-if="errorMessage" class="status-card error">{{ errorMessage }}</p>
  </form>
</template>
