<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export type SearchableSelectOption = {
  value: string | number
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number
    options: SearchableSelectOption[]
    id?: string
    required?: boolean
    disabled?: boolean
    placeholder?: string
  }>(),
  {
    id: undefined,
    required: false,
    disabled: false,
    placeholder: 'Select one',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const root = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const searchText = ref('')
const emptyOptionSelected = ref(false)

const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue))
const filteredOptions = computed(() => {
  const query = searchText.value.trim().toLocaleLowerCase()
  if (!query) {
    return props.options
  }

  return props.options.filter((option) => option.label.toLocaleLowerCase().includes(query))
})

function syncSearchText() {
  if (props.modelValue === '' && !emptyOptionSelected.value) {
    searchText.value = ''
    return
  }

  searchText.value = selectedOption.value?.label ?? ''
}

function openOptions() {
  if (!props.disabled) {
    isOpen.value = true
  }
}

function toggleOptions() {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
    if (!isOpen.value) {
      syncSearchText()
    }
  }
}

function selectOption(option: SearchableSelectOption) {
  emptyOptionSelected.value = option.value === ''
  emit('update:modelValue', option.value)
  searchText.value = option.label
  isOpen.value = false
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (root.value && !root.value.contains(event.target as Node)) {
    isOpen.value = false
    syncSearchText()
  }
}

watch(
  () => [props.modelValue, props.options],
  ([modelValue, options], previous) => {
    if (modelValue !== '' || options !== previous?.[1]) {
      emptyOptionSelected.value = false
    }
    syncSearchText()
  },
  { immediate: true }
)
onMounted(() => document.addEventListener('pointerdown', handleDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleDocumentPointerDown))
</script>

<template>
  <div ref="root" class="searchable-select">
    <input
      :id="id"
      v-model="searchText"
      type="text"
      role="combobox"
      autocomplete="off"
      :aria-expanded="isOpen"
      :aria-controls="id ? `${id}-options` : undefined"
      :aria-autocomplete="'list'"
      :required="required && !modelValue"
      :disabled="disabled"
      :placeholder="placeholder"
      @focus="openOptions"
      @input="openOptions"
      @keydown.escape="isOpen = false; syncSearchText()"
    />
    <button
      type="button"
      class="searchable-select-toggle"
      :aria-label="isOpen ? 'Close options' : 'Open options'"
      :aria-expanded="isOpen"
      :disabled="disabled"
      @mousedown.prevent
      @click="toggleOptions"
    >
      <span aria-hidden="true" class="searchable-select-chevron"></span>
    </button>

    <div v-if="isOpen" :id="id ? `${id}-options` : undefined" class="searchable-select-options" role="listbox">
      <button
        v-for="option in filteredOptions"
        :key="String(option.value)"
        type="button"
        class="searchable-select-option"
        :class="{ selected: option.value === modelValue }"
        role="option"
        :aria-selected="option.value === modelValue"
        @mousedown.prevent
        @click="selectOption(option)"
      >
        {{ option.label }}
      </button>
      <span v-if="filteredOptions.length === 0" class="searchable-select-empty">No matches found.</span>
    </div>
  </div>
</template>
