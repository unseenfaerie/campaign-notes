const express = require('express');
const { all } = require('../data/sqliteAsync');

const router = express.Router();

function parseVisibilityPolicy(policy) {
  return String(policy || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function canViewPolicy(policy, auth) {
  const rules = parseVisibilityPolicy(policy);

  if (rules.includes('public')) {
    return true;
  }

  if (!auth) {
    return false;
  }

  const role = auth.role;
  const userId = auth.userId;

  for (const rule of rules) {
    if (rule === 'viewer' && (role === 'viewer' || role === 'player' || role === 'dm')) {
      return true;
    }
    if (rule === 'player' && (role === 'player' || role === 'dm')) {
      return true;
    }
    if (rule === 'dm' && role === 'dm') {
      return true;
    }
    if (rule === `role:${role}`) {
      return true;
    }
    if (rule === `user:${userId}`) {
      return true;
    }
  }

  return false;
}

function parseSliceContent(contentJson) {
  try {
    return JSON.parse(contentJson);
  } catch (_err) {
    return contentJson;
  }
}

router.get('/pages/:slug', async (req, res) => {
  try {
    const rows = await all(
      `SELECT id, page_slug, section_key, content_json, visibility_policy
       FROM wiki_content_slices
       WHERE page_slug = ?
       ORDER BY section_key`,
      [req.params.slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const sections = rows
      .filter((row) => canViewPolicy(row.visibility_policy, req.auth))
      .map((row) => ({
        key: row.section_key,
        content: parseSliceContent(row.content_json),
      }));

    return res.json({
      slug: req.params.slug,
      sections,
    });
  } catch (_err) {
    return res.status(500).json({ error: 'Failed to load wiki page' });
  }
});

module.exports = router;