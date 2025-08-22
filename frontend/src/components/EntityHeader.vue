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

<style scoped>
.entity-header {
  margin-bottom: 1.5rem;
  background-color: powderblue;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.entity-short-desc {
  color: #666;
  font-size: 1.1em;
  margin-top: 0.2em;
}
</style>
