import { addComment } from './storage.js';

export default async function handler(request, response) {
  // Configurar CORS para permitir requisições do seu domínio
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder a requisições OPTIONS (preflight)
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method === 'POST') {
    const { postId, name, email, comment } = request.body;

    // Validação básica
    if (!postId || !name || !comment) {
      return response.status(400).json({ 
        success: false, 
        message: 'Post ID, nome e comentário são obrigatórios.' 
      });
    }

    // Adicionar comentário usando o sistema de armazenamento
    const result = addComment({ postId, name, email, comment });

    if (result.success) {
      return response.status(200).json({ 
        success: true, 
        message: 'Comentário adicionado com sucesso!', 
        comment: result.comment 
      });
    } else {
      return response.status(500).json({ 
        success: false, 
        message: result.message || 'Erro interno do servidor' 
      });
    }
  } else {
    return response.status(405).json({ 
      success: false, 
      message: 'Método não permitido. Use POST.' 
    });
  }
}


