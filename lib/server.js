const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔒 SUA conexão com o banco do Neon
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_3n0cpjaJDxVT@ep-tight-band-acwhi1xc-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', // Substitua com sua string
  ssl: { rejectUnauthorized: false }
});

// 📝 Rota para salvar um novo comentário
app.post('/comentarios', async (req, res) => {
  const { nome, mensagem, postagem } = req.body;
  if (!nome || !mensagem || !postagem) {
    return res.status(400).send('Dados incompletos');
  }

  try {
    await pool.query(
      'INSERT INTO comentarios (nome, mensagem, postagem) VALUES ($1, $2, $3)',
      [nome, mensagem, postagem]
    );
    res.status(200).send('Comentário salvo!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao salvar comentário');
  }
});

// 📄 Rota para listar comentários de uma postagem
app.get('/comentarios/:postagem', async (req, res) => {
  const { postagem } = req.params;
  try {
    const result = await pool.query(
      'SELECT nome, mensagem, criado_em FROM comentarios WHERE postagem = $1 ORDER BY criado_em DESC',
      [postagem]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar comentários');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
