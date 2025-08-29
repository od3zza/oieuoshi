import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'lib/comentarios/data.json');

export default function handler(req, res) {
  if (req.method === 'GET') {
    const { post } = req.query;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.status(200).json(data.posts[post] || []);
  }

  if (req.method === 'POST') {
    const { post, nome, link, comentario } = req.body;
    if (!post || !nome || !comentario) {
      return res.status(400).json({ error: 'Campos obrigatórios' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!data.posts[post]) {
      data.posts[post] = [];
    }

    data.posts[post].push({
      nome,
      link: link || '',
      comentario,
      data: new Date().toISOString()
    });

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    res.status(200).json({ success: true });
  }
}
