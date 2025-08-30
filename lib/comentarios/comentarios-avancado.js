// /lib/comentarios/comentarios-avancado.js
// Versão avançada com moderação e funcionalidades extras

class SistemaComentariosAvancado extends SistemaComentarios {
    constructor(config) {
        super(config);
        this.moderacao = config.moderacao || false;
        this.adminToken = config.adminToken || null;
        this.rateLimiter = ComentariosUtils.criarRateLimiter(3, 300000); // 3 comentários por 5min
    }

    // Override do método de adicionar comentário com moderação
    async adicionarComentario(nome, link, comentario) {
        // Rate limiting
        if (!this.rateLimiter()) {
            alert('Muitos comentários em pouco tempo. Aguarde alguns minutos.');
            return false;
        }

        // Validação avançada
        const validacao = ComentariosUtils.validarComentario({
            nome, link, comentario
        });

        if (!validacao.valido) {
            alert('Erros encontrados:\n' + validacao.erros.join('\n'));
            return false;
        }

        const novoComentario = {
            id: ComentariosUtils.gerarId(),
            nome: ComentariosUtils.sanitizarTexto(nome),
            link: link.trim() || null,
            comentario: ComentariosUtils.sanitizarTexto(comentario),
            data: new Date().toISOString(),
            aprovado: !this.moderacao, // Se moderação ativa, aguarda aprovação
            ip: await this.obterIP(), // Para tracking básico
            userAgent: navigator.userAgent.substring(0, 100)
        };

        await this.carregarComentarios();
        
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
            if (novoComentario.aprovado) {
                this.comentarios.unshift(novoComentario);
                this.renderizarComentarios();
            } else {
                alert('Comentário enviado para moderação!');
            }
            return true;
        }
        
        return false;
    }

    // Obter IP do usuário (básico)
    async obterIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch {
            return 'unknown';
        }
    }

    // Override da renderização para incluir botões de admin
    renderizarComentarios() {
        const lista = document.getElementById('comentarios-lista');
        if (!lista) return;

        // Filtrar apenas comentários aprovados para usuários normais
        const comentariosVisiveis = this.isAdmin() 
            ? this.comentarios 
            : this.comentarios.filter(c => c.aprovado);

        if (comentariosVisiveis.length === 0) {
            lista.innerHTML = '<p class="sem-comentarios">Seja o primeiro a comentar!</p>';
            return;
        }

        const comentariosHtml = comentariosVisiveis.map(comentario => {
            const data = ComentariosUtils.formatarData(comentario.data);
            const nomeHtml = comentario.link 
                ? `<a href="${comentario.link}" target="_blank" rel="nofollow">${comentario.nome}</a>`
                : comentario.nome;

            const statusClass = comentario.aprovado ? '' : 'comentario-pendente';
            const adminControls = this.isAdmin() ? this.renderizarControlesAdmin(comentario) : '';

            return `
                <div class="comentario ${statusClass}" data-id="${comentario.id}">
                    <div class="comentario-header">
                        <strong class="comentario-nome">${nomeHtml}</strong>
                        <span class="comentario-data">${data}</span>
                        ${!comentario.aprovado ? '<span class="status-pendente">Pendente</span>' : ''}
                    </div>
                    <div class="comentario-texto">${ComentariosUtils.markdownSimples(comentario.comentario)}</div>
                    ${adminControls}
                </div>
            `;
        }).join('');

        lista.innerHTML = comentariosHtml;
        
        if (this.isAdmin()) {
            this.configurarEventosAdmin();
        }
    }

    // Renderiza controles de administrador
    renderizarControlesAdmin(comentario) {
        return `
            <div class="admin-controls">
                ${!comentario.aprovado ? 
                    `<button class="btn-aprovar" data-id="${comentario.id}">Aprovar</button>` : 
                    `<button class="btn-desaprovar" data-id="${comentario.id}">Desaprovar</button>`
                }
                <button class="btn-excluir" data-id="${comentario.id}">Excluir</button>
                <button class="btn-info" data-id="${comentario.id}">Info</button>
            </div>
        `;
    }

    // Verifica se é administrador
    isAdmin() {
        return this.adminToken && this.config.token === this.adminToken;
    }

    // Configura eventos de administração
    configurarEventosAdmin() {
        // Aprovação
        document.querySelectorAll('.btn-aprovar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.alterarStatusComentario(id, true);
            });
        });

        // Desaprovação
        document.querySelectorAll('.btn-desaprovar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.alterarStatusComentario(id, false);
            });
        });

        // Exclusão
        document.querySelectorAll('.btn-excluir').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                if (confirm('Tem certeza que deseja excluir este comentário?')) {
                    this.excluirComentario(id);
                }
            });
        });

        // Informações
        document.querySelectorAll('.btn-info').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.mostrarInfoComentario(id);
            });
        });
    }

    // Altera status de aprovação do comentário
    async alterarStatusComentario(id, aprovado) {
        await this.carregarComentarios();
        
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
            this.sha = data.sha;

            if (todosComentarios[this.postPath]) {
                const comentario = todosComentarios[this.postPath].find(c => c.id === id);
                if (comentario) {
                    comentario.aprovado = aprovado;
                    
                    const sucesso = await this.salvarComentarios(todosComentarios);
                    if (sucesso) {
                        await this.carregarComentarios();
                        this.renderizarComentarios();
                    }
                }
            }
        }
    }

    // Exclui comentário
    async excluirComentario(id) {
        await this.carregarComentarios();
        
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
            this.sha = data.sha;

            if (todosComentarios[this.postPath]) {
                todosComentarios[this.postPath] = todosComentarios[this.postPath]
                    .filter(c => c.id !== id);
                
                const sucesso = await this.salvarComentarios(todosComentarios);
                if (sucesso) {
                    await this.carregarComentarios();
                    this.renderizarComentarios();
                }
            }
        }
    }

    // Mostra informações detalhadas do comentário
    mostrarInfoComentario(id) {
        const comentario = this.comentarios.find(c => c.id === id);
        if (!comentario) return;

        const info = `
ID: ${comentario.id}
Nome: ${comentario.nome}
Link: ${comentario.link || 'Não informado'}
Data: ${new Date(comentario.data).toLocaleString('pt-BR')}
Status: ${comentario.aprovado ? 'Aprovado' : 'Pendente'}
IP: ${comentario.ip || 'Não disponível'}
User Agent: ${comentario.userAgent || 'Não disponível'}
Palavras: ${ComentariosUtils.contarPalavras(comentario.comentario)}
        `.trim();

        alert(info);
    }

    // Painel de administração
    renderizarPainelAdmin() {
        if (!this.isAdmin()) return;

        const painel = document.createElement('div');
        painel.className = 'admin-panel';
        painel.innerHTML = `
            <h4>Painel Administrativo</h4>
            <div class="admin-stats">
                <button id="btn-stats">Ver Estatísticas</button>
                <button id="btn-export">Exportar CSV</button>
                <button id="btn-backup">Fazer Backup</button>
            </div>
        `;

        const container = document.getElementById('comentarios-container');
        container.insertBefore(painel, container.firstChild);

        // Eventos do painel
        document.getElementById('btn-stats')?.addEventListener('click', () => {
            this.mostrarEstatisticas();
        });

        document.getElementById('btn-export')?.addEventListener('click', () => {
            this.exportarTodosComentarios();
        });

        document.getElementById('btn-backup')?.addEventListener('click', () => {
            this.fazerBackup();
        });
    }

    // Mostra estatísticas
    async mostrarEstatisticas() {
        await this.carregarTodosComentarios();
        const stats = ComentariosUtils.gerarEstatisticas(this.todosComentarios);
        
        alert(`
Estatísticas do Blog:
• Total de comentários: ${stats.totalComentarios}
• Posts com comentários: ${stats.totalPosts}
• Comentários recentes (7 dias): ${stats.comentariosRecentes}
• Média por post: ${stats.mediaComentariosPorPost}
        `);
    }

    // Carrega todos os comentários (para admin)
    async carregarTodosComentarios() {
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
            this.todosComentarios = JSON.parse(conteudo);
        }
    }

    // Exporta todos os comentários
    async exportarTodosComentarios() {
        await this.carregarTodosComentarios();
        ComentariosUtils.exportarCSV(this.todosComentarios);
    }

    // Faz backup dos comentários
    async fazerBackup() {
        await this.carregarTodosComentarios();
        const backup = {
            data: new Date().toISOString(),
            comentarios: this.todosComentarios
        };
        
        const blob = new Blob([JSON.stringify(backup, null, 2)], { 
            type: 'application/json' 
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `backup-comentarios-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    // Override da inicialização para incluir painel admin
    async inicializar(postPath) {
        await super.inicializar(postPath);
        if (this.isAdmin()) {
            this.renderizarPainelAdmin();
        }
    }
}

// Sistema de notificações (webhook simples)
class NotificacaoComentarios {
    constructor(webhookUrl) {
        this.webhookUrl = webhookUrl;
    }

    // Envia notificação para webhook (Discord, Slack, etc)
    async notificar(comentario, post) {
        if (!this.webhookUrl) return;

        const payload = {
            text: `Novo comentário no blog!`,
            attachments: [{
                color: 'good',
                fields: [
                    { title: 'Post', value: post, short: true },
                    { title: 'Autor', value: comentario.nome, short: true },
                    { title: 'Comentário', value: comentario.comentario.substring(0, 100) + '...', short: false }
                ],
                footer: 'Sistema de Comentários',
                ts: Math.floor(Date.now() / 1000)
            }]
        };

        try {
            await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Erro ao enviar notificação:', error);
        }
    }
}

// Widget de comentários recentes para sidebar
class WidgetComentariosRecentes {
    constructor(sistema, limite = 5) {
        this.sistema = sistema;
        this.limite = limite;
    }

    async renderizar(containerId) {
        await this.sistema.carregarTodosComentarios();
        
        const todosComentarios = [];
        Object.entries(this.sistema.todosComentarios).forEach(([post, comentarios]) => {
            comentarios.forEach(comentario => {
                if (comentario.aprovado) {
                    todosComentarios.push({ ...comentario, post });
                }
            });
        });

        // Ordenar por data (mais recentes primeiro)
        todosComentarios.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        const recentes = todosComentarios.slice(0, this.limite);
        
        const container = document.getElementById(containerId);
        if (!container) return;

        const html = `
            <div class="widget-comentarios-recentes">
                <h3>Comentários Recentes</h3>
                ${recentes.map(comentario => `
                    <div class="comentario-recente">
                        <div class="comentario-autor">${comentario.nome}</div>
                        <div class="comentario-preview">
                            ${ComentariosUtils.truncarTexto(comentario.comentario, 60)}
                        </div>
                        <div class="comentario-post">
                            <a href="${comentario.post}">${this.extrairTituloPost(comentario.post)}</a>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        container.innerHTML = html;
    }

    extrairTituloPost(path) {
        return path.split('/').pop().replace(/-/g, ' ').replace(/\.html$/, '');
    }
}

// Disponibilizar globalmente
window.SistemaComentariosAvancado = SistemaComentariosAvancado;
window.NotificacaoComentarios = NotificacaoComentarios;
window.WidgetComentariosRecentes = WidgetComentariosRecentes;
