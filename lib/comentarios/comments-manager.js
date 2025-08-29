class CommentsManager {
    constructor() {
        this.commentsData = null;
        this.currentPostPath = this.getCurrentPostPath();
        this.isLoading = false;
    }

    // Obter o caminho do post atual
    getCurrentPostPath() {
        const path = window.location.pathname;
        // Remove /blog/ do início e possível / do final
        return path.replace(/^\/blog\//, '').replace(/\/$/, '');
    }

    // Carregar comentários do arquivo JSON
    async loadComments() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        try {
            const response = await fetch('/lib/comentarios/comments.json');
            if (!response.ok) throw new Error('Erro ao carregar comentários');
            
            this.commentsData = await response.json();
            this.renderComments();
        } catch (error) {
            console.error('Erro ao carregar comentários:', error);
            this.showError('Erro ao carregar comentários. Tente novamente mais tarde.');
        } finally {
            this.isLoading = false;
        }
    }

    // Obter comentários do post atual
    getPostComments() {
        if (!this.commentsData || !this.commentsData.posts[this.currentPostPath]) {
            return [];
        }
        return this.commentsData.posts[this.currentPostPath].comments
            .filter(comment => comment.approved)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    // Renderizar comentários na página
    renderComments() {
        const commentsContainer = document.getElementById('comments-list');
        if (!commentsContainer) return;

        const comments = this.getPostComments();
        
        if (comments.length === 0) {
            commentsContainer.innerHTML = `
                <div class="no-comments">
                    <p>Ainda não há comentários. Seja o primeiro a comentar!</p>
                </div>
            `;
            return;
        }

        const commentsHtml = comments.map(comment => this.renderComment(comment)).join('');
        commentsContainer.innerHTML = commentsHtml;
        
        // Atualizar contador
        this.updateCommentsCount(comments.length);
    }

    // Renderizar um comentário individual
    renderComment(comment) {
        const date = new Date(comment.timestamp).toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const websiteLink = comment.website ? 
            `<a href="${this.sanitizeUrl(comment.website)}" target="_blank" rel="noopener noreferrer" class="comment-website">🔗 Website</a>` : 
            '';

        return `
            <div class="comment" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <div class="comment-author">${this.sanitizeHtml(comment.author)}</div>
                    <div class="comment-meta">
                        <span class="comment-date">${date}</span>
                        ${websiteLink}
                    </div>
                </div>
                <div class="comment-content">
                    <p>${this.sanitizeHtml(comment.comment).replace(/\n/g, '<br>')}</p>
                </div>
            </div>
        `;
    }

    // Processar envio de novo comentário
    async submitComment(formData) {
        // Validar dados
        const validation = this.validateComment(formData);
        if (!validation.valid) {
            this.showError(validation.message);
            return false;
        }

        try {
            // Simular envio (em um ambiente real, enviaria para um servidor)
            const newComment = {
                id: Date.now().toString(),
                author: formData.author.trim(),
                website: formData.website.trim(),
                comment: formData.comment.trim(),
                timestamp: new Date().toISOString(),
                approved: true // Em produção, poderia ser false para moderação
            };

            // Adicionar ao comentários locais (temporariamente)
            this.addCommentLocally(newComment);
            
            // Mostrar sucesso
            this.showSuccess('Comentário enviado com sucesso!');
            
            // Limpar formulário
            this.clearForm();
            
            // Re-renderizar comentários
            this.renderComments();
            
            return true;
        } catch (error) {
            console.error('Erro ao enviar comentário:', error);
            this.showError('Erro ao enviar comentário. Tente novamente.');
            return false;
        }
    }

    // Adicionar comentário localmente (simulação)
    addCommentLocally(comment) {
        if (!this.commentsData.posts[this.currentPostPath]) {
            this.commentsData.posts[this.currentPostPath] = { comments: [] };
        }
        
        this.commentsData.posts[this.currentPostPath].comments.unshift(comment);
        this.commentsData.meta.lastId = parseInt(comment.id);
        this.commentsData.meta.totalComments++;
        this.commentsData.meta.lastUpdate = comment.timestamp;
    }

    // Validar dados do comentário
    validateComment(data) {
        if (!data.author || data.author.trim().length < 2) {
            return { valid: false, message: 'Nome deve ter pelo menos 2 caracteres.' };
        }
        
        if (data.author.trim().length > 50) {
            return { valid: false, message: 'Nome deve ter no máximo 50 caracteres.' };
        }

        if (!data.comment || data.comment.trim().length < 10) {
            return { valid: false, message: 'Comentário deve ter pelo menos 10 caracteres.' };
        }

        if (data.comment.trim().length > 1000) {
            return { valid: false, message: 'Comentário deve ter no máximo 1000 caracteres.' };
        }

        if (data.website && !this.isValidUrl(data.website)) {
            return { valid: false, message: 'URL do website inválida.' };
        }

        return { valid: true };
    }

    // Validar URL
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Sanitizar HTML
    sanitizeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Sanitizar URL
    sanitizeUrl(url) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return 'https://' + url;
        }
        return url;
    }

    // Atualizar contador de comentários
    updateCommentsCount(count) {
        const counter = document.getElementById('comments-count');
        if (counter) {
            counter.textContent = count;
        }
    }

    // Mostrar mensagem de erro
    showError(message) {
        this.showMessage(message, 'error');
    }

    // Mostrar mensagem de sucesso
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    // Mostrar mensagem
    showMessage(message, type) {
        const messageEl = document.getElementById('comments-message');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `comments-message ${type}`;
            messageEl.style.display = 'block';
            
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 5000);
        }
    }

    // Limpar formulário
    clearForm() {
        const form = document.getElementById('comments-form');
        if (form) {
            form.reset();
        }
    }

    // Inicializar sistema de comentários
    init() {
        this.loadComments();
        this.setupEventListeners();
    }

    // Configurar event listeners
    setupEventListeners() {
        const form = document.getElementById('comments-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = {
                    author: form.author.value,
                    website: form.website.value,
                    comment: form.comment.value
                };

                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Enviando...';
                submitBtn.disabled = true;

                await this.submitComment(formData);

                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            });
        }
    }
}