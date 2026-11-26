import { strict as assert } from 'node:assert'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createRenderer, createSSRApp, h, nextTick, ssrContextKey } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createServer } from 'vite'

let server
let RelationTimeline
const originalFetch = globalThis.fetch

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
    globalThis.fetch = originalFetch
    await server?.close()
})

function renderTimeline(timeline, editable) {
    return renderToString(createSSRApp({
        render: () => h(RelationTimeline, {
            entityRoute: 'characters', entityId: 'hero',
            relatedRoute: 'places', relatedId: 'town',
            timeline, editable, isAdmin: true, dateSystem: null,
        }),
    }))
}

test('shows an empty timeline heading only when it can be edited', async () => {
    const editable = await renderTimeline([], true)
    assert.match(editable, /<h4>Timeline<\/h4>\s*<button[^>]*class="inline-edit-button"[^>]*aria-label="Add timeline"/)
    assert.doesNotMatch(editable, /<ol|No timeline entries/)

    const readOnly = await renderTimeline([], false)
    assert.doesNotMatch(readOnly, /<section|<button|Timeline/i)
})

test('players submit reordered timelines as proposals while DMs save directly', async () => {
    const renderer = createRenderer({
        createElement: type => ({ type, children: [], props: {} }),
        createText: text => ({ type: 'text', text }),
        createComment: text => ({ type: 'comment', text }),
        setText: (node, text) => { node.text = text },
        setElementText: (node, text) => { node.text = text; node.children = [] },
        patchProp: (node, key, _old, value) => { node.props[key] = value },
        insert: (node, parent, anchor) => {
            if (node.parent) {
                const oldIndex = node.parent.children.indexOf(node)
                if (oldIndex >= 0) node.parent.children.splice(oldIndex, 1)
            }
            node.parent = parent
            const index = anchor ? parent.children.indexOf(anchor) : -1
            parent.children.splice(index < 0 ? parent.children.length : index, 0, node)
        },
        remove: node => {
            const index = node.parent?.children.indexOf(node) ?? -1
            if (index >= 0) node.parent.children.splice(index, 1)
        },
        parentNode: node => node.parent,
        nextSibling: node => {
            const siblings = node.parent?.children ?? []
            return siblings[siblings.indexOf(node) + 1] ?? null
        },
    })
    const entries = [
        { id: 'one', description: 'First', date: null },
        { id: 'two', description: 'Second', date: null },
    ]

    for (const isAdmin of [false, true]) {
        const requests = []
        globalThis.fetch = async (url, options) => {
            if (url === '/api/meta') return Response.json({ dateSystem: null })
            requests.push({ url, options })
            return Response.json({})
        }
        let updated = false
        const root = { children: [] }
        const app = renderer.createApp({ ...RelationTimeline, render: () => null }, {
            entityRoute: 'characters', entityId: 'hero', relatedRoute: 'characters', relatedId: 'ally',
            anchorMemberIndex: 1, timeline: entries, editable: true, isAdmin, dateSystem: null,
            onUpdated: () => { updated = true },
        })
        app.provide(ssrContextKey, { modules: new Set() })
        const instance = app.mount(root)
        const editor = instance.$.setupState
        editor.startEditing()
        await nextTick()
        editor.move(0, 1)
        await editor.save()
        assert.equal(requests.length, 1)
        assert.equal(requests[0].url, `/api/characters/hero/characters/ally${isAdmin ? '' : '/propose'}?anchorMemberIndex=1`)
        assert.equal(requests[0].options.method, isAdmin ? 'PATCH' : 'POST')
        assert.deepEqual(JSON.parse(requests[0].options.body), { timeline: entries.slice().reverse() })
        assert.equal(updated, true)
        app.unmount()
    }
})

test('shows populated timelines to readers and offers editing to DMs', async () => {
    const entries = [{ id: 'one', description: 'Met in town', date: null }]
    const readOnly = await renderTimeline(entries, false)
    assert.match(readOnly, /<h4>Timeline<\/h4>/)
    assert.match(readOnly, /Met in town/)
    assert.doesNotMatch(readOnly, /Edit timeline/)
    assert.match(await renderTimeline(entries, true), /<h4>Timeline<\/h4>\s*<button[^>]*class="inline-edit-button"[^>]*aria-label="Edit timeline"/)
})

test('renders dated and undated entries in timeline order', async () => {
    const entries = [
        { id: 'one', description: 'Met in town', date: '1234-01-02' },
        { id: 'two', description: 'Traveled together', date: null },
    ]
    const html = await renderTimeline(entries, false)
    assert.match(html, /<ol class="relation-timeline-list" role="list">/)
    assert.match(html, /<li><strong>1234-01-02: <\/strong>.*Met in town.*<\/li>.*<li>.*Traveled together.*<\/li>/s)
    assert.doesNotMatch(html, /Undated/)
})
