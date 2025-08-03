// /api/comments.js - Serverless function para Vercel

import { promises as fs } from 'fs';
import path from 'path';

// Configuração
const COMMENTS_FILE = path.join(process.cwd(), 'data', 'comments.json');
const MAX_COMMENT_LENGTH = 1000;
const MAX_NAME_LENGTH = 100;

// Rate limiting simples (em produção use Redis ou banco de dados)
const rateLimits = new Map();

// Função para carregar comentários
async function loadComments() {
    try {
        // Garantir que a pasta data existe
        const dataDir = path.dirname(COMMENTS_FILE);
        try {
            await fs.access(dataDir);
        } catch {
            await fs.mkdir(dataDir, { recursive: true });
        }

        // Tentar ler o arquivo
        try {
            const content = await fs.readFile(COMMENTS_FILE, 'utf8');
            return JSON.parse(content);
        } catch {
            // Se não existir, criar arquivo vazio
            await fs.writeFile(COMMENTS_FILE, '{}');
            return {};
        }
    } catch (error) {
        console.error('Erro ao carregar comentários:', error);
        return {};
    }
}

// Função para salvar comentários
async function saveComments(comments) {
    try {
        const content = JSON.stringify(comments, null, 2);
        await fs.writeFile(COMMENTS_FILE, content);
        return true;
    } catch (error) {
        console.error('Erro ao salvar comentários:', error);
        return false;
    }
}

// Função para sanitizar input
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    return input
        .trim()
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

// Função para validar URL
function isValidUrl(url) {
    if (!url) return true; // URL vazia é válida (opcional)
    
    try {
        // Adicionar protocolo se não tiver
        if (!/^https?:\/\//i.test(url)) {
            url = 'http://' + url;
        }
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// Rate limiting simples
function checkRateLimit(ip) {
    const now = Date.now();
    const userRequests = rateLimits.get(ip) || [];
    
    // Remover requisições antigas (última hora)
    const recentRequests = userRequests.filter(time => now - time < 3600000);
    
    if (recentRequests.length >= 10) {
        return false;
    }
    
    recentRequests.push(now);
    rateLimits.set(ip, recentRequests);
    return true;
}

// Função principal da API
export default async function handler(req, res) {
    // Headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            // Buscar comentários
            const { categoria, titulo } = req.query;
            
            if (!categoria || !titulo) {
                return res.status(400).json({
                    error: 'Categoria e título são obrigatórios'
                });
            }

            const comments = await loadComments();
            const postKey = `${categoria}/${titulo}`;
            const postComments = comments[postKey] || [];

            return res.status(200).json({
                success: true,
                comments: postComments,
                total: postComments.length
            });

        } else if (req.method === 'POST') {
            // Adicionar comentário
            const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
            
            if (!checkRateLimit(ip)) {
                return res.status(429).json({
                    error: 'Muitos comentários enviados. Tente novamente em 1 hora.'
                });
            }

            const { categoria, titulo, nome, link, comentario } = req.body;

            // Validações
            if (!categoria || !titulo) {
                return res.status(400).json({
                    error: 'Categoria e título são obrigatórios'
                });
            }

            if (!nome || !comentario) {
                return res.status(400).json({
                    error: 'Nome e comentário são obrigatórios'
                });
            }

            const sanitizedNome = sanitizeInput(nome);
            const sanitizedLink = sanitizeInput(link);
            const sanitizedComentario = sanitizeInput(comentario);

            if (sanitizedNome.length > MAX_NAME_LENGTH) {
                return res.status(400).json({
                    error: `Nome muito longo (máximo ${MAX_NAME_LENGTH} caracteres)`
                });
            }

            if (sanitizedComentario.length > MAX_COMMENT_LENGTH) {
                return res.status(400).json({
                    error: `Comentário muito longo (máximo ${MAX_COMMENT_LENGTH} caracteres)`
                });
            }

            if (sanitizedLink && !isValidUrl(sanitizedLink)) {
                return res.status(400).json({
                    error: 'URL inválida'
                });
            }

            // Ajustar URL se necessário
            let finalLink = sanitizedLink;
            if (finalLink && !/^https?:\/\//i.test(finalLink)) {
                finalLink = 'http://' + finalLink;
            }

            // Carregar comentários existentes
            const comments = await loadComments();
            const postKey = `${categoria}/${titulo}`;

            // Criar novo comentário
            const newComment = {
                id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                nome: sanitizedNome,
                link: finalLink,
                comentario: sanitizedComentario,
                data: new Date().toLocaleString('pt-BR'),
                timestamp: Date.now()
            };

            // Adicionar à lista
            if (!comments[postKey]) {
                comments[postKey] = [];
            }
            comments[postKey].push(newComment);

            // Salvar
            const saved = await saveComments(comments);
            if (!saved) {
                return res.status(500).json({
                    error: 'Erro ao salvar comentário'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Comentário adicionado com sucesso',
                comment: newComment
            });

        } else {
            return res.status(405).json({
                error: 'Método não permitido'
            });
        }

    } catch (error) {
        console.error('Erro na API:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
}
