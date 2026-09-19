<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ApiError } from '../services/apiClient'
import { listPendingProposals, type PendingProposalInboxItem } from '../services/domainService'

const loading = ref(true)
const errorMessage = ref('')
const proposals = ref<PendingProposalInboxItem[]>([])

async function loadProposals() {
  loading.value = true
  errorMessage.value = ''

  try {
    proposals.value = await listPendingProposals()
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Could not load proposals.'
  } finally {
    loading.value = false
  }
}

onMounted(loadProposals)
</script>

<template>
  <section>
    <header class="view-header list-header">
      <h2>Proposal Inbox</h2>
    </header>

    <p v-if="loading" class="status-card">Loading proposals...</p>
    <p v-else-if="errorMessage" class="status-card error">{{ errorMessage }}</p>
    <p v-else-if="proposals.length === 0" class="status-card">No open proposals.</p>

    <ol v-else class="proposal-inbox-list">
      <li v-for="proposal in proposals" :key="proposal.id">
        <template v-for="(entity, index) in proposal.target.entities" :key="`${entity.entityRoute}-${entity.id}`">
          <span v-if="index > 0" class="proposal-arrow" aria-hidden="true">&rarr;</span>
          <RouterLink :to="{ name: 'entity-detail', params: { entityRoute: entity.entityRoute, id: entity.id } }">
            {{ entity.label }}
          </RouterLink>
        </template>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.proposal-inbox-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--line-soft);
}

.proposal-inbox-list li {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.8rem 0.2rem;
  border-bottom: 1px solid var(--line-soft);
}

.proposal-arrow {
  color: var(--ink-muted);
}
</style>