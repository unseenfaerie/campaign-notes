<template>
  <div v-if="character">
    <div v-if="!isEditing">
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
      <button @click="startEdit">Edit</button>
    </div>
    <form v-else @submit.prevent="saveEdit">
      <h1>
        <input v-model="editCharacter.name" required />
      </h1>
      <p>
        <strong>Type:</strong>
        <select v-model="editCharacter.type">
          <option value="pc">Player Character</option>
          <option value="npc">Non-Player Character</option>
        </select>
      </p>
      <p><strong>Class:</strong> <input v-model="editCharacter.class" /></p>
      <p><strong>Level:</strong> <input v-model.number="editCharacter.level" type="number" min="1" /></p>
      <p><strong>Alignment:</strong> <input v-model="editCharacter.alignment" /></p>
      <p><strong>Strength:</strong> <input v-model.number="editCharacter.strength" type="number" /></p>
      <p><strong>Dexterity:</strong> <input v-model.number="editCharacter.dexterity" type="number" /></p>
      <p><strong>Constitution:</strong> <input v-model.number="editCharacter.constitution" type="number" /></p>
      <p><strong>Intelligence:</strong> <input v-model.number="editCharacter.intelligence" type="number" /></p>
      <p><strong>Wisdom:</strong> <input v-model.number="editCharacter.wisdom" type="number" /></p>
      <p><strong>Charisma:</strong> <input v-model.number="editCharacter.charisma" type="number" /></p>
      <p><strong>Total Health:</strong> <input v-model.number="editCharacter.total_health" type="number" /></p>
      <p>
        <strong>Deceased:</strong>
        <input type="checkbox" v-model="editCharacter.deceased" true-value="1" false-value="0" />
      </p>
      <p><strong>Short Description:</strong><br />
        <textarea v-model="editCharacter.short_description" rows="2" />
      </p>
      <p><strong>Long Explanation:</strong><br />
        <textarea v-model="editCharacter.long_explanation" rows="4" />
      </p>
      <button type="submit">Save</button>
      <button type="button" @click="cancelEdit">Cancel</button>
      <div v-if="saveStatus === 'success'" style="color: green;">Saved!</div>
      <div v-if="saveStatus === 'error'" style="color: red;">Error saving changes.</div>
    </form>
  </div>
  <div v-else>
    Loading character...
  </div>
</template>

<script>
import { API_BASE_URL } from '../utils/api';

export default {
  name: 'CharacterDetail',
  data() {
    return {
      character: null,
      editCharacter: null,
      saveStatus: null,
      isEditing: false
    };
  },
  mounted() {
    this.fetchCharacter();
  },
  methods: {
    fetchCharacter() {
      const id = this.$route.params.id;
      fetch(`${API_BASE_URL}/characters/${id}`)
        .then(res => res.json())
        .then(data => {
          this.character = data;
          this.editCharacter = { ...data };
        })
        .catch(err => {
          console.error('Error fetching character:', err);
        });
    },
    startEdit() {
      this.editCharacter = { ...this.character };
      this.isEditing = true;
      this.saveStatus = null;
    },
    saveEdit() {
      const id = this.$route.params.id;
      const patchData = { ...this.editCharacter };
      fetch(`${API_BASE_URL}/characters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchData)
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to save');
          return res.json();
        })
        .then(() => {
          this.saveStatus = 'success';
          this.fetchCharacter();
          this.isEditing = false;
          setTimeout(() => { this.saveStatus = null; }, 2000);
        })
        .catch(() => {
          this.saveStatus = 'error';
          setTimeout(() => { this.saveStatus = null; }, 2000);
        });
    },
    cancelEdit() {
      this.editCharacter = { ...this.character };
      this.isEditing = false;
      this.saveStatus = null;
    }
  }
};
</script>