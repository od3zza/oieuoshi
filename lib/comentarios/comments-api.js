// lib/comentarios/comments-api.js

class CommentsAPI {
  constructor() {
    this.apiUrl = 'https://api.github.com/repos/od3zza/oieuoshi/dispatches';
    this.rateLimitStorage = 'comments_rate_limit';
    this.rateLimitMax = 3; // 3 comentários por hora
    this.rateLimitWindow = 3600000; // 1 hora em milliseconds
  }

  // Gerar hash do IP (simulado no frontend)
  async generateHash(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data + 'salt_secreto');
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Verificar rate limiting
  checkRateLimit() {
    const now = Date.now();
    const rateLimitData = JSON.parse(localStorage.getItem(this.rateLimitStorage) || '[]');
    
    // Filtrar tentativas dentro da janela de tempo
    const recentAttempts = rateLimitData.filter(timestamp => now - timestamp < this.rateLimitWindow);
    
    if (recentAttempts.length >= this.rateLimitMax) {
      const oldestAttempt = Math.min(...recentAttempts);
      const timeUntilReset = this.rateLimitWindow - (now - oldestAttempt);
      const minutesLeft = Math.ceil(timeUntilReset / 60000);
      
      throw new Error(`Muitos comentários enviados. Tente novamente em ${minutesLeft} minutos.`);
    }

    // Adicionar tentativa atual e salvar
    recentAttempts.push(now);
    localStorage.setItem(this.rateLimitStorage, JSON.stringify(recentAttempts));
  }

  // Validar dados do formulário
  validateCommentData(data) {
    const errors = [];

    // Validar nome
    if (!data.author || data.author.trim().length < 2) {
      errors.push('Nome deve ter pelo menos 2 caracteres');
    }
    if (data.author && data.author.length > 100) {
      errors.push('Nome deve ter no máximo 100 caracteres');
    }

    // Validar comentário
    if (!data.comment || data.comment.trim().length < 3) {
      errors.push('Comentário deve ter pelo menos 3 caracteres');
    }
    if (data.comment && data.comment.length > 2000) {
      errors.push('Comentário deve ter no máximo 2000 caracteres');
    }

    // Validar website (se fornecido)
    if (data.website && data.website.trim()) {
      try {
        new URL(data.website);
      } catch {
        errors.push('URL do website é inválida');
      }
    }

    // Verificar palavras proibidas (básico)
    const forbiddenWords = ['spam', 'viagra', 'casino'];
    const commentLower = data.comment.toLowerCase();
    const hasForbiddenWords = forbiddenWords.some(word => 
      commentLower.includes(word)
    );
    
    if (hasForbiddenWords) {
      errors.push('Comentário contém conteúdo não permitido');
    }

    return errors;
  }

  // Carregar comentários de um post
  async loadComments(postUrl) {
    try {
      const response = await fetch('/lib/comentarios/comments.json');
      if (!response.ok) {
        throw new Error('Erro ao carregar comentários');
      }
      
      const data = await response.json();
      return data.comments[postUrl] || [];
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
      return [];
    }
  }

  // Enviar novo comentário
  async submitComment(commentData) {
    try {
      // Verificar rate limiting
      this.checkRateLimit();

      // Validar dados
      const errors = this.validateCommentData(commentData);
      if (errors.length > 0) {
        throw new Error(errors.join('; '));
      }

      // Gerar hashes
      const ipHash = await this.generateHash(
        commentData.ip || 'unknown_ip'
      );
      const userAgentHash = await this.generateHash(
        navigator.userAgent
      );

      // Preparar payload para o GitHub Action
      const payload = {
        event_type: 'new-comment',
        client_payload: {
          post_url: commentData.postUrl,
          author: commentData.author.trim(),
          website: commentData.website ? commentData.website.trim() : '',
          comment: commentData.comment.trim(),
          ip_hash: ipHash,
          user_agent_hash: userAgentHash
        }
      };

      // **ATENÇÃO: EM PRODUÇÃO, ESTA CHAMADA DEVE SER FEITA VIA VERCEL FUNCTION**
      // O token nunca deve estar no frontend!
      const response = await fetch('/api/submit-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao enviar comentário');
      }

      return await response.json();

    } catch (error) {
      console.error('Erro ao enviar comentário:', error);
      throw error;
    }
  }

  // Obter estatísticas
  async getStats() {
    try {
      const response = await fetch('/lib/comentarios/comments.json');
      if (!response.ok) {
        throw new Error('Erro ao carregar estatísticas');
      }
      
      const data = await response.json();
      return data.stats;
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      return {
        total_comments: 0,
        total_posts_with_comments: 0,
        last_updated: null
      };
    }
  }
}

// Exportar para uso global
window.CommentsAPI = CommentsAPI;
