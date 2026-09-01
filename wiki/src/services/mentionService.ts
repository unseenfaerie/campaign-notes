import { requestJson } from './apiClient'

export type MentionTarget = {
    route: string
    id: string
    name: string
    aliases: string[]
}

let mentionTargetsPromise: Promise<MentionTarget[]> | null = null

export function getMentionTargets(): Promise<MentionTarget[]> {
    if (!mentionTargetsPromise) {
        mentionTargetsPromise = requestJson<MentionTarget[]>('/mentions')
    }

    return mentionTargetsPromise
}

export function refreshMentionTargets(): void {
    mentionTargetsPromise = null
}
