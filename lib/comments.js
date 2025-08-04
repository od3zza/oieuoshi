// /lib/comments.js - Sistema de comentários JavaScript puro

class BlogComments {
    constructor(categoria, titulo, options = {}) {
        this.categoria = categoria;
        this.titulo = titulo;
        this.postKey = `${categoria}/${titulo}`;
        
        // Configurações
        this.config = {
            storageType: options.storageType || 'localStorage', // 'localStorage' ou 'indexedDB'
            apiUrl: options.apiUrl || null, // URL da API externa se disponível
            maxComments: options.maxComments || 100,
            maxCommentLength: options.maxCommentLength || 1000,
            maxNameLength: options.maxNameLength || 100,
            enableModeration: options.enableModeration || false,
            autoSave: options.autoSave !== false,
            ...options
        };

        this.container = null;
        this.comments = {};
        
        this.init();
    }

    async init() {
        await this.loadComments();
        this.render();
        this.attachEvents();
    }

    // Renderizar o HTML do sistema
    render() {
        const containerId = 'blog-comments-' + Math.random().toString(36).substr(2, 9);
        
        const html = `
            <div id="${containerId}" class="blog-comments-container">
                <style>
                    .blog-comments-container {
                        max-width: 800px;
                        margin: 2rem auto;
                        padding: 0 1rem;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    }

                    .blog-comments-title {
                        font-size: 1.5rem;
                        margin-bottom: 1.5rem;
                        color: #2c3e50;
                        border-bottom: 2px solid #e9ecef;
                        padding-bottom: 0.5rem;
                    }

                    .blog-comment-form {
                        background: #f8f9fa;
                        padding: 1.5rem;
                        border-radius: 8px;
                        margin-bottom: 2rem;
                        border: 1px solid #dee2e6;
                    }

                    .blog-form-group {
                        margin-bottom: 1rem;
                    }

                    .blog-form-label {
                        display: block;
                        margin-bottom: 0.5rem;
                        font-weight: 500;
                        color: #495057;
                    }

                    .blog-form-input {
                        width: 100%;
                        padding: 0.75rem;
                        border: 1px solid #ced4da;
                        border-radius: 4px;
                        font-size: 1rem;
                        transition: border-color 0.15s ease-in-out;
                        box-sizing: border-box;
                        font-family: inherit;
                    }

                    .blog-form-input:focus {
                        outline: none;
                        border-color: #007bff;
                        box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
                    }

                    .blog-form-textarea {
                        min-height: 100px;
                        resize: vertical;
                    }

                    .blog-submit-btn {
                        background: #007bff;
                        color: white;
                        padding: 0.75rem 1.5rem;
                        border: none;
                        border-radius: 4px;
                        font-size: 1rem;
                        cursor: pointer;
                        transition: background-color 0.15s ease-in-out;
                    }

                    .blog-submit-btn:hover:not(:disabled) {
                        background: #0056b3;
                    }

                    .blog-submit-btn:disabled {
                        background: #6c757d;
                        cursor: not-allowed;
                    }

                    .blog-comments-list {
                        margin-top: 2rem;
                    }

                    .blog-comment-item {
                        background: white;
                        border: 1px solid #dee2e6;
                        border-radius: 8px;
                        padding: 1.5rem;
                        margin-bottom: 1rem;
                        transition: box-shadow 0.15s ease-in-out;
                    }

                    .blog-comment-item:hover {
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }

                    .blog-comment-header {
                        display: flex;
                        align-items: center;
                        margin-bottom: 0.75rem;
                        flex-wrap: wrap;
                        gap: 0.5rem;
                    }

                    .blog-comment-author {
                        font-weight: 600;
                        color: #2c3e50;
                        text-decoration: none;
                    }

                    .blog-comment-author:hover {
                        text-decoration: underline;
                    }

                    .blog-comment-date {
                        color: #6c757d;
                        font-size: 0.875rem;
                    }

                    .blog-comment-text {
                        color: #495057;
                        line-height: 1.6;
                        word-wrap: break-word;
                    }

                    .blog-message {
                        padding: 0.75rem;
                        border-radius: 4px;
                        margin-bottom: 1rem;
                    }

                    .blog-error-message {
                        background: #f8d7da;
                        color: #721c24;
                        border: 1px solid #f5c6cb;
                    }

                    .blog-success-message {
                        background: #d4edda;
                        color: #155724;
                        border: 1px solid #c3e6cb;
                    }

                    .blog-info-message {
                        background: #d1ecf1;
                        color: #0c5460;
                        border: 1px solid #bee5eb;
                    }

                    .blog-comments-count {
                        color: #6c757d;
                        font-size: 0.9rem;
                        margin-bottom: 1rem;
                    }

                    .blog-no-comments {
                        text-align: center;
                        color: #6c757d;
                        padding: 2rem;
                        font-style: italic;
                    }

                    .blog-delete-btn {
                        background: #dc3545;
                        color: white;
                        border: none;
                        padding: 0.25rem 0.5rem;
                        border-radius: 3px;
                        font-size: 0.75rem;
                        cursor: pointer;
                        margin-left: auto;
                    }

                    .blog-delete-btn:hover {
                        background: #c82333;
                    }

                    @media (max-width: 768px) {
                        .blog-comments-container {
                            padding: 0 0.5rem;
                        }
                        
                        .blog-comment-form {
                            padding: 1rem;
                        }

                        .blog-comment-header {
                            flex-direction: column;
                            align-items: flex-start;
                        }
                    }
                </style>

                <h3 class="blog-comments-title">Comentários</h3>
                
                ${this.config.storageType === 'localStorage' ? `
                <div class="blog-message blog-info-message">
                    <strong>Nota:</strong> Os comentários são armazenados localmente no seu navegador.
                </div>
                ` : ''}
                
                <form class="blog-comment-form" data-form="comment">
                    <div class="blog-form-group">
                        <label class="blog-form-label">Nome *</label>
                        <input type="text" class="blog-form-input" data-field="nome" required maxlength="${this.config.maxNameLength}">
                    </div>
                    
                    <div class="blog-form-group">
                        <label class="blog-form-label">Website (opcional)</label>
                        <input type="url" class="blog-form-input" data-field="link" placeholder="https://exemplo.com">
                    </div>
                    
                    <div class="blog-form-group">
                        <label class="blog-form-label">Comentário *</label>
                        <textarea class="blog-form-input blog-form-textarea" data-field="comentario" required maxlength="${this.config.maxCommentLength}" placeholder="Escreva seu comentário aqui..."></textarea>
                    </div>
                    
                    <button type="submit" class="blog-submit-btn">Enviar Comentário</button>
                </form>

                <div data-area="messages"></div>
                
                <div class="blog-comments-list" data-area="comments">
                    <div class="blog-no-comments">Carregando comentários...</div>
                </div>
            </div>
        `;

        // Inserir no DOM
        if (typeof this.config.container === 'string') {
            this.container = document.querySelector(this.config.container);
        } else if (this.config.container instanceof Element) {
            this.container = this.config.container;
        } else {
            // Criar um container automaticamente
            this.container = document.createElement('div');
            document.body.appendChild(this.container);
        }

        this.container.innerHTML = html;
        this.containerElement = this.container.querySelector(`#${containerId}`);
    }

    // Anexar eventos
    attachEvents() {
        const form = this.containerElement.querySelector('[data-form="comment"]');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitComment();
        });
    }

    // Carregar comentários
    async loadComments() {
        try {
            if (this.config.apiUrl) {
                await this.loadFromAPI();
            } else if (this.config.storageType === 'indexedDB') {
                await this.loadFromIndexedDB();
            } else {
                this.loadFromLocalStorage();
            }
        } catch (error) {
            console.error('Erro ao carregar comentários:', error);
            this.comments = {};
        }

        this.renderComments();
    }

    // Carregar do localStorage
    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem('blog_comments');
            this.comments = stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Erro no localStorage:', error);
            this.comments = {};
        }
    }

    // Carregar do IndexedDB
    async loadFromIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('BlogComments', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['comments'], 'readonly');
                const store = transaction.objectStore('comments');
                const getRequest = store.get('comments_data');
                
                getRequest.onsuccess = () => {
                    this.comments = getRequest.result?.data || {};
                    resolve();
                };
                
                getRequest.onerror = () => reject(getRequest.error);
            };
            
            request.onupgradeneeded = () => {
                const db = request.result;
                db.createObjectStore('comments', { keyPath: 'id' });
            };
        });
    }

    // Carregar da API externa
    async loadFromAPI() {
        const response = await fetch(`${this.config.apiUrl}?categoria=${encodeURIComponent(this.categoria)}&titulo=${encodeURIComponent(this.titulo)}`);
        const data = await response.json();
        
        if (data.success) {
            this.comments[this.postKey] = data.comments;
        } else {
            throw new Error(data.error || 'Erro ao carregar da API');
        }
    }

    // Salvar comentários
    async saveComments() {
        try {
            if (this.config.apiUrl) {
                // Salvamento via API é feito no submitComment
                return true;
            } else if (this.config.storageType === 'indexedDB') {
                return await this.saveToIndexedDB();
            } else {
                return this.saveToLocalStorage();
            }
        } catch (error) {
            console.error('Erro ao salvar comentários:', error);
            return false;
        }
    }

    // Salvar no localStorage
    saveToLocalStorage() {
        try {
            localStorage.setItem('blog_comments', JSON.stringify(this.comments));
            return true;
        } catch (error) {
            console.error('Erro ao salvar no localStorage:', error);
            return false;
        }
    }

    // Salvar no IndexedDB
    async saveToIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('BlogComments', 1);
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['comments'], 'readwrite');
                const store = transaction.objectStore('comments');
                const putRequest = store.put({ id: 'comments_data', data: this.comments });
                
                putRequest.onsuccess = () => resolve(true);
                putRequest.onerror = () => reject(putRequest.error);
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    // Submeter comentário
    async submitComment() {
        const form = this.containerElement.querySelector('[data-form="comment"]');
        const submitBtn = form.querySelector('.blog-submit-btn');
        
        const nome = form.querySelector('[data-field="nome"]').value.trim();
        const link = form.querySelector('[data-field="link"]').value.trim();
        const comentario = form.querySelector('[data-field="comentario"]').value.trim();

        // Validações
        if (!nome || !comentario) {
            this.showMessage('Por favor, preencha todos os campos obrigatórios', 'error');
            return;
        }

        if (nome.length > this.config.maxNameLength) {
            this.showMessage(`Nome muito longo (máximo ${this.config.maxNameLength} caracteres)`, 'error');
            return;
        }

        if (comentario.length > this.config.maxCommentLength) {
            this.showMessage(`Comentário muito longo (máximo ${this.config.maxCommentLength} caracteres)`, 'error');
            return;
        }

        if (link && !this.isValidUrl(link)) {
            this.showMessage('Por favor, insira uma URL válida', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';

        try {
            const newComment = {
                id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                nome: this.sanitizeInput(nome),
                link: this.sanitizeInput(link),
                comentario: this.sanitizeInput(comentario),
                data: new Date().toLocaleString('pt-BR'),
                timestamp: Date.now()
            };

            // Ajustar URL se necessário
            if (newComment.link && !/^https?:\/\//i.test(newComment.link)) {
                newComment.link = 'http://' + newComment.link;
            }

            if (this.config.apiUrl) {
                await this.submitToAPI(newComment);
            } else {
                // Adicionar localmente
                if (!this.comments[this.postKey]) {
                    this.comments[this.postKey] = [];
                }
                this.comments[this.postKey].push(newComment);
                await this.saveComments();
            }

            this.showMessage('Comentário enviado com sucesso!', 'success');
            form.reset();
            this.renderComments();

        } catch (error) {
            console.error('Erro ao enviar comentário:', error);
            this.showMessage('Erro ao enviar comentário: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar Comentário';
        }
    }

    // Submeter para API
    async submitToAPI(comment) {
        const response = await fetch(this.config.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                categoria: this.categoria,
                titulo: this.titulo,
                nome: comment.nome,
                link: comment.link,
                comentario: comment.comentario
            })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Erro na API');
        }

        // Atualizar comentários locais
        if (!this.comments[this.postKey]) {
            this.comments[this.postKey] = [];
        }
        this.comments[this.postKey].push(data.comment);
    }

    // Renderizar comentários
    renderComments() {
        const container = this.containerElement.querySelector('[data-area="comments"]');
        const postComments = this.comments[this.postKey] || [];
        
        if (postComments.length === 0) {
            container.innerHTML = `
                <div class="blog-comments-count">0 comentários</div>
                <div class="blog-no-comments">Seja o primeiro a comentar!</div>
            `;
            return;
        }

        // Ordenar por data (mais recentes primeiro)
        const sortedComments = [...postComments].sort((a, b) => b.timestamp - a.timestamp);

        let html = `<div class="blog-comments-count">${postComments.length} comentário${postComments.length !== 1 ? 's' : ''}</div>`;
        
        sortedComments.forEach(comment => {
            const autorLink = comment.link ? 
                `<a href="${comment.link}" target="_blank" rel="noopener noreferrer" class="blog-comment-author">${comment.nome}</a>` :
                `<span class="blog-comment-author">${comment.nome}</span>`;
            
            html += `
                <div class="blog-comment-item">
                    <div class="blog-comment-header">
                        ${autorLink}
                        <span class="blog-comment-date">${comment.data}</span>
                        ${this.config.storageType !== 'api' ? `<button class="blog-delete-btn" onclick="blogComments.deleteComment('${comment.id}')" title="Excluir comentário">×</button>` : ''}
                    </div>
                    <div class="blog-comment-text">${comment.comentario}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // Excluir comentário
    async deleteComment(commentId) {
        if (!confirm('Tem certeza que deseja excluir este comentário?')) {
            return;
        }

        if (this.comments[this.postKey]) {
            this.comments[this.postKey] = this.comments[this.postKey].filter(
                comment => comment.id !== commentId
            );
            
            if (await this.saveComments()) {
                this.showMessage('Comentário excluído com sucesso!', 'success');
                this.renderComments();
            } else {
                this.showMessage('Erro ao excluir comentário', 'error');
            }
        }
    }

    // Utilitários
    sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    isValidUrl(string) {
        try {
            if (!/^https?:\/\//i.test(string)) {
                string = 'http://' + string;
            }
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    showMessage(message, type = 'info') {
        const messageArea = this.containerElement.querySelector('[data-area="messages"]');
        const className = `blog-${type}-message`;
        
        messageArea.innerHTML = `<div class="blog-message ${className}">${message}</div>`;
        
        setTimeout(() => {
            messageArea.innerHTML = '';
        }, 5000);
    }
}

// Função para inicializar facilmente
function initBlogComments(categoria, titulo, options = {}) {
    // Extrair da URL se não fornecido
    if (!categoria || !titulo) {
        const extracted = extractFromUrl();
        categoria = categoria || extracted.categoria;
        titulo = titulo || extracted.titulo;
    }

    return new BlogComments(categoria, titulo, options);
}

// Função para extrair categoria e título da URL
function extractFromUrl() {
    const path = window.location.pathname;
    const matches = path.match(/\/blog\/([^\/]+)\/([^\/]+)/);
    
    if (matches) {
        return {
            categoria: decodeURIComponent(matches[1]),
            titulo: decodeURIComponent(matches[2])
        };
    }
    
    return {
        categoria: 'geral',
        titulo: 'post-exemplo'
    };
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.BlogComments = BlogComments;
    window.initBlogComments = initBlogComments;
}

// Exportar para módulos se disponível
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BlogComments, initBlogComments };
}
