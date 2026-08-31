<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ProposalValue from '../components/ProposalValue.vue'
import { useAuthStore } from '../stores/auth'
import { getUserProposals, type EditProposal } from '../services/metaService'

type TabType = 'pending' | 'approved' | 'rejected'

const auth = useAuthStore()
const activeTab = ref<TabType>('pending')
const loading = ref(false)
const errorMessage = ref('')

const allProposals = ref<EditProposal[]>([])

const pendingProposals = computed(() => allProposals.value.filter((p) => p.status === 'pending'))
const approvedProposals = computed(() => allProposals.value.filter((p) => p.status === 'approved'))
const rejectedProposals = computed(() => allProposals.value.filter((p) => p.status === 'rejected'))

const displayedProposals = computed(() => {
  switch (activeTab.value) {
    case 'approved':
      return approvedProposals.value
    case 'rejected':
      return rejectedProposals.value
    default:
      return pendingProposals.value
  }
})

async function loadProposals() {
  loading.value = true
  errorMessage.value = ''

  try {
    if (!auth.user.value) {
      throw new Error('You must be signed in to view edit proposals.')
    }
    const result = await getUserProposals(auth.user.value.id)
    allProposals.value = result.proposals || []
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Failed to load proposals'
    }
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => loadProposals())
</script>

<template>
  <section class="proposals-view">
    <header class="view-header">
      <h1>My Edit Proposals</h1>
    </header>

    <p v-if="loading" class="status-card">Loading proposals...</p>
    <p v-else-if="errorMessage" class="status-card error">{{ errorMessage }}</p>

    <div v-else class="proposals-container">
      <div class="tabs">
        <button
          :class="{ active: activeTab === 'pending' }"
          class="tab-button"
          @click="activeTab = 'pending'"
        >
          Pending ({{ pendingProposals.length }})
        </button>
        <button
          :class="{ active: activeTab === 'approved' }"
          class="tab-button"
          @click="activeTab = 'approved'"
        >
          Approved
        </button>
        <button
          :class="{ active: activeTab === 'rejected' }"
          class="tab-button"
          @click="activeTab = 'rejected'"
        >
          Rejected
        </button>
      </div>

      <div v-if="displayedProposals.length === 0" class="empty-state">
        <p>No {{ activeTab }} proposals</p>
      </div>

      <div v-else class="proposals-list">
        <div v-for="proposal in displayedProposals" :key="proposal.id" class="proposal-card">
          <div class="proposal-header">
            <div class="proposal-title">
              <strong>{{ proposal.entity_route }}</strong> · {{ proposal.field_name }}
            </div>
            <div class="proposal-status" :class="proposal.status">
              {{ proposal.status.toUpperCase() }}
            </div>
          </div>

          <div class="proposal-dates">
            <small>Created: {{ formatDate(proposal.created_at) }}</small>
            <small v-if="proposal.reviewed_at">
              Reviewed: {{ formatDate(proposal.reviewed_at) }}
            </small>
          </div>

          <div class="proposal-diff">
            <div class="diff-section">
              <label>Proposed Value:</label>
              <ProposalValue :proposal="proposal" value="new" />
            </div>
          </div>

          <div v-if="proposal.rejected_reason && proposal.status === 'rejected'" class="rejection-reason">
            <strong>Reason for rejection:</strong>
            <p>{{ proposal.rejected_reason }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.proposals-view {
  padding: 1rem;
}

.view-header {
  margin-bottom: 2rem;
}

.view-header h1 {
  margin: 0;
  font-size: 2rem;
}

.status-card {
  padding: 1rem;
  border-radius: 4px;
  background-color: #f5f5f5;
  color: #333;
}

.status-card.error {
  background-color: #fee;
  color: #c00;
}

.proposals-container {
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tabs {
  display: flex;
  border-bottom: 2px solid #e0e0e0;
}

.tab-button {
  flex: 1;
  padding: 1rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-weight: 500;
  color: #666;
  transition: all 0.2s;
}

.tab-button:hover {
  background-color: #f5f5f5;
  color: #333;
}

.tab-button.active {
  color: #0066cc;
  border-bottom-color: #0066cc;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #999;
}

.proposals-list {
  padding: 1rem;
}

.proposal-card {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1rem;
  background-color: #fafafa;
}

.proposal-card:last-child {
  margin-bottom: 0;
}

.proposal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.proposal-title {
  font-size: 1rem;
  color: #333;
}

.proposal-status {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: bold;
  text-transform: uppercase;
}

.proposal-status.pending {
  background-color: #fff3cd;
  color: #856404;
}

.proposal-status.approved {
  background-color: #d4edda;
  color: #155724;
}

.proposal-status.rejected {
  background-color: #f8d7da;
  color: #721c24;
}

.proposal-dates {
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
  color: #666;
  font-size: 0.9rem;
}

.proposal-dates small {
  display: block;
}

.proposal-diff {
  margin-bottom: 1rem;
}

.diff-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.diff-section label {
  font-weight: 500;
  font-size: 0.9rem;
  color: #555;
}

.value-display {
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.75rem;
  max-height: 200px;
  overflow-y: auto;
  font-size: 0.85rem;
  color: #333;
  margin: 0;
  font-family: 'Courier New', monospace;
}

.rejection-reason {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #fff3cd;
  border-left: 3px solid #ffc107;
  border-radius: 2px;
}

.rejection-reason p {
  margin: 0.5rem 0 0;
  color: #555;
}

@media (max-width: 768px) {
  .proposal-diff {
    grid-template-columns: 1fr;
  }

  .proposal-header {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
