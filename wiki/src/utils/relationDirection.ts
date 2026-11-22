export function directionOptions(anchorMemberIndex: number) {
    const outward = anchorMemberIndex === 0 ? 'first_to_second' : 'second_to_first'
    const inward = anchorMemberIndex === 0 ? 'second_to_first' : 'first_to_second'
    return [
        { value: outward, label: 'This entity to related entity' },
        { value: inward, label: 'Related entity to this entity' },
        { value: 'both', label: 'Both directions' },
    ]
}

export function directionLabel(value: unknown, anchorMemberIndex: number): string {
    return directionOptions(anchorMemberIndex).find(option => option.value === value)?.label ?? 'Unknown direction'
}
