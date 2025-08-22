<template>
  <div>
    <h1>Events</h1>
    <div v-if="loading">Loading events...</div>
    <div v-else>
      <ul>
        <li v-for="event in events" :key="event.id">
          <router-link :to="`/events/${event.id}`">{{ event.name }}</router-link>
        </li>
      </ul>
      <div v-if="events.length === 0">No events found.</div>
    </div>
  </div>
</template>

<script>
import { API_BASE_URL } from '../utils/api';

export default {
  name: 'EventIndex',
  data() {
    return {
      events: [],
      loading: true
    };
  },
  mounted() {
    fetch(`${API_BASE_URL}/events`)
      .then(res => res.json())
      .then(data => {
        this.events = data;
        this.loading = false;
      })
      .catch(() => {
        this.loading = false;
      });
  }
};
</script>
