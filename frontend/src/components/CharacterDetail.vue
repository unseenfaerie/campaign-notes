<template>
  <div v-if="character">
    <h1>{{ character.name }}</h1>
    <p><strong>Type:</strong> {{ character.type }}</p>
    <p><strong>Class:</strong> {{ character.class }}</p>
    <p><strong>Level:</strong> {{ character.level }}</p>
    <p><strong>Description:</strong> {{ character.short_description }}</p>
    <!-- Add more fields as needed -->
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
    const id = this.$route.params.id;
    fetch(`http://10.0.0.215:3000/api/characters/${id}`)
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