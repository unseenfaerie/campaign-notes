<script setup lang="ts">
type Props = {
  title: string
  count: number
  initiallyOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initiallyOpen: false,
})
</script>

<template>
  <details class="collapsible" :open="props.initiallyOpen">
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
