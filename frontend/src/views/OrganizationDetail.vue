<template>
  <div class="main-content" v-if="organization">
    <EntityHeader :name="organization.name" :shortDescription="organization.short_description" />
    <p><strong>Type:</strong> {{ organization.type }}</p>
    <p><strong>Locations:</strong> {{ organization.locations }}</p>
    <p><strong>Details:</strong> {{ organization.long_explanation }}</p>
  </div>
  <div v-else>Loading organization...</div>
</template>

<script>
import { getOrganization } from '../api/organizations';
import EntityHeader from '../components/EntityHeader.vue';

export default {
  name: 'OrganizationDetail',
  components: { EntityHeader },
  data() {
    return { organization: null };
  },
  mounted() {
    getOrganization(this.$route.params.id).then(data => { this.organization = data; });
  }
};
</script>
