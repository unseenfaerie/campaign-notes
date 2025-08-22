<template>
  <div class="main-content">
    <h1>Characters</h1>
    <ul v-if="characters.length">
      <li v-for="char in characters" :key="char.id">
        <router-link :to="`/characters/${char.id}`">{{ char.name }}</router-link>
      </li>
    </ul>
    <div v-else>
      Loading characters...
    </div>
  </div>
</template>

<script>
export default {
  name: 'CharacterIndex',
  data() {
    return {
      characters: []
    };
  },
  mounted() {
    const api = require('../utils/api');
    fetch(`${api.API_BASE_URL}/characters`)
      .then(res => res.json())
      .then(data => {
        this.characters = data;
      })
      .catch(err => {
        console.error('Error fetching characters:', err);
      });
  }
};
</script>