<template>
  <div class="main-content" v-if="place">
    <h1>{{ place.name }}</h1>
    <p><strong>ID:</strong> {{ place.id }}</p>
    <p><strong>Description:</strong> {{ place.description }}</p>
    <!-- Add more fields as needed -->
  </div>
  <div v-else>Loading place...</div>
</template>

<script>
import { getPlace } from '../api/places';

export default {
  name: 'PlaceDetail',
  data() {
    return { place: null };
  },
  mounted() {
    getPlace(this.$route.params.id).then(data => { this.place = data; });
  }
};
</script>
