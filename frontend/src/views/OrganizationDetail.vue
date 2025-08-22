<template>
  <div class="main-content" v-if="organization">
    <h1>{{ organization.name }}</h1>
    <p><strong>ID:</strong> {{ organization.id }}</p>
    <p><strong>Description:</strong> {{ organization.description }}</p>
    <!-- Add more fields as needed -->
  </div>
  <div v-else>Loading organization...</div>
</template>

<script>
import { getOrganization } from '../api/organizations';

export default {
  name: 'OrganizationDetail',
  data() {
    return { organization: null };
  },
  mounted() {
    getOrganization(this.$route.params.id).then(data => { this.organization = data; });
  }
};
</script>
