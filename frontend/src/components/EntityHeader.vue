<template>
  <div class="entity-header">
    <h1>{{ name }}</h1>
    <p v-if="shortDescription" class="entity-short-desc"><em>{{ shortDescription }}</em></p>
  </div>
</template>

<script>
export default {
  name: 'EntityHeader',
  props: {
    name: { type: String, required: true },
    shortDescription: { type: String, default: '' }
  }
};
</script>

