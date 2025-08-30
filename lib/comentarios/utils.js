// /lib/comentarios/utils.js

// Utilitários para o sistema de comentários
class ComentariosUtils {
    
    // Sanitiza entrada do usuário
    static sanitizarTexto(texto) {
        return texto
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .trim();
    }

    // Valida URL
    static validarUrl(url) {
        if (!url || url.trim() === '') return true; // URL é opcional
        
        try {
            new URL(url);
            return url.startsWith('http://') || url.startsWith('https://');
        } catch {
            return false;
        }
    }

    // Valida dados do comentário
    static validarComentario(dados) {
        const erros = [];

        // Validar nome
        if (!dados.nome || dados.nome.trim().length < 2) {
            erros.push('Nome deve ter pelo menos 2 caracteres');
        }
        if (dados.nome && dados.nome.length > 50) {
            erros.push('Nome não pode ter mais de 50 caracteres');
        }

        // Validar comentário
        if (!dados.comentario || dados.comentario.trim().length < 5) {
            erros.push('Comentário deve ter pelo menos 5 caracteres');
        }
        if (dados.comentario && dados.comentario.length > 1000) {
            erros.push('Comentário não pode ter mais de 1000 caracteres');
        }

        // Validar URL (se fornecida)
        if (dados.link && !this.validarUrl(dados.link)) {
            erros.push('URL inválida');
        }

        // Verificar palavrões/spam básico
        if (this.contemConteudoInapropriado(dados.comentario)) {
            erros.push('Comentário contém conteúdo inapropriado');
        }

        return {
            valido: erros.length === 0,
            erros: erros
        };
    }

    // Filtro básico de conteúdo inapropriado
    static contemConteudoInapropriado(texto) {
        const palavrasProibidas = [
            'spam', 'viagra', 'casino', 'porn', 'xxx',
            // Adicione mais conforme necessário
        ];
        
        const textoLower = texto.toLowerCase();
        return palavrasProibidas.some(palavra => textoLower.includes(palavra));
    }

    // Gera ID único para comentário
    static gerarId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 5);
    }

    // Formata data para exibição
    static formatarData(dataISO) {
        const data = new Date(dataISO);
        const agora = new Date();
        const diferenca = agora - data;
        
        // Se foi hoje
        if (diferenca < 24 * 60 * 60 * 1000) {
            const horas = Math.floor(diferenca / (60 * 60 * 1000));
            if (horas < 1) {
                const minutos = Math.floor(diferenca / (60 * 1000));
                return minutos < 1 ? 'agora' : `${minutos}min atrás`;
            }
            return `${horas}h atrás`;
        }
        
        // Formato normal
        return data.toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Detecta tema escuro/claro do sistema
    static detectarTema() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    // Aplica tema aos comentários
    static aplicarTema(tema = null) {
        if (!tema) tema = this.detectarTema();
        
        const container = document.getElementById('comentarios-container');
        if (container) {
            container.setAttribute('data-theme', tema);
        }
    }

    // Conta palavras em um texto
    static contarPalavras(texto) {
        return texto.trim().split(/\s+/).filter(palavra => palavra.length > 0).length;
    }

    // Trunca texto se muito longo
    static truncarTexto(texto, limite = 100) {
        if (texto.length <= limite) return texto;
        return texto.substring(0, limite) + '...';
    }

    // Detecta se é dispositivo móvel
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Copia texto para clipboard
    static async copiarTexto(texto) {
        try {
            await navigator.clipboard.writeText(texto);
            return true;
        } catch {
            // Fallback para navegadores mais antigos
            const textarea = document.createElement('textarea');
            textarea.value = texto;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        }
    }

    // Debounce para evitar múltiplas chamadas
    static debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // Rate limiting simples
    static criarRateLimiter(limite = 5, janela = 60000) { // 5 comentários por minuto
        const tentativas = [];
        
        return function() {
            const agora = Date.now();
            
            // Remove tentativas antigas
            while (tentativas.length > 0 && tentativas[0] < agora - janela) {
                tentativas.shift();
            }
            
            // Verifica se excedeu o limite
            if (tentativas.length >= limite) {
                return false;
            }
            
            tentativas.push(agora);
            return true;
        };
    }

    // Converte markdown simples para HTML
    static markdownSimples(texto) {
        return texto
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    // Extrai domínio de uma URL
    static extrairDominio(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return null;
        }
    }

    // Gera gravatar URL (opcional)
    static gerarGravatarUrl(email, tamanho = 32) {
        const emailLower = email.toLowerCase().trim();
        const hash = this.md5(emailLower);
        return `https://www.gravatar.com/avatar/${hash}?s=${tamanho}&d=identicon`;
    }

    // Hash MD5 simples (para gravatar)
    static md5(string) {
        // Implementação básica de MD5 - em produção, use uma biblioteca
        return string.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0).toString(16);
    }

    // Exporta comentários para CSV
    static exportarCSV(comentarios, nomeArquivo = 'comentarios.csv') {
        const cabecalho = ['Data', 'Nome', 'Link', 'Comentário', 'Post'];
        const linhas = [cabecalho];

        Object.entries(comentarios).forEach(([post, comentariosPost]) => {
            comentariosPost.forEach(comentario => {
                linhas.push([
                    new Date(comentario.data).toLocaleString('pt-BR'),
                    comentario.nome,
                    comentario.link || '',
                    comentario.comentario.replace(/\n/g, ' '),
                    post
                ]);
            });
        });

        const csv = linhas.map(linha => 
            linha.map(campo => `"${campo}"`).join(',')
        ).join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = nomeArquivo;
        link.click();
    }

    // Busca em comentários
    static buscarComentarios(comentarios, termo) {
        const termoLower = termo.toLowerCase();
        const resultados = [];

        Object.entries(comentarios).forEach(([post, comentariosPost]) => {
            comentariosPost.forEach(comentario => {
                if (
                    comentario.nome.toLowerCase().includes(termoLower) ||
                    comentario.comentario.toLowerCase().includes(termoLower)
                ) {
                    resultados.push({ ...comentario, post });
                }
            });
        });

        return resultados;
    }

    // Estatísticas dos comentários
    static gerarEstatisticas(comentarios) {
        let totalComentarios = 0;
        let totalPosts = Object.keys(comentarios).length;
        let comentariosRecentes = 0;
        
        const umaSemanaAtras = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        Object.values(comentarios).forEach(comentariosPost => {
            totalComentarios += comentariosPost.length;
            comentariosPost.forEach(comentario => {
                if (new Date(comentario.data).getTime() > umaSemanaAtras) {
                    comentariosRecentes++;
                }
            });
        });

        return {
            totalComentarios,
            totalPosts,
            comentariosRecentes,
            mediaComentariosPorPost: totalPosts > 0 ? (totalComentarios / totalPosts).toFixed(1) : 0
        };
    }
}

// Disponibilizar globalmente
window.ComentariosUtils = ComentariosUtils;
