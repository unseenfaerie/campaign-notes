<template>
  <div v-if="event">
    <div v-if="!isEditing">
      <h1>{{ event.name }}</h1>
      <p><strong>ID:</strong> {{ event.id }}</p>
      <p><strong>Date:</strong> {{ event.date }}</p>
      <p><strong>Type:</strong> {{ event.type }}</p>
      <p><strong>Description:</strong> {{ event.short_description }}</p>
      <p><strong>Long Explanation:</strong> {{ event.long_explanation }}</p>
      <button @click="startEdit">Edit</button>
    </div>
    <form v-else @submit.prevent="saveEdit">
      <h1><input v-model="editEvent.name" required /></h1>
      <p><strong>ID:</strong> {{ event.id }}</p>
      <p><strong>Date:</strong> <input v-model="editEvent.date" type="date" /></p>
      <p><strong>Type:</strong> <input v-model="editEvent.type" /></p>
      <p><strong>Description:</strong><br />
        <textarea v-model="editEvent.short_description" rows="2" />
      </p>
      <p><strong>Long Explanation:</strong><br />
        <textarea v-model="editEvent.long_explanation" rows="12" style="width:100%; min-width:350px; min-height:200px;" />
      </p>
      <button type="submit">Save</button>
      <button type="button" @click="cancelEdit">Cancel</button>
      <div v-if="saveStatus === 'success'" style="color: green;">Saved!</div>
      <div v-if="saveStatus === 'error'" style="color: red;">Error saving changes.</div>
    </form>
  </div>
  <div v-else>
    Loading event...
  </div>
</template>

<script>
import { API_BASE_URL } from '../utils/api';

export default {
  name: 'EventDetail',
  data() {
    return {
      event: null,
      editEvent: null,
      isEditing: false,
      saveStatus: null
    };
  },
  mounted() {
    this.fetchEvent();
  },
  methods: {
    fetchEvent() {
      const id = this.$route.params.id;
      fetch(`${API_BASE_URL}/events/${id}`)
        .then(res => res.json())
        .then(data => {
          this.event = data;
          this.editEvent = { ...data };
        })
        .catch(err => {
          console.error('Error fetching event:', err);
        });
    },
    startEdit() {
      this.editEvent = { ...this.event };
      this.isEditing = true;
      this.saveStatus = null;
    },
    saveEdit() {
      const id = this.$route.params.id;
      const patchData = { ...this.editEvent };
      fetch(`${API_BASE_URL}/events/${id}`, {
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
          this.fetchEvent();
          this.isEditing = false;
          setTimeout(() => { this.saveStatus = null; }, 2000);
        })
        .catch(() => {
          this.saveStatus = 'error';
          setTimeout(() => { this.saveStatus = null; }, 2000);
        });
    },
    cancelEdit() {
      this.editEvent = { ...this.event };
      this.isEditing = false;
      this.saveStatus = null;
    }
  }
};
</script>
