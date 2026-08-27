<script setup lang="ts">
import { ref } from 'vue'

type Props = {
  title: string
  count: number
  initiallyOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initiallyOpen: false,
})

const detailsRef = ref<HTMLDetailsElement | null>(null)

function expand() {
  if (detailsRef.value) {
    detailsRef.value.open = true
  }
}

defineExpose({ expand })
</script>

<template>
  <details ref="detailsRef" class="collapsible" :open="props.initiallyOpen">
    <summary>
      <span class="collapsible-heading">
        <span>{{ props.title }}</span>
        <span class="badge">{{ props.count }}</span>
      </span>
      <span v-if="$slots['header-actions']" class="collapsible-header-actions" @click.stop @mousedown.stop>
        <slot name="header-actions" />
      </span>
    </summary>
    <div class="collapsible-body">
      <slot />
    </div>
  </details>
</template>
