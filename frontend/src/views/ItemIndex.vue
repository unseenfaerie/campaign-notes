<template>
  <div class="main-content">
    <h1>Items</h1>
    <ul v-if="items.length">
      <li v-for="item in items" :key="item.id">
        <router-link :to="`/items/${item.id}`">{{ item.name }}</router-link>
      </li>
    </ul>
    <div v-else>Loading items...</div>
  </div>
</template>

<script>
import { getItems } from '../api/items';

export default {
  name: 'ItemIndex',
  data() {
    return { items: [] };
  },
  mounted() {
    getItems().then(data => { this.items = data; });
  }
};
</script>
