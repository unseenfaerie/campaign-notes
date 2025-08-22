<template>
  <div class="main-content" v-if="item">
    <EntityHeader :name="item.name" :shortDescription="item.short_description" />
    <p><strong>Details:</strong> {{ item.long_explanation }}</p>
  </div>
  <div v-else>Loading item...</div>
</template>

<script>
import { getItem } from '../api/items';
import EntityHeader from '../components/EntityHeader.vue';

export default {
  name: 'ItemDetail',
  components: { EntityHeader },
  data() {
    return { item: null };
  },
  mounted() {
    getItem(this.$route.params.id).then(data => { this.item = data; });
  }
};
</script>
