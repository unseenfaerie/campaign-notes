<template>
  <div class="main-content" v-if="item">
    <h1>{{ item.name }}</h1>
    <p><strong>ID:</strong> {{ item.id }}</p>
    <p><strong>Description:</strong> {{ item.description }}</p>
    <!-- Add more fields as needed -->
  </div>
  <div v-else>Loading item...</div>
</template>

<script>
import { getItem } from '../api/items';

export default {
  name: 'ItemDetail',
  data() {
    return { item: null };
  },
  mounted() {
    getItem(this.$route.params.id).then(data => { this.item = data; });
  }
};
</script>
