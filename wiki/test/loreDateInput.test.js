import { strict as assert } from 'node:assert'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createServer } from 'vite'

let server
let LoreDateInput

before(async () => {
    server = await createServer({
        root: fileURLToPath(new URL('..', import.meta.url)),
        cacheDir: 'node_modules/.vite-lore-date-test',
        server: { middlewareMode: true, hmr: false },
        appType: 'custom',
    })
    LoreDateInput = (await server.ssrLoadModule('/src/components/LoreDateInput.vue')).default
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
        assert.match(html, new RegExp(`<label[^>]*>${label}</label>`))
    }
    assert.match(html, /Clear date[\s\S]*<\/fieldset>/)
})

test('keeps an unset optional date within its named group', async () => {
    const html = await renderToString(createSSRApp({
        render: () => h(LoreDateInput, { label: 'Birthday', modelValue: '' }),
    }))

    assert.match(html, /<fieldset[^>]*>[\s\S]*<legend[^>]*>\s*Birthday[\s\S]*Set date[\s\S]*<\/fieldset>/)
})
