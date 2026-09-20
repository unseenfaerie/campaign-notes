import { requestJson } from './apiClient'

export type Post = {
    id: number
    title: string
    body: string
    author_username: string
    created_at: string
    last_edited_at: string | null
}

export type PostsPage = {
    posts: Post[]
    hasMore: boolean
}

export async function listPosts(limit: number, offset: number): Promise<PostsPage> {
    return requestJson<PostsPage>(`/posts?limit=${limit}&offset=${offset}`)
}

export async function createPost(title: string, body: string): Promise<Post> {
    return requestJson<Post>('/posts', { method: 'POST', body: { title, body } })
}

export async function updatePost(id: number, title: string, body: string): Promise<Post> {
    return requestJson<Post>(`/posts/${id}`, { method: 'PATCH', body: { title, body } })
}

export async function deletePost(id: number): Promise<void> {
    await requestJson<void>(`/posts/${id}`, { method: 'DELETE' })
}
