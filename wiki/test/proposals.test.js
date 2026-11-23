import { strict as assert } from 'node:assert'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

let server
let proposals
const originalFetch = globalThis.fetch

before(async () => {
    server = await createServer({
        configFile: false,
        root: fileURLToPath(new URL('..', import.meta.url)),
        cacheDir: 'node_modules/.vite-proposal-test',
        server: { middlewareMode: true },
        appType: 'custom',
    })
    const module = await server.ssrLoadModule('/src/stores/proposals.ts')
    proposals = module.useProposalStore()
})

after(async () => {
    globalThis.fetch = originalFetch
    await server?.close()
})

test('reports pending proposals and treats failed requests as an empty inbox', async () => {
    proposals.reset()
    globalThis.fetch = async () => Response.json([{ id: 1 }, { id: 2 }])
    await proposals.refresh()
    assert.equal(proposals.pendingCount.value, 2)

    globalThis.fetch = async () => Response.json([])
    await proposals.refresh()
    assert.equal(proposals.pendingCount.value, 0)

    globalThis.fetch = async () => Response.json({ error: 'Unavailable' }, { status: 500 })
    await proposals.refresh()
    assert.equal(proposals.pendingCount.value, 0)

    globalThis.fetch = async () => {
        throw new TypeError('NetworkError when attempting to fetch resource.')
    }
    await proposals.refresh()
    assert.equal(proposals.pendingCount.value, 0)

    globalThis.fetch = async () => Response.json([{ id: 3 }])
    await proposals.refresh()
    assert.equal(proposals.pendingCount.value, 1)
})

test('ignores outdated requests after a newer refresh or session reset', async () => {
    proposals.reset()
    let resolveOldRequest
    globalThis.fetch = () => new Promise(resolve => { resolveOldRequest = resolve })
    const oldRequest = proposals.refresh()
    globalThis.fetch = async () => Response.json([])
    await proposals.refresh()
    resolveOldRequest(Response.json([{ id: 1 }]))
    await oldRequest
    assert.equal(proposals.pendingCount.value, 0)

    globalThis.fetch = () => new Promise(resolve => { resolveOldRequest = resolve })
    const previousSession = proposals.refresh()
    proposals.reset()
    resolveOldRequest(Response.json([{ id: 1 }]))
    await previousSession
    assert.equal(proposals.pendingCount.value, null)
})
