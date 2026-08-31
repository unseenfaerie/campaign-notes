<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getMentionTargets, type MentionTarget } from '../services/mentionService'
import { linkifyText } from '../utils/linkify'

const props = defineProps<{
  text: string
}>()

const mentionTargets = ref<MentionTarget[]>([])

onMounted(async () => {
  mentionTargets.value = await getMentionTargets().catch(() => [] as MentionTarget[])
})

const fragments = computed(() => linkifyText(props.text, mentionTargets.value))
</script>

<template>
  <template v-for="(fragment, index) in fragments" :key="index">
    <RouterLink
      v-if="fragment.target"
      :to="{ name: 'entity-detail', params: { entityRoute: fragment.target.route, id: fragment.target.id } }"
    >
      <strong v-if="fragment.bold">
        <em v-if="fragment.italic">{{ fragment.text }}</em>
        <template v-else>{{ fragment.text }}</template>
      </strong>
      <em v-else-if="fragment.italic">{{ fragment.text }}</em>
      <template v-else>{{ fragment.text }}</template>
    </RouterLink>
    <strong v-else-if="fragment.bold">
      <em v-if="fragment.italic">{{ fragment.text }}</em>
      <template v-else>{{ fragment.text }}</template>
    </strong>
    <em v-else-if="fragment.italic">{{ fragment.text }}</em>
    <template v-else>{{ fragment.text }}</template>
  </template>
</template>
