<template>
  <div class="main-content">
    <h1>Places</h1>
    <ul v-if="places.length">
      <li v-for="place in places" :key="place.id">
        <router-link :to="`/places/${place.id}`">{{ place.name }}</router-link>
      </li>
    </ul>
    <div v-else>Loading places...</div>
  </div>
</template>

<script>
import { getPlaces } from '../api/places';

export default {
  name: 'PlaceIndex',
  data() {
    return { places: [] };
  },
  mounted() {
    getPlaces().then(data => { this.places = data; });
  }
};
</script>
