const express = require('express');
const request = require('supertest');

jest.mock('../../data/postsRepository', () => ({
    listPosts: jest.fn(),
    getPostById: jest.fn(),
    createPost: jest.fn(),
    updatePost: jest.fn(),
    deletePost: jest.fn(),
}));

const { listPosts, getPostById, createPost, updatePost, deletePost } = require('../../data/postsRepository');
const postsRouter = require('../postsRouter');

function createApp() {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
        req.auth = {
            userId: req.headers['x-test-user'] || 'dm-admin',
            role: req.headers['x-test-role'] || 'dm',
        };
        next();
    });
    app.use('/api/posts', postsRouter);
    return app;
}

describe('postsRouter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('GET /api/posts allows any authenticated role to list, trimming the extra lookahead row', async () => {
        const app = createApp();
        listPosts.mockResolvedValueOnce([
            { id: 3, title: 'Third', body: 'Text', author_username: 'faerie' },
            { id: 2, title: 'Second', body: 'Text', author_username: 'faerie' },
        ]);

        const response = await request(app)
            .get('/api/posts?limit=1')
            .set('x-test-role', 'viewer');

        expect(response.status).toBe(200);
        expect(listPosts).toHaveBeenCalledWith({ limit: 1, offset: 0 });
        expect(response.body).toEqual({
            posts: [{ id: 3, title: 'Third', body: 'Text', author_username: 'faerie' }],
            hasMore: true,
        });
    });

    it('POST /api/posts creates a post for dm users', async () => {
        const app = createApp();
        createPost.mockResolvedValueOnce({ id: 1, title: 'Hello', body: 'World', author_username: 'faerie' });

        const response = await request(app)
            .post('/api/posts')
            .set('x-test-role', 'dm')
            .send({ title: 'Hello', body: 'World' });

        expect(response.status).toBe(201);
        expect(createPost).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Hello',
            body: 'World',
            userId: 'dm-admin',
        }));
    });

    it('POST /api/posts rejects non-dm users', async () => {
        const app = createApp();

        const response = await request(app)
            .post('/api/posts')
            .set('x-test-role', 'player')
            .send({ title: 'Hello', body: 'World' });

        expect(response.status).toBe(403);
        expect(createPost).not.toHaveBeenCalled();
    });

    it('POST /api/posts rejects missing fields', async () => {
        const app = createApp();

        const response = await request(app)
            .post('/api/posts')
            .set('x-test-role', 'dm')
            .send({ title: '' });

        expect(response.status).toBe(400);
        expect(createPost).not.toHaveBeenCalled();
    });

    it('PATCH /api/posts/:id updates an existing post for dm users', async () => {
        const app = createApp();
        getPostById.mockResolvedValueOnce({ id: 1, title: 'Old', body: 'Old text' });
        updatePost.mockResolvedValueOnce({ id: 1, title: 'New', body: 'New text', author_username: 'faerie' });

        const response = await request(app)
            .patch('/api/posts/1')
            .set('x-test-role', 'dm')
            .send({ title: 'New', body: 'New text' });

        expect(response.status).toBe(200);
        expect(updatePost).toHaveBeenCalledWith('1', expect.objectContaining({ title: 'New', body: 'New text' }));
    });

    it('PATCH /api/posts/:id returns 404 for missing posts', async () => {
        const app = createApp();
        getPostById.mockResolvedValueOnce(null);

        const response = await request(app)
            .patch('/api/posts/999')
            .set('x-test-role', 'dm')
            .send({ title: 'New', body: 'New text' });

        expect(response.status).toBe(404);
        expect(updatePost).not.toHaveBeenCalled();
    });

    it('DELETE /api/posts/:id removes a post for dm users', async () => {
        const app = createApp();
        getPostById.mockResolvedValueOnce({ id: 1 });

        const response = await request(app)
            .delete('/api/posts/1')
            .set('x-test-role', 'dm');

        expect(response.status).toBe(204);
        expect(deletePost).toHaveBeenCalledWith('1');
    });

    it('DELETE /api/posts/:id rejects non-dm users', async () => {
        const app = createApp();

        const response = await request(app)
            .delete('/api/posts/1')
            .set('x-test-role', 'player');

        expect(response.status).toBe(403);
        expect(deletePost).not.toHaveBeenCalled();
    });
});
