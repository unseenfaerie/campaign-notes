import { strict as assert } from 'node:assert'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createServer } from 'vite'

let server
let RelationTimeline

before(async () => {
    server = await createServer({
        root: fileURLToPath(new URL('..', import.meta.url)),
        cacheDir: 'node_modules/.vite-relation-timeline-test',
        server: { middlewareMode: true, hmr: false },
        appType: 'custom',
    })
    RelationTimeline = (await server.ssrLoadModule('/src/components/RelationTimeline.vue')).default
})

after(async () => {
    await server?.close()
})

function renderTimeline(timeline, editable) {
    return renderToString(createSSRApp({
        render: () => h(RelationTimeline, {
            entityRoute: 'characters', entityId: 'hero',
            relatedRoute: 'places', relatedId: 'town',
            timeline, editable, dateSystem: null,
        }),
    }))
}

test('hides an empty timeline but lets a DM add one', async () => {
    const editable = await renderTimeline([], true)
    assert.doesNotMatch(editable, /<section|No timeline entries/)
    assert.match(editable, />Add timeline<\/button>/)

    const readOnly = await renderTimeline([], false)
    assert.doesNotMatch(readOnly, /<section|<button|Timeline/i)
})

test('shows populated timelines to readers and offers editing to DMs', async () => {
    const entries = [{ id: 'one', description: 'Met in town', date: null }]
    const readOnly = await renderTimeline(entries, false)
    assert.match(readOnly, /<h4>Timeline<\/h4>/)
    assert.match(readOnly, /Met in town/)
    assert.doesNotMatch(readOnly, /Edit timeline/)
    assert.match(await renderTimeline(entries, true), /Edit timeline/)
})
