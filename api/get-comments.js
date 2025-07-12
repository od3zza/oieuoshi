import { pool } from '../lib/db.js';

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  try {
    const { rows } = await pool.query(
      'SELECT name, content, created_at FROM comments WHERE post_slug = $1 ORDER BY created_at DESC',
      [slug]
    );
    res.status(200).json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
}
