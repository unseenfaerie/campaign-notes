import { computed, ref } from 'vue'
import { listPendingProposals } from '../services/domainService'

const pendingCount = ref<number | null>(null)
const errorMessage = ref('')
let requestVersion = 0

function reset() {
    requestVersion++
    pendingCount.value = null
    errorMessage.value = ''
}

async function refresh() {
    const version = ++requestVersion
    try {
        const proposals = await listPendingProposals()
        if (version === requestVersion) {
            pendingCount.value = proposals.length
            errorMessage.value = ''
        }
    } catch (error) {
        if (version === requestVersion) {
            pendingCount.value = null
            errorMessage.value = error instanceof Error ? error.message : 'Could not check proposals.'
        }
    }
}

export function useProposalStore() {
    return {
        pendingCount: computed(() => pendingCount.value),
        errorMessage: computed(() => errorMessage.value),
        refresh,
        reset,
    }
}
