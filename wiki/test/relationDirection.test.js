import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { splitRelatedSections } from '../src/utils/relationDirection.ts'

test('separates incoming relations while keeping outgoing and bidirectional ones together', () => {
    const records = [
        { id: 'out', relationship: { visibility_direction: 'first_to_second', relationAnchorIndex: 0 } },
        { id: 'in', relationship: { visibility_direction: 'first_to_second', relationAnchorIndex: 1 } },
        { id: 'reverse-out', relationship: { visibility_direction: 'second_to_first', relationAnchorIndex: 1 } },
        { id: 'both', relationship: { visibility_direction: 'both', relationAnchorIndex: 1 } },
    ]

    const sections = splitRelatedSections({ places: records }, true)
    assert.deepEqual(sections.outgoing[0][1].map(record => record.id), ['out', 'reverse-out', 'both'])
    assert.deepEqual(sections.incoming[0][1].map(record => record.id), ['in'])
})

test('splits mixed history entries without losing their selectors or mutating the response', () => {
    const outbound = { date: 'first', visibility_direction: 'first_to_second', relationAnchorIndex: 0 }
    const inbound = { date: 'second', visibility_direction: 'first_to_second', relationAnchorIndex: 1 }
    const both = { date: 'third', visibility_direction: 'both', relationAnchorIndex: 1 }
    const record = { id: 'other', history: [outbound, inbound, both] }

    const sections = splitRelatedSections({ characters: [record] }, true)
    assert.deepEqual(sections.outgoing[0][1][0].history, [outbound, both])
    assert.deepEqual(sections.incoming[0][1][0].history, [inbound])
    assert.deepEqual(record.history, [outbound, inbound, both])
})

test('leaves player results and locked DM-preview stubs in the outgoing section', () => {
    const locked = { id: 'locked', name: 'Locked', locked: true }
    const outgoing = { id: 'visible', relationship: { visibility_direction: 'both', relationAnchorIndex: 0 } }
    const related = { places: [locked, outgoing] }

    assert.deepEqual(splitRelatedSections(related, false), { outgoing: [['places', related.places]], incoming: [] })
    assert.deepEqual(splitRelatedSections(related, true), { outgoing: [['places', related.places]], incoming: [] })
})

test('rejects malformed direction metadata instead of misclassifying it', () => {
    assert.throws(() => splitRelatedSections({
        places: [{ id: 'bad', relationship: { visibility_direction: 'unknown', relationAnchorIndex: 0 } }],
    }, true), /Invalid relation visibility/)
})
