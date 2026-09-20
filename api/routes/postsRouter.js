const express = require('express');
const { requireDmForMutations } = require('../middleware/authMiddleware');
const { listPosts, getPostById, createPost, updatePost, deletePost } = require('../data/postsRepository');

const router = express.Router();

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

router.use(requireDmForMutations);

function parsePaginationParams(query) {
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
    const offset = Math.max(0, parseInt(query.offset, 10) || 0);
    return { limit, offset };
}

function validatePostBody(body) {
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const text = typeof body?.body === 'string' ? body.body.trim() : '';

    if (!title || !text) {
        return { error: 'title and body are required' };
    }

    return { title, body: text };
}

router.get('/', async (req, res) => {
    try {
        const { limit, offset } = parsePaginationParams(req.query);
        const rows = await listPosts({ limit, offset });
        const hasMore = rows.length > limit;
        res.json({ posts: rows.slice(0, limit), hasMore });
    } catch (error) {
        res.status(500).json({ error: error.message || 'Could not load posts.' });
    }
});

router.post('/', async (req, res) => {
    const parsed = validatePostBody(req.body);
    if (parsed.error) {
        return res.status(400).json({ error: parsed.error });
    }

    try {
        const post = await createPost({
            title: parsed.title,
            body: parsed.body,
            userId: req.auth.userId,
            nowIso: new Date().toISOString(),
        });
        res.status(201).json(post);
    } catch (error) {
        res.status(500).json({ error: error.message || 'Could not create post.' });
    }
});

router.patch('/:id', async (req, res) => {
    const parsed = validatePostBody(req.body);
    if (parsed.error) {
        return res.status(400).json({ error: parsed.error });
    }

    try {
        const existing = await getPostById(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const post = await updatePost(req.params.id, {
            title: parsed.title,
            body: parsed.body,
            userId: req.auth.userId,
            nowIso: new Date().toISOString(),
        });
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: error.message || 'Could not update post.' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const existing = await getPostById(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Post not found' });
        }

        await deletePost(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message || 'Could not delete post.' });
    }
});

module.exports = router;
