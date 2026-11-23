import type { DomainEntity } from '../services/domainService'

export function directionOptions(anchorMemberIndex: number) {
    const outward = anchorMemberIndex === 0 ? 'first_to_second' : 'second_to_first'
    const inward = anchorMemberIndex === 0 ? 'second_to_first' : 'first_to_second'
    return [
        { value: outward, label: 'Outgoing' },
        { value: inward, label: 'Incoming' },
        { value: 'both', label: 'Bidirectional' },
    ]
}

export function directionLabel(value: unknown, anchorMemberIndex: number): string {
    return directionOptions(anchorMemberIndex).find(option => option.value === value)?.label ?? 'Unknown direction'
}

type RelatedSections = Array<[string, DomainEntity[]]>

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isIncoming(payload: DomainEntity): boolean {
    const { visibility_direction: direction, relationAnchorIndex: anchor } = payload
    if ((anchor !== 0 && anchor !== 1) ||
        (direction !== 'first_to_second' && direction !== 'second_to_first' && direction !== 'both')) {
        throw new Error('Invalid relation visibility direction or member orientation')
    }
    return direction !== 'both' &&
        direction !== (anchor === 0 ? 'first_to_second' : 'second_to_first')
}

export function splitRelatedSections(
    related: Record<string, DomainEntity[]>,
    isDm: boolean,
): { outgoing: RelatedSections; incoming: RelatedSections } {
    const outgoing: RelatedSections = []
    const incoming: RelatedSections = []

    for (const [route, records] of Object.entries(related).sort(([left], [right]) => left.localeCompare(right))) {
        const outwardRecords: DomainEntity[] = []
        const inwardRecords: DomainEntity[] = []

        for (const record of records) {
            if (!isDm || record.locked) {
                outwardRecords.push(record)
            } else if (Array.isArray(record.history)) {
                const outwardHistory: DomainEntity[] = []
                const inwardHistory: DomainEntity[] = []
                if (!record.history.length) throw new Error('Empty relation history')
                for (const entry of record.history) {
                    if (!isRecord(entry)) {
                        throw new Error('Invalid relation history entry')
                    }
                    const target = isIncoming(entry) ? inwardHistory : outwardHistory
                    target.push(entry)
                }
                if (outwardHistory.length) outwardRecords.push({ ...record, history: outwardHistory })
                if (inwardHistory.length) inwardRecords.push({ ...record, history: inwardHistory })
            } else {
                const payload = record.relationship
                if (!isRecord(payload)) {
                    throw new Error('Missing relation visibility information')
                }
                const target = isIncoming(payload) ? inwardRecords : outwardRecords
                target.push(record)
            }
        }

        if (outwardRecords.length) outgoing.push([route, outwardRecords])
        if (inwardRecords.length) incoming.push([route, inwardRecords])
    }
    return { outgoing, incoming }
}
