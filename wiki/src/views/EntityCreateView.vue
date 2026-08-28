<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { entitySingularLabelFromRoute } from '../config/entities'
import { ApiError } from '../services/apiClient'
import { createEntity, listEntities, type DomainEntity } from '../services/domainService'
import { getEntitySchema, type EntityFieldSchema, type EntitySchema } from '../services/metaService'
import LoreDateInput from '../components/LoreDateInput.vue'
import SearchableSelect from '../components/SearchableSelect.vue'

const props = defineProps<{
  entityRoute: string
}>()

const router = useRouter()

const loading = ref(true)
const submitting = ref(false)
const errorMessage = ref('')
const schema = ref<EntitySchema | undefined>()
const formValues = ref<Record<string, any>>({})
const placeOptions = ref<DomainEntity[]>([])
const slugTouched = ref(false)

const singularLabel = computed(() => entitySingularLabelFromRoute(props.entityRoute))

const visibleFields = computed(() => {
  const fields = schema.value?.fields ?? []
  return fields.filter((field) => !(field.primary && field.autoIncrement))
})

const slugField = computed(() => {
  const fields = schema.value?.fields ?? []
  return fields.find((field) => field.primary && field.format === 'slug')
})

const nameField = computed(() => {
  const fields = schema.value?.fields ?? []
  return fields.find((field) => field.name === 'name')
})

function isLongTextField(field: EntityFieldSchema): boolean {
  return field.type === 'string' && /description|explanation|notes/i.test(field.name)
}

function prettyFieldName(name: string): string {
  return name
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function prettyEnumValue(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

function onSlugInput() {
  slugTouched.value = true
}

async function loadSchema() {
  loading.value = true
  errorMessage.value = ''
  schema.value = undefined
  formValues.value = {}
  placeOptions.value = []
  slugTouched.value = false

  try {
    const found = await getEntitySchema(props.entityRoute)
    if (!found) {
      errorMessage.value = `No form schema is available for "${props.entityRoute}".`
      return
    }

    schema.value = found

    if (props.entityRoute === 'places') {
      placeOptions.value = (await listEntities('places')).sort((left, right) =>
        String(left.name || left.id).localeCompare(String(right.name || right.id))
      )
    }

    const initialValues: Record<string, any> = {}
    for (const field of found.fields) {
      initialValues[field.name] = field.type === 'boolean' ? false : ''
    }
    formValues.value = initialValues
  } catch (error) {
    if (error instanceof ApiError) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Could not load the form schema.'
    }
  } finally {
    loading.value = false
  }
}

function buildPayload(): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  for (const field of visibleFields.value) {
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

async function submitCreate() {
  errorMessage.value = ''
  submitting.value = true

  try {
    const created = await createEntity(props.entityRoute, buildPayload())
    const createdId = schema.value ? created[schema.value.idField] : undefined

    if (createdId !== undefined && createdId !== null && createdId !== '') {
      await router.push({
        name: 'entity-detail',
        params: { entityRoute: props.entityRoute, id: String(createdId) },
      })
    } else {
      await router.push({ name: 'entity-list', params: { entityRoute: props.entityRoute } })
    }
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Could not create the record.'
    }
  } finally {
    submitting.value = false
  }
}

function cancelCreate() {
  router.push({ name: 'entity-list', params: { entityRoute: props.entityRoute } })
}

onMounted(loadSchema)
watch(() => props.entityRoute, loadSchema)

watch(
  () => (nameField.value ? formValues.value[nameField.value.name] : undefined),
  (value) => {
    const slug = slugField.value
    if (!slug || slugTouched.value || typeof value !== 'string') {
      return
    }
    formValues.value[slug.name] = slugify(value)
  }
)
</script>

<template>
  <section>
    <header class="view-header">
      <h2>Create {{ singularLabel }}</h2>
    </header>

    <p v-if="loading" class="status-card">Loading form...</p>
    <p v-else-if="!schema" class="status-card error">{{ errorMessage || 'No form schema is available.' }}</p>

    <form v-else class="wiki-article entity-form" @submit.prevent="submitCreate">
      <div v-for="field in visibleFields" :key="field.name" class="form-row">
        <label :for="`create-field-${field.name}`">
          {{ prettyFieldName(field.name) }}
          <span v-if="field.required" class="required-marker" aria-hidden="true">*</span>
        </label>

        <input
          v-if="field.type === 'boolean'"
          :id="`create-field-${field.name}`"
          v-model="formValues[field.name]"
          type="checkbox"
        />
        <SearchableSelect
          v-else-if="entityRoute === 'places' && field.name === 'parent_id'"
          :id="`create-field-${field.name}`"
          v-model="formValues[field.name]"
          :options="[
            { value: '', label: 'No parent' },
            ...placeOptions.map((place) => ({ value: String(place.id), label: String(place.name || place.id) })),
          ]"
        />
        <SearchableSelect
          v-else-if="field.enum"
          :id="`create-field-${field.name}`"
          v-model="formValues[field.name]"
          :options="[
            ...(field.required ? [] : [{ value: '', label: `No ${prettyFieldName(field.name).toLowerCase()}` }]),
            ...field.enum.map((value) => ({ value, label: prettyEnumValue(value) })),
          ]"
          :required="field.required"
        />
        <input
          v-else-if="field.type === 'number'"
          :id="`create-field-${field.name}`"
          v-model="formValues[field.name]"
          type="number"
          step="any"
          :required="field.required"
        />
        <textarea
          v-else-if="isLongTextField(field)"
          :id="`create-field-${field.name}`"
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
          :id="`create-field-${field.name}`"
          v-model="formValues[field.name]"
          type="text"
          :required="field.required"
          @input="field.primary ? onSlugInput() : undefined"
        />

        <p v-if="field.primary && field.format === 'slug'" class="field-hint">
          Lowercase letters and dashes only.
        </p>
      </div>

      <div class="form-actions">
        <button class="primary-button" type="submit" :disabled="submitting">
          {{ submitting ? 'Creating...' : `Create ${singularLabel}` }}
        </button>
        <button class="secondary-button" type="button" :disabled="submitting" @click="cancelCreate">Cancel</button>
      </div>

      <p v-if="errorMessage" class="status-card error">{{ errorMessage }}</p>
    </form>
  </section>
</template>
