<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import LinkifiedText from '../components/LinkifiedText.vue'
import { ApiError } from '../services/apiClient'
import { createPost, deletePost, listPosts, updatePost, type Post } from '../services/postsService'
import { formatDateTime } from '../utils/formatting'
import { useAuthStore } from '../stores/auth'

const PAGE_SIZE = 10

const auth = useAuthStore()

const loading = ref(true)
const loadingMore = ref(false)
const errorMessage = ref('')
const posts = ref<Post[]>([])
const hasMore = ref(false)

const showNewPostForm = ref(false)
const newPostTitle = ref('')
const newPostBody = ref('')
const newPostSaving = ref(false)
const newPostError = ref('')

const editingPostId = ref<number | null>(null)
const editTitle = ref('')
const editBody = ref('')
const editSaving = ref(false)
const editError = ref('')

const deleteModalOpen = ref(false)
const deleteModalBusy = ref(false)
const deleteModalError = ref('')
const pendingDeleteId = ref<number | null>(null)

async function loadFirstPage() {
  loading.value = true
  errorMessage.value = ''

  try {
    const page = await listPosts(PAGE_SIZE, 0)
    posts.value = page.posts
    hasMore.value = page.hasMore
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Could not load posts.'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  loadingMore.value = true

  try {
    const page = await listPosts(PAGE_SIZE, posts.value.length)
    posts.value = [...posts.value, ...page.posts]
    hasMore.value = page.hasMore
  } catch (error) {
    errorMessage.value = error instanceof ApiError ? error.message : 'Could not load more posts.'
  } finally {
    loadingMore.value = false
  }
}

async function submitNewPost() {
  newPostError.value = ''

  if (!newPostTitle.value.trim() || !newPostBody.value.trim()) {
    newPostError.value = 'Title and body are required.'
    return
  }

  newPostSaving.value = true
  try {
    const post = await createPost(newPostTitle.value.trim(), newPostBody.value.trim())
    posts.value = [post, ...posts.value]
    newPostTitle.value = ''
    newPostBody.value = ''
    showNewPostForm.value = false
  } catch (error) {
    newPostError.value = error instanceof ApiError ? error.message : 'Could not create post.'
  } finally {
    newPostSaving.value = false
  }
}

function startEditPost(post: Post) {
  editingPostId.value = post.id
  editTitle.value = post.title
  editBody.value = post.body
  editError.value = ''
}

function cancelEditPost() {
  editingPostId.value = null
}

async function saveEditPost() {
  if (editingPostId.value === null) {
    return
  }

  editError.value = ''
  if (!editTitle.value.trim() || !editBody.value.trim()) {
    editError.value = 'Title and body are required.'
    return
  }

  editSaving.value = true
  try {
    const updated = await updatePost(editingPostId.value, editTitle.value.trim(), editBody.value.trim())
    posts.value = posts.value.map((post) => (post.id === updated.id ? updated : post))
    editingPostId.value = null
  } catch (error) {
    editError.value = error instanceof ApiError ? error.message : 'Could not update post.'
  } finally {
    editSaving.value = false
  }
}

function openDeleteConfirm(postId: number) {
  pendingDeleteId.value = postId
  deleteModalError.value = ''
  deleteModalOpen.value = true
}

function cancelDeleteConfirm() {
  deleteModalOpen.value = false
  pendingDeleteId.value = null
}

async function confirmDeleteConfirm() {
  if (pendingDeleteId.value === null) {
    return
  }

  deleteModalBusy.value = true
  deleteModalError.value = ''
  try {
    await deletePost(pendingDeleteId.value)
    posts.value = posts.value.filter((post) => post.id !== pendingDeleteId.value)
    deleteModalOpen.value = false
    pendingDeleteId.value = null
  } catch (error) {
    deleteModalError.value = error instanceof ApiError ? error.message : 'Could not delete post.'
  } finally {
    deleteModalBusy.value = false
  }
}

onMounted(loadFirstPage)
</script>

<template>
  <section>
    <div class="list-header">
      <h2>Home</h2>
      <button
        v-if="auth.isAdmin.value && !showNewPostForm"
        type="button"
        class="create-button"
        @click="showNewPostForm = true"
      >
        New Post
      </button>
    </div>

    <form v-if="showNewPostForm" class="entity-form" @submit.prevent="submitNewPost">
      <div class="form-row">
        <label for="new-post-title">Title</label>
        <input id="new-post-title" v-model="newPostTitle" type="text" required />
      </div>
      <div class="form-row">
        <label for="new-post-body">Text</label>
        <textarea id="new-post-body" v-model="newPostBody" rows="5" required></textarea>
      </div>

      <p v-if="newPostError" class="status-card error">{{ newPostError }}</p>

      <div class="form-actions">
        <button type="submit" class="primary-button" :disabled="newPostSaving">
          {{ newPostSaving ? 'Posting...' : 'Post' }}
        </button>
        <button type="button" class="secondary-button" :disabled="newPostSaving" @click="showNewPostForm = false">
          Cancel
        </button>
      </div>
    </form>

    <p v-if="loading" class="status-card">Loading posts...</p>
    <p v-else-if="errorMessage" class="status-card error">{{ errorMessage }}</p>
    <p v-else-if="posts.length === 0" class="status-card">No posts yet.</p>

    <div v-else class="grid-list">
      <article v-for="post in posts" :key="post.id" class="entity-card">
        <template v-if="editingPostId === post.id">
          <form class="entity-form" @submit.prevent="saveEditPost">
            <div class="form-row">
              <label :for="`edit-post-title-${post.id}`">Title</label>
              <input :id="`edit-post-title-${post.id}`" v-model="editTitle" type="text" required />
            </div>
            <div class="form-row">
              <label :for="`edit-post-body-${post.id}`">Text</label>
              <textarea :id="`edit-post-body-${post.id}`" v-model="editBody" rows="5" required></textarea>
            </div>

            <p v-if="editError" class="status-card error">{{ editError }}</p>

            <div class="form-actions">
              <button type="submit" class="primary-button" :disabled="editSaving">
                {{ editSaving ? 'Saving...' : 'Save' }}
              </button>
              <button type="button" class="secondary-button" :disabled="editSaving" @click="cancelEditPost">
                Cancel
              </button>
            </div>
          </form>
        </template>
        <template v-else>
          <div class="section-heading-row">
            <h3>{{ post.title }}</h3>
            <div v-if="auth.isAdmin.value" class="row-actions-end">
              <button type="button" class="secondary-button" @click="startEditPost(post)">Edit</button>
              <button type="button" class="danger-button" @click="openDeleteConfirm(post.id)">Delete</button>
            </div>
          </div>
          <p class="post-meta">{{ formatDateTime(post.created_at) }} &middot; by {{ post.author_username }}</p>
          <p class="post-body"><LinkifiedText :text="post.body" /></p>
        </template>
      </article>
    </div>

    <button v-if="hasMore" type="button" class="secondary-button" :disabled="loadingMore" @click="loadMore">
      {{ loadingMore ? 'Loading...' : 'Load more' }}
    </button>

    <ConfirmModal
      :open="deleteModalOpen"
      title="Delete post"
      message="Are you sure you want to delete this post? This cannot be undone."
      :busy="deleteModalBusy"
      :error-message="deleteModalError"
      @confirm="confirmDeleteConfirm"
      @cancel="cancelDeleteConfirm"
    />
  </section>
</template>
