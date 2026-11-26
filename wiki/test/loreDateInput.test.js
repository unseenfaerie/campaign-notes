import { strict as assert } from 'node:assert'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createRenderer, createSSRApp, h, nextTick, ssrContextKey } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createServer } from 'vite'

let server
let LoreDateInput
let SearchableSelect

before(async () => {
    server = await createServer({
        root: fileURLToPath(new URL('..', import.meta.url)),
        cacheDir: 'node_modules/.vite-lore-date-test',
        server: { middlewareMode: true, hmr: false },
        appType: 'custom',
    })
    LoreDateInput = (await server.ssrLoadModule('/src/components/LoreDateInput.vue')).default
    SearchableSelect = (await server.ssrLoadModule('/src/components/SearchableSelect.vue')).default
})

after(async () => {
    await server?.close()
})

test('groups date inputs under their field name', async () => {
    const html = await renderToString(createSSRApp({
        render: () => h(LoreDateInput, { label: 'Birthday', modelValue: 'existing' }),
    }))

    assert.match(html, /<fieldset[^>]*>[\s\S]*<legend[^>]*>\s*Birthday/)
    for (const label of ['Age', 'Calendar', 'Year', 'Month', 'Day']) {
        assert.match(html, new RegExp(`<label[^>]*class="lore-date-visually-hidden"[^>]*>${label}</label>`))
        assert.match(html, new RegExp(`placeholder="${label}"`))
    }
    assert.match(html, /Delete[\s\S]*<\/fieldset>/)
})

test('keeps an unset optional date within its named group', async () => {
    const html = await renderToString(createSSRApp({
        render: () => h(LoreDateInput, { label: 'Birthday', modelValue: '' }),
    }))

    assert.match(html, /<fieldset[^>]*>[\s\S]*<legend[^>]*>\s*Birthday[\s\S]*Set date[\s\S]*<\/fieldset>/)
})

test('can open an unset optional date directly', async () => {
    const html = await renderToString(createSSRApp({
        render: () => h(LoreDateInput, { label: 'Date', modelValue: '', initiallyOpen: true }, {
            actions: () => h('button', { type: 'button', class: 'lore-date-action' }, 'Save'),
        }),
    }))

    assert.match(html, /<label[^>]*>Age<\/label>/)
    assert.match(html, /placeholder="Day"[^>]*>[\s\S]*>Save<\/button>[\s\S]*>Delete<\/button>/)
    assert.match(html, /placeholder="Year"[^>]*required/)
    assert.match(html, /placeholder="Day"[^>]*required/)
    assert.doesNotMatch(html, /Set date/)
})

test('reports incomplete and invalid dates without emitting them as values', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => Response.json({
        dateSystem: {
            daysPerYear: 365,
            eras: [{ id: 'age', order: 1, name: 'First Age', abbreviation: 'FA', durationYears: null }],
            calendars: [{ id: 'cal', eraId: 'age', name: 'Calendar', months: [{ name: 'Spring', days: 30 }] }],
        },
    })

    const renderer = createRenderer({
        createComment: () => ({}),
        insert: () => {},
        remove: () => {},
        parentNode: () => null,
        nextSibling: () => null,
    })
    const validity = []
    const values = []
    const app = renderer.createApp({ ...LoreDateInput, render: () => null }, {
        label: 'Date', modelValue: '', initiallyOpen: true,
        onValidityChange: valid => validity.push(valid),
        'onUpdate:modelValue': value => values.push(value),
    })
    app.provide(ssrContextKey, { modules: new Set() })
    try {
        const editor = app.mount({}).$.setupState
        await new Promise(resolve => setImmediate(resolve))
        assert.equal(validity.at(-1), false)
        editor.eraId = 'age'
        await nextTick()
        editor.monthIndex = 0
        await nextTick()
        assert.equal(validity.at(-1), false)
        assert.equal(values.length, 0)
        editor.year = 1
        editor.day = 1
        await nextTick()
        assert.equal(validity.at(-1), true)
        assert.equal(values.at(-1), '0100001001_cal')
        const count = values.length
        editor.year = 0
        await nextTick()
        assert.equal(validity.at(-1), false)
        assert.equal(values.length, count)
        editor.year = 100000
        await nextTick()
        assert.equal(validity.at(-1), false)
        assert.equal(values.length, count)
        editor.year = 1
        editor.day = ''
        await nextTick()
        assert.equal(validity.at(-1), false)
        assert.equal(values.length, count)
    } finally {
        app.unmount()
        globalThis.fetch = originalFetch
    }
})

test('reopening a date dropdown shows all options while typing still filters them', async () => {
    const originalDocument = globalThis.document
    globalThis.document = { addEventListener() {}, removeEventListener() {} }
    const renderer = createRenderer({
        createComment: () => ({}),
        insert: () => {},
        remove: () => {},
        parentNode: () => null,
        nextSibling: () => null,
    })
    const options = [{ value: 'one', label: 'First' }, { value: 'two', label: 'Second' }]
    const app = renderer.createApp({ ...SearchableSelect, render: () => null }, {
        modelValue: 'one', options, openOnClick: true,
    })
    app.provide(ssrContextKey, { modules: new Set() })
    try {
        const select = app.mount({}).$.setupState
        select.openOptions()
        assert.deepEqual(select.filteredOptions, options)
        select.searchText = 'Sec'
        select.searchOptions()
        assert.deepEqual(select.filteredOptions, [options[1]])
        select.selectOption(options[1])
        assert.equal(select.isOpen, false)
        select.openOptions()
        assert.deepEqual(select.filteredOptions, options)
    } finally {
        app.unmount()
        globalThis.document = originalDocument
    }
})
