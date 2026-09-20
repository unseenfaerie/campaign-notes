const { run, get, all } = require('./sqliteAsync');

const SELECT_WITH_AUTHOR = `
    SELECT posts.*, users.username AS author_username
    FROM posts
    JOIN users ON users.id = posts.created_by
`;

async function listPosts({ limit, offset }) {
    // Fetch one extra row so the caller can detect hasMore without a separate COUNT query.
    return all(
        `${SELECT_WITH_AUTHOR} ORDER BY posts.created_at DESC, posts.id DESC LIMIT ? OFFSET ?`,
        [limit + 1, offset]
    );
}

async function getPostById(id) {
    return get(`${SELECT_WITH_AUTHOR} WHERE posts.id = ?`, [id]);
}

async function createPost({ title, body, userId, nowIso }) {
    const result = await run(
        `INSERT INTO posts (title, body, created_by, created_at) VALUES (?, ?, ?, ?)`,
        [title, body, userId, nowIso]
    );
    return getPostById(result.lastID);
}

async function updatePost(id, { title, body, userId, nowIso }) {
    await run(
        `UPDATE posts SET title = ?, body = ?, last_edited_by = ?, last_edited_at = ? WHERE id = ?`,
        [title, body, userId, nowIso, id]
    );
    return getPostById(id);
}

async function deletePost(id) {
    const result = await run('DELETE FROM posts WHERE id = ?', [id]);
    return result.changes > 0;
}

module.exports = {
    listPosts,
    getPostById,
    createPost,
    updatePost,
    deletePost,
};
