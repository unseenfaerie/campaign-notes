<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ProposalValue from '../components/ProposalValue.vue'
import { getEditProposals, getProposalStats, reviewProposal, type EditProposal } from '../services/metaService'

type TabType = 'pending' | 'approved' | 'rejected'

const activeTab = ref<TabType>('pending')
const loading = ref(false)
const errorMessage = ref('')
const processingProposalId = ref<string | null>(null)
const pendingProposalCount = ref(0)

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

const rejectionReasons = ref<Record<string, string>>({})

async function loadProposals() {
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await getEditProposals(activeTab.value)
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

async function loadPendingProposalCount() {
  try {
    pendingProposalCount.value = (await getProposalStats()).pending
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message
    }
  }
}

function selectTab(tab: TabType) {
  activeTab.value = tab
  loadProposals()
}

async function handleApprove(proposalId: string) {
  processingProposalId.value = proposalId
  try {
    await reviewProposal(proposalId, 'approve')
    // Reload proposals
    await loadProposals()
    await loadPendingProposalCount()
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message
    }
  } finally {
    processingProposalId.value = null
  }
}

async function handleReject(proposalId: string) {
  const reason = rejectionReasons.value[proposalId] || ''
  processingProposalId.value = proposalId
  try {
    await reviewProposal(proposalId, 'reject', reason)
    delete rejectionReasons.value[proposalId]
    // Reload proposals
    await loadProposals()
    await loadPendingProposalCount()
  } catch (error) {
    if (error instanceof Error) {
      errorMessage.value = error.message
    }
  } finally {
    processingProposalId.value = null
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function toggleRejectionForm(proposalId: string) {
  if (rejectionReasons.value[proposalId] !== undefined) {
    delete rejectionReasons.value[proposalId]
  } else {
    rejectionReasons.value[proposalId] = ''
  }
}

onMounted(async () => {
  await Promise.all([loadProposals(), loadPendingProposalCount()])
})
</script>

<template>
  <section class="admin-proposals-view">
    <header class="view-header">
      <h1>Edit Proposals Review</h1>
      <p class="subtitle">Review and approve player edit suggestions</p>
    </header>

    <p v-if="loading" class="status-card">Loading proposals...</p>
    <p v-else-if="errorMessage" class="status-card error">{{ errorMessage }}</p>

    <div v-else class="proposals-container">
      <div class="tabs">
        <button
          :class="{ active: activeTab === 'pending' }"
          class="tab-button"
          @click="selectTab('pending')"
        >
          Pending ({{ pendingProposalCount }})
        </button>
        <button
          :class="{ active: activeTab === 'approved' }"
          class="tab-button"
          @click="selectTab('approved')"
        >
          Approved
        </button>
        <button
          :class="{ active: activeTab === 'rejected' }"
          class="tab-button"
          @click="selectTab('rejected')"
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
            <div class="proposal-info">
              <div class="proposal-title">
                <strong>{{ proposal.entity_route }}</strong> · {{ proposal.field_name }}
              </div>
              <small class="proposal-submitter">
                Proposed by user: {{ proposal.proposed_by_user_id }}
              </small>
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
            <strong>Rejection reason:</strong>
            <p>{{ proposal.rejected_reason }}</p>
          </div>

          <div v-if="activeTab === 'pending'" class="proposal-actions">
            <button
              type="button"
              class="button approve-button"
              :disabled="processingProposalId === proposal.id"
              @click="handleApprove(proposal.id)"
            >
              {{ processingProposalId === proposal.id ? 'Approving...' : 'Approve' }}
            </button>

            <button
              type="button"
              class="button reject-button"
              :disabled="processingProposalId === proposal.id"
              @click="toggleRejectionForm(proposal.id)"
            >
              {{ rejectionReasons[proposal.id] !== undefined ? 'Cancel' : 'Reject' }}
            </button>

            <div v-if="rejectionReasons[proposal.id] !== undefined" class="rejection-form">
              <textarea
                v-model="rejectionReasons[proposal.id]"
                placeholder="Reason for rejection (optional)"
                class="rejection-textarea"
              ></textarea>
              <button
                type="button"
                class="button reject-button"
                :disabled="processingProposalId === proposal.id"
                @click="handleReject(proposal.id)"
              >
                {{ processingProposalId === proposal.id ? 'Rejecting...' : 'Confirm Reject' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin-proposals-view {
  padding: 1rem;
}

.view-header {
  margin-bottom: 2rem;
}

.view-header h1 {
  margin: 0 0 0.5rem;
  font-size: 2rem;
}

.subtitle {
  margin: 0;
  color: #666;
  font-size: 1rem;
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
  gap: 1rem;
}

.proposal-info {
  flex: 1;
}

.proposal-title {
  font-size: 1rem;
  color: #333;
}

.proposal-submitter {
  display: block;
  color: #999;
  margin-top: 0.25rem;
}

.proposal-status {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: bold;
  text-transform: uppercase;
  white-space: nowrap;
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
  margin: 1rem 0;
  padding: 0.75rem;
  background-color: #fff3cd;
  border-left: 3px solid #ffc107;
  border-radius: 2px;
}

.rejection-reason p {
  margin: 0.5rem 0 0;
  color: #555;
}

.proposal-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
}

.button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.approve-button {
  background-color: #d4edda;
  color: #155724;
  border-color: #c3e6cb;
}

.approve-button:hover:not(:disabled) {
  background-color: #c3e6cb;
}

.reject-button {
  background-color: #f8d7da;
  color: #721c24;
  border-color: #f5c6cb;
}

.reject-button:hover:not(:disabled) {
  background-color: #f5c6cb;
}

.rejection-form {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background-color: #fff3cd;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rejection-textarea {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  min-height: 80px;
}

@media (max-width: 768px) {
  .proposal-diff {
    grid-template-columns: 1fr;
  }

  .proposal-header {
    flex-direction: column;
  }

  .proposal-actions {
    flex-direction: column;
  }

  .button {
    width: 100%;
  }
}
</style>
