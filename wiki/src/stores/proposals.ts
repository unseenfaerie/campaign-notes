import { computed, ref } from 'vue'
import { listPendingProposals } from '../services/domainService'

const pendingCount = ref<number | null>(null)
let requestVersion = 0

function reset() {
    requestVersion++
    pendingCount.value = null
}

async function refresh() {
    const version = ++requestVersion
    try {
        const proposals = await listPendingProposals()
        if (version === requestVersion) {
            pendingCount.value = proposals.length
        }
    } catch {
        if (version === requestVersion) {
            pendingCount.value = 0
        }
    }
}

export function useProposalStore() {
    return {
        pendingCount: computed(() => pendingCount.value),
        refresh,
        reset,
    }
}
