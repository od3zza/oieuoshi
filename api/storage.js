// Sistema de armazenamento simples usando arquivo JSON
// NOTA: Esta é uma solução temporária para demonstração.
// Em produção, você usaria um banco de dados real.

import fs from 'fs';
import path from 'path';

const DATA_FILE = '/tmp/comments.json';

// Função para ler comentários do arquivo
export function readComments() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Erro ao ler comentários:', error);
    return [];
  }
}

// Função para salvar comentários no arquivo
export function saveComments(comments) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(comments, null, 2));
    return true;
  } catch (error) {
    console.error('Erro ao salvar comentários:', error);
    return false;
  }
}

// Função para adicionar um comentário
export function addComment(commentData) {
  const comments = readComments();
  
  const newComment = {
    id: Date.now(), // Usar timestamp como ID único
    postId: String(commentData.postId).trim(),
    name: String(commentData.name).trim().substring(0, 50),
    email: commentData.email ? String(commentData.email).trim().substring(0, 100) : '',
    comment: String(commentData.comment).trim().substring(0, 1000),
    timestamp: new Date().toISOString(),
    approved: true, // Por enquanto, todos aprovados
  };
  
  comments.push(newComment);
  
  if (saveComments(comments)) {
    return { success: true, comment: newComment };
  } else {
    return { success: false, message: 'Erro ao salvar comentário' };
  }
}

// Função para buscar comentários por postId
export function getCommentsByPostId(postId, limit = 50) {
  const comments = readComments();
  
  return comments
    .filter(comment => comment.postId === postId && comment.approved)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

