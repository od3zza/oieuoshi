import { pool } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, content, slug } = req.body;

  if (!name || !content || !slug)
    return res.status(400).json({ error: 'Missing fields' });

  try {
    await pool.query(
      'INSERT INTO comments (name, content, post_slug) VALUES ($1, $2, $3)',
      [name, content, slug]
    );
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
}
