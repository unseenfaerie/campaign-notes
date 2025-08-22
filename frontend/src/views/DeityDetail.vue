<template>
  <div class="main-content" v-if="deity">
    <h1>{{ deity.name }}</h1>
    <p><strong>Description:</strong> {{ deity.short_description }}</p>
    <!-- Add more fields as needed -->
  </div>
  <div v-else>Loading deity...</div>
</template>

<script>
import { getDeity } from '../api/deities';

export default {
  name: 'DeityDetail',
  data() {
    return { deity: null };
  },
  mounted() {
    getDeity(this.$route.params.id).then(data => { this.deity = data; });
  }
};
</script>
