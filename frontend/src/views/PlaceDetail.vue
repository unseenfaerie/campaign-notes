<template>
  <div class="main-content" v-if="place">
    <EntityHeader :name="place.name" :shortDescription="place.short_description" />
    <p><strong>Type:</strong> {{ place.type }}</p>
    <p><strong>Parent Place:</strong> {{ place.parent_id }}</p>
    <p><strong>Details:</strong> {{ place.long_explanation }}</p>
  </div>
  <div v-else>Loading place...</div>
</template>

<script>
import { getPlace } from '../api/places';
import EntityHeader from '../components/EntityHeader.vue';

export default {
  name: 'PlaceDetail',
  components: { EntityHeader },
  data() {
    return { place: null };
  },
  mounted() {
    getPlace(this.$route.params.id).then(data => { this.place = data; });
  }
};
</script>
