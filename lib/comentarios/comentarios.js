// /lib/comentarios/comentarios.js
class SistemaComentarios {
    constructor(config) {
        this.config = {
            owner: config.owner, // seu username do GitHub
            repo: config.repo,   // nome do repositório
            token: config.token, // Personal Access Token do GitHub
            branch: config.branch || 'main',
            dbPath: 'lib/comentarios/comentarios.json'
        };
        this.comentarios = [];
        this.carregando = false;
    }

    // Inicializa o sistema de comentários
    async inicializar(postPath) {
        this.postPath = postPath;
        await this.carregarComentarios();
        this.renderizarInterface();
        this.configurarEventos();
    }

    // Carrega comentários do GitHub
    async carregarComentarios() {
        try {
            this.carregando = true;
            const response = await fetch(
                `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.dbPath}`,
                {
                    headers: {
                        'Authorization': `token ${this.config.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                const conteudo = atob(data.content);
                const todosComentarios = JSON.parse(conteudo);
                this.comentarios = todosComentarios[this.postPath] || [];
                this.sha = data.sha; // Necessário para updates
            } else if (response.status === 404) {
                // Arquivo não existe ainda, criar estrutura inicial
                this.comentarios = [];
                await this.criarArquivoInicial();
            }
        } catch (error) {
            console.error('Erro ao carregar comentários:', error);
            this.comentarios = [];
        } finally {
            this.carregando = false;
        }
    }

    // Cria arquivo inicial de comentários
    async criarArquivoInicial() {
        const estruturaInicial = {};
        await this.salvarComentarios(estruturaInicial);
    }

    // Salva comentários no GitHub
    async salvarComentarios(novosComentarios) {
        try {
            const conteudo = btoa(JSON.stringify(novosComentarios, null, 2));
            
            const response = await fetch(
                `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.dbPath}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.config.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Atualizar comentários para ${this.postPath}`,
                        content: conteudo,
                        sha: this.sha,
                        branch: this.config.branch
                    })
                }
            );

            if (response.ok) {
                const data = await response.json();
                this.sha = data.content.sha;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro ao salvar comentários:', error);
            return false;
        }
    }

    // Adiciona novo comentário
    async adicionarComentario(nome, link, comentario) {
        if (!nome.trim() || !comentario.trim()) {
            alert('Nome e comentário são obrigatórios!');
            return false;
        }

        const novoComentario = {
            id: Date.now().toString(),
            nome: nome.trim(),
            link: link.trim() || null,
            comentario: comentario.trim(),
            data: new Date().toISOString(),
            aprovado: true // Você pode implementar moderação depois
        };

        // Recarregar comentários para ter a versão mais recente
        await this.carregarComentarios();
        
        // Carregar todos os comentários, adicionar o novo e salvar
        const response = await fetch(
            `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.dbPath}`,
            {
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        let todosComentarios = {};
        if (response.ok) {
            const data = await response.json();
            const conteudo = atob(data.content);
            todosComentarios = JSON.parse(conteudo);
            this.sha = data.sha;
        }

        if (!todosComentarios[this.postPath]) {
            todosComentarios[this.postPath] = [];
        }
        
        todosComentarios[this.postPath].unshift(novoComentario);
        
        const sucesso = await this.salvarComentarios(todosComentarios);
        
        if (sucesso) {
            this.comentarios.unshift(novoComentario);
            this.renderizarComentarios();
            return true;
        }
        
        return false;
    }

    // Renderiza a interface completa
    renderizarInterface() {
        const container = document.getElementById('comentarios-container');
        if (!container) {
            console.error('Container #comentarios-container não encontrado');
            return;
        }

        container.innerHTML = `
            <div class="comentarios-secao">
                <h3>Comentários (${this.comentarios.length})</h3>
                
                <div class="comentarios-form">
                    <h4>Deixe seu comentário</h4>
                    <form id="form-comentario">
                        <div class="form-group">
                            <label for="nome">Nome *</label>
                            <input type="text" id="nome" required maxlength="50">
                        </div>
                        
                        <div class="form-group">
                            <label for="link">Link (opcional)</label>
                            <input type="url" id="link" placeholder="https://seusite.com">
                        </div>
                        
                        <div class="form-group">
                            <label for="comentario">Comentário *</label>
                            <textarea id="comentario" required maxlength="1000" rows="4"></textarea>
                        </div>
                        
                        <button type="submit" id="btn-enviar">Enviar Comentário</button>
                    </form>
                </div>

                <div class="comentarios-lista" id="comentarios-lista">
                    ${this.carregando ? '<p>Carregando comentários...</p>' : ''}
                </div>
            </div>
        `;

        this.renderizarComentarios();
    }

    // Renderiza apenas a lista de comentários
    renderizarComentarios() {
        const lista = document.getElementById('comentarios-lista');
        if (!lista) return;

        if (this.comentarios.length === 0) {
            lista.innerHTML = '<p class="sem-comentarios">Seja o primeiro a comentar!</p>';
            return;
        }

        const comentariosHtml = this.comentarios.map(comentario => {
            const data = new Date(comentario.data).toLocaleDateString('pt-BR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const nomeHtml = comentario.link 
                ? `<a href="${comentario.link}" target="_blank" rel="nofollow">${comentario.nome}</a>`
                : comentario.nome;

            return `
                <div class="comentario" data-id="${comentario.id}">
                    <div class="comentario-header">
                        <strong class="comentario-nome">${nomeHtml}</strong>
                        <span class="comentario-data">${data}</span>
                    </div>
                    <div class="comentario-texto">${this.formatarTexto(comentario.comentario)}</div>
                </div>
            `;
        }).join('');

        lista.innerHTML = comentariosHtml;
    }

    // Formata texto do comentário (quebras de linha, etc)
    formatarTexto(texto) {
        return texto
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    }

    // Configura eventos do formulário
    configurarEventos() {
        const form = document.getElementById('form-comentario');
        const btnEnviar = document.getElementById('btn-enviar');

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const nome = document.getElementById('nome').value;
                const link = document.getElementById('link').value;
                const comentario = document.getElementById('comentario').value;

                btnEnviar.disabled = true;
                btnEnviar.textContent = 'Enviando...';

                const sucesso = await this.adicionarComentario(nome, link, comentario);

                if (sucesso) {
                    form.reset();
                    alert('Comentário adicionado com sucesso!');
                } else {
                    alert('Erro ao adicionar comentário. Tente novamente.');
                }

                btnEnviar.disabled = false;
                btnEnviar.textContent = 'Enviar Comentário';
            });
        }
    }

    // Método para recarregar comentários manualmente
    async recarregar() {
        await this.carregarComentarios();
        this.renderizarComentarios();
    }
}

// Exportar para uso global
window.SistemaComentarios = SistemaComentarios;
