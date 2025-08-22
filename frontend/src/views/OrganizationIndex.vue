<template>
  <div class="main-content">
    <h1>Organizations</h1>
    <ul v-if="organizations.length">
      <li v-for="org in organizations" :key="org.id">
        <router-link :to="`/organizations/${org.id}`">{{ org.name }}</router-link>
      </li>
    </ul>
    <div v-else>Loading organizations...</div>
  </div>
</template>

<script>
import { getOrganizations } from '../api/organizations';

export default {
  name: 'OrganizationIndex',
  data() {
    return { organizations: [] };
  },
  mounted() {
    getOrganizations().then(data => { this.organizations = data; });
  }
};
</script>
