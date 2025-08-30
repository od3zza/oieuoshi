// lib/comentarios/comments-validator.js

class CommentsValidator {
  constructor() {
    // Palavras proibidas (pode ser expandido)
    this.forbiddenWords = [
      'spam', 'viagra', 'casino', 'poker', 'bet', 'gambling',
      'hack', 'crack', 'pirate', 'warez', 'torrent',
      // Adicione mais conforme necessário
    ];

    // Regex para detectar URLs suspeitas
    this.suspiciousUrlPattern = /(bit\.ly|tinyurl|t\.co|goo\.gl|short\.link)/i;
    
    // Regex para detectar emails
    this.emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    
    // Regex para detectar HTML/Script tags
    this.htmlPattern = /<[^>]*>/g;
    
    // Limites de caracteres repetidos
    this.maxRepeatedChars = 5;
  }

  // Validação completa de comentário
  validateComment(commentData) {
    const errors = [];
    const warnings = [];

    // Validações básicas
    errors.push(...this.validateBasicFields(commentData));
    
    // Validações de conteúdo
    warnings.push(...this.validateContent(commentData.comment));
    
    // Validações de spam
    const spamScore = this.calculateSpamScore(commentData);
    if (spamScore > 5) {
      errors.push('Comentário detectado como possível spam');
    } else if (spamScore > 3) {
      warnings.push('Comentário pode parecer spam');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      spamScore
    };
  }

  // Validações básicas de campos
  validateBasicFields(data) {
    const errors = [];

    // Validar nome
    if (!data.author || typeof data.author !== 'string') {
      errors.push('Nome é obrigatório');
    } else {
      const author = data.author.trim();
      if (author.length < 2) {
        errors.push('Nome deve ter pelo menos 2 caracteres');
      }
      if (author.length > 100) {
        errors.push('Nome deve ter no máximo 100 caracteres');
      }
      if (!/^[\p{L}\p{N}\s\-'\.]+$/u.test(author)) {
        errors.push('Nome contém caracteres não permitidos');
      }
    }

    // Validar comentário
    if (!data.comment || typeof data.comment !== 'string') {
      errors.push('Comentário é obrigatório');
    } else {
      const comment = data.comment.trim();
      if (comment.length < 3) {
        errors.push('Comentário deve ter pelo menos 3 caracteres');
      }
      if (comment.length > 2000) {
        errors.push('Comentário deve ter no máximo 2000 caracteres');
      }
    }

    // Validar website (se fornecido)
    if (data.website && data.website.trim()) {
      if (!this.isValidUrl(data.website)) {
        errors.push('URL do website é inválida');
      }
      if (this.suspiciousUrlPattern.test(data.website)) {
        errors.push('URL do website parece suspeita');
      }
    }

    return errors;
  }

  // Validações de conteúdo
  validateContent(comment) {
    const warnings = [];

    if (!comment) return warnings;

    const lowerComment = comment.toLowerCase();

    // Verificar palavras proibidas
    const foundForbiddenWords = this.forbiddenWords.filter(word => 
      lowerComment.includes(word.toLowerCase())
    );
    if (foundForbiddenWords.length > 0) {
      warnings.push(`Contém palavras questionáveis: ${foundForbiddenWords.join(', ')}`);
    }

    // Verificar excesso de maiúsculas
    const upperCaseCount = (comment.match(/[A-Z]/g) || []).length;
    const upperCaseRatio = upperCaseCount / comment.length;
    if (upperCaseRatio > 0.3 && comment.length > 20) {
      warnings.push('Excesso de letras maiúsculas');
    }

    // Verificar caracteres repetidos
    if (this.hasExcessiveRepeatedChars(comment)) {
      warnings.push('Caracteres repetidos excessivamente');
    }

    // Verificar presença de HTML
    if (this.htmlPattern.test(comment)) {
      warnings.push('Contém tags HTML');
    }

    // Verificar emails
    const emails = comment.match(this.emailPattern);
    if (emails && emails.length > 0) {
      warnings.push('Contém endereços de email');
    }

    // Verificar URLs
    const urlCount = (comment.match(/https?:\/\/[^\s]+/gi) || []).length;
    if (urlCount > 2) {
      warnings.push('Muitas URLs no comentário');
    }

    return warnings;
  }

  // Calcular score de spam
  calculateSpamScore(data) {
    let score = 0;

    const comment = data.comment.toLowerCase();
    const author = data.author.toLowerCase();

    // Score por palavras proibidas
    this.forbiddenWords.forEach(word => {
      if (comment.includes(word)) {
        score += 2;
      }
    });

    // Score por excesso de URLs
    const urlCount = (data.comment.match(/https?:\/\/[^\s]+/gi) || []).length;
    if (urlCount > 3) score += 3;
    if (urlCount > 1) score += 1;

    // Score por repetição de caracteres
    if (this.hasExcessiveRepeatedChars(data.comment)) {
      score += 2;
    }

    // Score por maiúsculas excessivas
    const upperCaseRatio = (data.comment.match(/[A-Z]/g) || []).length / data.comment.length;
    if (upperCaseRatio > 0.5) score += 2;
    if (upperCaseRatio > 0.3) score += 1;

    // Score por emails
    if (this.emailPattern.test(data.comment)) {
      score += 1;
    }

    // Score por comprimento suspeito
    if (data.comment.length < 10) score += 1;
    if (data.comment.length > 1500) score += 1;

    // Score por nome suspeito
    if (author.includes('admin') || author.includes('test')) {
      score += 1;
    }

    // Score por website suspeito
    if (data.website && this.suspiciousUrlPattern.test(data.website)) {
      score += 3;
    }

    return score;
  }

  // Verificar caracteres repetidos excessivamente
  hasExcessiveRepeatedChars(text) {
    const regex = new RegExp(`(.)\\1{${this.maxRepeatedChars},}`, 'g');
    return regex.test(text);
  }

  // Validar URL
  isValidUrl(string) {
    try {
      const url = new URL(string);
      return ['http:', 'https:'].includes(url.protocol);
    } catch (_) {
      return false;
    }
  }

  // Sanitizar texto (remover HTML, normalizar espaços)
  sanitizeText(text) {
    if (!text) return '';
    
    return text
      // Remover HTML tags
      .replace(this.htmlPattern, '')
      // Normalizar espaços
      .replace(/\s+/g, ' ')
      // Trim
      .trim()
      // Escapar caracteres especiais para HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Verificar rate limiting básico (baseado em localStorage)
  checkRateLimit(identifier, maxAttempts = 3, windowMs = 3600000) {
    const key = `rate_limit_${identifier}`;
    const now = Date.now();
    
    // Obter tentativas anteriores
    const attempts = JSON.parse(localStorage.getItem(key) || '[]');
    
    // Filtrar tentativas dentro da janela de tempo
    const recentAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      const oldestAttempt = Math.min(...recentAttempts);
      const timeUntilReset = windowMs - (now - oldestAttempt);
      const minutesLeft = Math.ceil(timeUntilReset / 60000);
      
      return {
        allowed: false,
        message: `Muitas tentativas. Tente novamente em ${minutesLeft} minutos.`,
        resetIn: timeUntilReset
      };
    }

    // Adicionar tentativa atual
    recentAttempts.push(now);
    localStorage.setItem(key, JSON.stringify(recentAttempts));

    return {
      allowed: true,
      remaining: maxAttempts - recentAttempts.length
    };
  }

  // Gerar hash para identificação (simulação client-side)
  async generateHash(data, salt = 'comments_salt') {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Validação em tempo real para o frontend
  validateFieldRealTime(fieldName, value) {
    switch (fieldName) {
      case 'author':
        if (!value.trim()) return { valid: false, message: 'Nome é obrigatório' };
        if (value.length < 2) return { valid: false, message: 'Muito curto' };
        if (value.length > 100) return { valid: false, message: 'Muito longo' };
        return { valid: true, message: 'OK' };

      case 'comment':
        if (!value.trim()) return { valid: false, message: 'Comentário é obrigatório' };
        if (value.length < 3) return { valid: false, message: 'Muito curto' };
        if (value.length > 2000) return { valid: false, message: 'Muito longo' };
        
        const spamScore = this.calculateSpamScore({ comment: value, author: '', website: '' });
        if (spamScore > 5) return { valid: false, message: 'Conteúdo parece spam' };
        if (spamScore > 3) return { valid: true, message: 'Atenção: pode parecer spam' };
        
        return { valid: true, message: 'OK' };

      case 'website':
        if (!value.trim()) return { valid: true, message: 'Opcional' };
        if (!this.isValidUrl(value)) return { valid: false, message: 'URL inválida' };
        if (this.suspiciousUrlPattern.test(value)) return { valid: false, message: 'URL suspeita' };
        return { valid: true, message: 'OK' };

      default:
        return { valid: true, message: 'OK' };
    }
  }
}

// Exportar para uso global
window.CommentsValidator = CommentsValidator;
