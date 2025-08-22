<template>
  <div>
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
    fetch('http://10.0.0.215:3000/api/characters')
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