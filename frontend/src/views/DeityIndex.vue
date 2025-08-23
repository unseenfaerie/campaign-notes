<template>
  <div class="main-content">
    <h1>Deities</h1>
    <ul v-if="deities.length">
      <li v-for="deity in deities" :key="deity.id">
        <router-link :to="`/deities/${deity.id}`">{{ deity.name }}</router-link>
      </li>
    </ul>
    <div v-else>Loading deities...</div>
  </div>
</template>

<script>
import { getDeities } from '../api/deities';

export default {
  name: 'DeityIndex',
  data() {
    return { deities: [] };
  },
  mounted() {
    getDeities().then(data => { this.deities = data; });
  }
};
</script>
