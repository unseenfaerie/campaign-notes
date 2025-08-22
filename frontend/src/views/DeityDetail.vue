<template>
  <div class="main-content" v-if="deity">
    <EntityHeader :name="deity.name" :shortDescription="deity.short_description" />
    <p><strong>Pantheon:</strong> {{ deity.pantheon }}</p>
    <p><strong>Alignment:</strong> {{ deity.alignment }}</p>
    <p><strong>Details:</strong> {{ deity.long_explanation }}</p>
  </div>
  <div v-else>Loading deity...</div>
</template>

<script>
import { getDeity } from '../api/deities';
import EntityHeader from '../components/EntityHeader.vue';

export default {
  name: 'DeityDetail',
  components: { EntityHeader },
  data() {
    return { deity: null };
  },
  mounted() {
    getDeity(this.$route.params.id).then(data => { this.deity = data; });
  }
};
</script>
