import { getCommentsByPostId } from './storage.js';

export default async function handler(request, response) {
  // Configurar CORS para permitir requisições do seu domínio
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder a requisições OPTIONS (preflight)
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method === 'GET') {
    const { postId, limit } = request.query;

    // Validação básica
    if (!postId) {
      return response.status(400).json({ 
        success: false, 
        message: 'Post ID é obrigatório.' 
      });
    }

    try {
      // Buscar comentários usando o sistema de armazenamento
      const comments = getCommentsByPostId(postId, parseInt(limit) || 50);

      return response.status(200).json({ 
        success: true, 
        data: comments,
        count: comments.length
      });
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
      return response.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  } else if (request.method === 'POST') {
    // Também aceitar POST para compatibilidade com o código existente
    const { postId, limit } = request.body;

    // Validação básica
    if (!postId) {
      return response.status(400).json({ 
        success: false, 
        message: 'Post ID é obrigatório.' 
      });
    }

    try {
      // Buscar comentários usando o sistema de armazenamento
      const comments = getCommentsByPostId(postId, parseInt(limit) || 50);

      return response.status(200).json({ 
        success: true, 
        data: comments,
        count: comments.length
      });
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
      return response.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
      });
    }
  } else {
    return response.status(405).json({ 
      success: false, 
      message: 'Método não permitido. Use GET ou POST.' 
    });
  }
}

