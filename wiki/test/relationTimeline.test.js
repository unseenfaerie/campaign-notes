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

test('players submit reordered timelines as proposals while DMs save directly', async () => {
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

test('existing entries start compact with edit controls for descriptions and dates', async () => {
    const component = {
        ...RelationTimeline,
        setup(props, context) {
            const state = RelationTimeline.setup(props, context)
            state.startEditing()
            return state
        },
    }
    const html = await renderToString(createSSRApp({
        render: () => h(component, {
            entityRoute: 'characters', entityId: 'hero', relatedRoute: 'places', relatedId: 'town',
            timeline: [
                { id: 'one', description: 'First', date: '1234-01-02' },
                { id: 'two', description: 'Second', date: null },
            ],
            editable: true, isAdmin: true, dateSystem: null,
        }),
    }))
    assert.match(html, /First/)
    assert.match(html, /1234-01-02/)
    assert.match(html, /aria-label="Edit description for entry 1"/)
    assert.match(html, /aria-label="Edit date for entry 1"/)
    assert.match(html, /Add Date/)
    assert.match(html, /aria-label="Reorder entry 1: First"/)
    assert.doesNotMatch(html, /<textarea|class="lore-date-group"/)
})

test('places the timeline date save and delete actions inside the picker', async () => {
    const component = {
        ...RelationTimeline,
        setup(props, context) {
            const state = RelationTimeline.setup(props, context)
            state.startEditing()
            state.editDate('one')
            return state
        },
    }
    const html = await renderToString(createSSRApp({
        render: () => h(component, {
            entityRoute: 'characters', entityId: 'hero', relatedRoute: 'places', relatedId: 'town',
            timeline: [{ id: 'one', description: 'First', date: null }],
            editable: true, isAdmin: true, dateSystem: null,
        }),
    }))
    assert.match(html, /class="[^"]*lore-date-single-line[^"]*"[\s\S]*class="lore-date-action" disabled>Save<\/button>[\s\S]*class="lore-date-action"[^>]*>Delete<\/button>[\s\S]*<\/fieldset>/)
})

test('new entries open their descriptions and removal clears editing state', async () => {
    const app = renderer.createApp({ ...RelationTimeline, render: () => null }, {
        entityRoute: 'characters', entityId: 'hero', relatedRoute: 'places', relatedId: 'town',
        timeline: [], editable: true, isAdmin: true, dateSystem: null,
    })
    app.provide(ssrContextKey, { modules: new Set() })
    const editor = app.mount({ children: [] }).$.setupState
    editor.startEditing()
    const id = editor.draft[0].id
    assert.equal(editor.openDescriptions.has(id), true)
    editor.editDate(id)
    editor.removeEntry(0)
    assert.equal(editor.openDescriptions.has(id), false)
    assert.equal(editor.openDates.has(id), false)
    assert.equal(editor.incompleteDates.has(id), false)
    await nextTick()
    app.unmount()
})

test('prevents saving an incomplete date until it is completed or cleared', async () => {
    const app = renderer.createApp({ ...RelationTimeline, render: () => null }, {
        entityRoute: 'characters', entityId: 'hero', relatedRoute: 'places', relatedId: 'town',
        timeline: [{ id: 'one', description: 'First', date: null }],
        editable: true, isAdmin: true, dateSystem: null,
    })
    app.provide(ssrContextKey, { modules: new Set() })
    const editor = app.mount({ children: [] }).$.setupState
    editor.startEditing()
    editor.editDate('one')
    await editor.save()
    assert.equal(editor.error, 'Complete or clear each open date before saving.')
    editor.updateDateValidity('one', true)
    assert.equal(editor.incompleteDates.has('one'), false)
    editor.updateDateValidity('one', false)
    editor.updateDate(editor.draft[0], '')
    assert.equal(editor.incompleteDates.has('one'), false)
    assert.equal(editor.openDates.has('one'), false)
    app.unmount()
})

test('dragging reorders entries and canceling or dropping outside leaves them unchanged', async () => {
    const entries = [
        { id: 'one', description: 'First', date: null },
        { id: 'two', description: 'Second', date: '1234-01-02' },
        { id: 'three', description: 'Third', date: null },
    ]
    const app = renderer.createApp({ ...RelationTimeline, render: () => null }, {
        entityRoute: 'characters', entityId: 'hero', relatedRoute: 'places', relatedId: 'town',
        timeline: entries, editable: true, isAdmin: true, dateSystem: null,
    })
    app.provide(ssrContextKey, { modules: new Set() })
    const editor = app.mount({ children: [] }).$.setupState
    editor.startEditing()
    assert.deepEqual([...editor.openDates], [])
    editor.openDates.add('one')
    editor.updateDate(editor.draft[0], '')
    assert.equal(editor.openDates.has('one'), false)

    const target = { dataset: { entryId: 'three' } }
    editor.editorFields = { contains: element => element === target, querySelectorAll: () => [] }
    const originalDocument = globalThis.document
    const originalWindow = globalThis.window
    globalThis.document = { elementFromPoint: () => ({ closest: () => target }) }
    globalThis.window = { innerHeight: 600 }
    const event = {
        isPrimary: true, button: 0, pointerId: 1, clientX: 0, clientY: 0,
        currentTarget: { setPointerCapture: () => {} },
    }
    try {
        editor.startDrag(event, 'one')
        editor.endDrag({ ...event, clientY: 120 })
        assert.deepEqual(editor.draft.map(entry => entry.id), ['two', 'three', 'one'])
        assert.equal(editor.reorderMessage, 'Entry moved to position 3 of 3.')

        editor.startDrag(event, 'two')
        editor.cancelDrag(event)
        editor.endDrag({ ...event, clientY: 120 })
        assert.deepEqual(editor.draft.map(entry => entry.id), ['two', 'three', 'one'])

        globalThis.document.elementFromPoint = () => null
        editor.startDrag(event, 'two')
        editor.endDrag({ ...event, clientY: 120 })
        assert.deepEqual(editor.draft.map(entry => entry.id), ['two', 'three', 'one'])

        let focused = false
        await editor.moveWithKeyboard({ currentTarget: { focus: () => { focused = true } } }, 2, -1)
        assert.deepEqual(editor.draft.map(entry => entry.id), ['two', 'one', 'three'])
        assert.equal(focused, true)
    } finally {
        globalThis.document = originalDocument
        globalThis.window = originalWindow
        app.unmount()
    }
})
