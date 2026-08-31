import type { MentionTarget } from '../services/mentionService'

export type TextFragment = {
    text: string
    target?: MentionTarget
    bold?: boolean
    italic?: boolean
}

type Candidate = {
    text: string
    normalized: string
    target?: MentionTarget
}

type FormattedTextSegment = {
    text: string
    bold?: boolean
    italic?: boolean
}

function normalize(value: string): string {
    return value.trim().toLocaleLowerCase()
}

function isBoundaryCharacter(value: string | undefined): boolean {
    return value === undefined || !/[\p{L}\p{N}_]/u.test(value)
}

function findClosingMarker(text: string, marker: '*' | '/', startIndex: number): number {
    for (let index = startIndex; index < text.length; index += 1) {
        if (text[index] === '\n') {
            return -1
        }

        if (text[index] === marker && isBoundaryCharacter(text[index + 1])) {
            return index
        }
    }

    return -1
}

function formatText(
    text: string,
    formatting: Pick<FormattedTextSegment, 'bold' | 'italic'> = {}
): FormattedTextSegment[] {
    const segments: FormattedTextSegment[] = []
    let plainTextStart = 0
    let index = 0

    while (index < text.length) {
        const marker = text[index]
        if (
            (marker !== '*' && marker !== '/') ||
            !isBoundaryCharacter(text[index - 1])
        ) {
            index += 1
            continue
        }

        const closingIndex = findClosingMarker(text, marker, index + 1)
        if (closingIndex === -1 || closingIndex === index + 1) {
            index += 1
            continue
        }

        if (plainTextStart < index) {
            segments.push({ text: text.slice(plainTextStart, index), ...formatting })
        }

        segments.push(
            ...formatText(text.slice(index + 1, closingIndex), {
                ...formatting,
                ...(marker === '*' ? { bold: true } : { italic: true }),
            })
        )
        index = closingIndex + 1
        plainTextStart = index
    }

    if (plainTextStart < text.length) {
        segments.push({ text: text.slice(plainTextStart), ...formatting })
    }

    return segments.length > 0 ? segments : [{ text, ...formatting }]
}

function linkifyPlainText(text: string, targets: MentionTarget[]): TextFragment[] {
    if (!text || targets.length === 0) {
        return [{ text }]
    }

    const candidatesByText = new Map<string, Candidate[]>()
    for (const target of targets) {
        for (const candidateText of [target.name, ...target.aliases]) {
            const normalized = normalize(candidateText)
            if (!normalized) {
                continue
            }

            const candidates = candidatesByText.get(normalized) || []
            if (!candidates.some((candidate) => candidate.target?.route === target.route && candidate.target.id === target.id)) {
                candidates.push({ text: candidateText.trim(), normalized, target })
            }
            candidatesByText.set(normalized, candidates)
        }
    }

    const candidates = [...candidatesByText.entries()]
        .map(([normalized, matchingCandidates]) => ({
            text: matchingCandidates[0].text,
            normalized,
            target: matchingCandidates.length === 1 ? matchingCandidates[0].target : undefined,
        }))
        .sort((left, right) => right.text.length - left.text.length)

    const fragments: TextFragment[] = []
    let cursor = 0
    let index = 0

    while (index < text.length) {
        const candidate = candidates.find((entry) => {
            if (normalize(text.slice(index, index + entry.text.length)) !== entry.normalized) {
                return false
            }

            return isBoundaryCharacter(text[index - 1]) && isBoundaryCharacter(text[index + entry.text.length])
        })

        if (!candidate) {
            index += 1
            continue
        }

        if (index > cursor) {
            fragments.push({ text: text.slice(cursor, index) })
        }
        fragments.push({ text: text.slice(index, index + candidate.text.length), target: candidate.target })
        index += candidate.text.length
        cursor = index
    }

    if (cursor < text.length) {
        fragments.push({ text: text.slice(cursor) })
    }

    return fragments.length > 0 ? fragments : [{ text }]
}

export function linkifyText(text: string, targets: MentionTarget[]): TextFragment[] {
    return formatText(text).flatMap((segment) =>
        linkifyPlainText(segment.text, targets).map((fragment) => ({
            ...fragment,
            bold: segment.bold,
            italic: segment.italic,
        }))
    )
}
