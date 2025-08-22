<template>
  <div v-if="character">
    <h1>{{ character.name }}</h1>
    <p><strong>Type:</strong> <span v-if="character.type == 'pc'">Player Character</span><span v-else>Non-Player Character</span></p>
    <p><strong>Class:</strong> {{ character.class }}</p>
    <p><strong>Level:</strong> {{ character.level }}</p>
    <p><strong>Alignment:</strong> {{ character.alignment }}</p>
    <p><strong>Strength:</strong> {{ character.strength }}</p>
    <p><strong>Dexterity:</strong> {{ character.dexterity }}</p>
    <p><strong>Constitution:</strong> {{ character.constitution }}</p>
    <p><strong>Intelligence:</strong> {{ character.intelligence }}</p>
    <p><strong>Wisdom:</strong> {{ character.wisdom }}</p>
    <p><strong>Charisma:</strong> {{ character.charisma }}</p>
    <p><strong>Total Health:</strong> {{ character.total_health }}</p>
    <p><strong>Deceased:</strong> <span v-if="character.deceased">Yes</span><span v-else>No</span></p>
    <p><strong>Short Description:</strong> {{ character.short_description }}</p>
    <p><strong>Long Explanation:</strong> {{ character.long_explanation }}</p>
  </div>
  <div v-else>
    Loading character...
  </div>
</template>

<script>
export default {
  name: 'CharacterDetail',
  data() {
    return {
      character: null
    };
  },
  mounted() {
    const api = require('../utils/api');
    const id = this.$route.params.id;
    fetch(`${api.API_BASE_URL}/characters/${id}`)
      .then(res => res.json())
      .then(data => {
        this.character = data;
      })
      .catch(err => {
        console.error('Error fetching character:', err);
      });
  }
};
</script>