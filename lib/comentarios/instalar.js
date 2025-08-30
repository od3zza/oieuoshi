// /lib/comentarios/instalar.js
// Script para automatizar a instalação do sistema de comentários

class InstaladorComentarios {
    constructor() {
        this.arquivos = [
            'comentarios.js',
            'config.js', 
            'comentarios.css',
            'comentarios-temas.css',
            'utils.js',
            'comentarios-avancado.js'
        ];
    }

    // Verifica se todos os arquivos estão presentes
    async verificarArquivos() {
        const resultados = {};
        
        for (const arquivo of this.arquivos) {
            try {
                const response = await fetch(`/lib/comentarios/${arquivo}`);
                resultados[arquivo] = response.ok;
            } catch {
                resultados[arquivo] = false;
            }
        }
        
        return resultados;
    }

    // Detecta todas as páginas de blog no site
    async detectarPaginasBlog() {
        // Esta função precisaria ser adaptada para sua estrutura específica
        // Por enquanto, retorna um exemplo
        return [
            '/blog/tecnologia/minha-primeira-postagem.html',
            '/blog/design/cores-web-design.html',
            '/blog/tutorial/sistema-comentarios.html'
        ];
    }

    // Gera código HTML para inserir nas páginas
    gerarCodigoHTML(avancado = false) {
        const cssFiles = avancado 
            ? ['comentarios.css', 'comentarios-temas.css']
            : ['comentarios.css'];
            
        const jsFiles = avancado
            ? ['comentarios.js', 'utils.js', 'comentarios-avancado.js', 'config.js']
            : ['comentarios.js', 'config.js'];

        return `
<!-- Sistema de Comentários - Adicione antes do </head> -->
${cssFiles.map(file => `<link rel="stylesheet" href="/lib/comentarios/${file}">`).join('\n')}

<!-- Container dos comentários - Adicione onde quiser que apareçam -->
<section id="comentarios-container"></section>

<!-- Scripts dos comentários - Adicione antes do </body> -->
${jsFiles.map(file => `<script src="/lib/comentarios/${file}"></script>`).join('\n')}
        `.trim();
    }

    // Gera configuração personalizada
    gerarConfig(dados) {
        return `
// Configuração gerada automaticamente
const CONFIG_COMENTARIOS = {
    owner: '${dados.owner}',
    repo: '${dados.repo}',
    token: '${dados.token}',
    branch: '${dados.branch}',
    moderacao: ${dados.moderacao || false},
    adminToken: '${dados.adminToken || dados.token}'
};

// Auto-inicialização
function inicializarComentarios() {
    const path = window.location.pathname;
    
    if (!path.includes('/blog/')) return;

    const SistemaClass = window.SistemaComentariosAvancado || window.SistemaComentarios;
    const sistema = new SistemaClass(CONFIG_COMENTARIOS);
    sistema.inicializar(path);
    window.comentarios = sistema;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarComentarios);
} else {
    inicializarComentarios();
}
        `.trim();
    }

    // Interface de instalação
    criarInterfaceInstalacao() {
        const container = document.createElement('div');
        container.id = 'instalador-comentarios';
        container.innerHTML = `
            <div class="instalador-modal">
                <div class="instalador-content">
                    <h2>Configurar Sistema de Comentários</h2>
                    
                    <div class="instalador-step" id="step-1">
                        <h3>Passo 1: Configuração do GitHub</h3>
                        <form id="form-config">
                            <div class="form-group">
                                <label>Username GitHub:</label>
                                <input type="text" id="owner" required placeholder="seuusername">
                            </div>
                            
                            <div class="form-group">
                                <label>Nome do Repositório:</label>
                                <input type="text" id="repo" required placeholder="meu-blog">
                            </div>
                            
                            <div class="form-group">
                                <label>GitHub Token:</label>
                                <input type="password" id="token" required placeholder="ghp_...">
                                <small>Precisa de permissão 'repo' - <a href="https://github.com/settings/tokens" target="_blank">Criar token</a></small>
                            </div>
                            
                            <div class="form-group">
                                <label>Branch:</label>
                                <select id="branch">
                                    <option value="main">main</option>
                                    <option value="gh-pages">gh-pages</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="moderacao"> Ativar moderação
                                </label>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="avancado"> Usar sistema avançado
                                </label>
                            </div>
                            
                            <button type="submit">Continuar</button>
                        </form>
                    </div>
                    
                    <div class="instalador-step hidden" id="step-2">
                        <h3>Passo 2: Código para suas páginas</h3>
                        <p>Copie e cole este código em suas páginas de blog:</p>
                        <textarea id="codigo-html" readonly rows="10"></textarea>
                        <button id="copiar-codigo">Copiar Código</button>
                    </div>
                    
                    <div class="instalador-step hidden" id="step-3">
                        <h3>Passo 3: Arquivo de Configuração</h3>
                        <p>Salve este conteúdo como <code>/lib/comentarios/config.js</code>:</p>
                        <textarea id="config-js" readonly rows="15"></textarea>
                        <button id="copiar-config">Copiar Configuração</button>
                    </div>
                    
                    <div class="instalador-step hidden" id="step-4">
                        <h3>✅ Instalação Concluída!</h3>
                        <p>Sistema configurado com sucesso. Agora você pode:</p>
                        <ul>
                            <li>Adicionar o código HTML nas suas páginas de blog</li>
                            <li>Fazer upload dos arquivos para o GitHub</li>
                            <li>Testar em uma página de blog</li>
                        </ul>
                        <button id="fechar-instalador">Fechar</button>
                    </div>
                </div>
            </div>
        `;

        // Estilos do instalador
        const styles = `
            <style>
            .instalador-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            .instalador-content {
                background: white;
                padding: 2rem;
                border-radius: 8px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .instalador-step.hidden {
                display: none;
            }
            
            .instalador-content h2 {
                margin-top: 0;
                color: #2c3e50;
            }
            
            .instalador-content .form-group {
                margin-bottom: 1rem;
            }
            
            .instalador-content label {
                display: block;
                margin-bottom: 0.25rem;
                font-weight: 500;
            }
            
            .instalador-content input,
            .instalador-content select,
            .instalador-content textarea {
                width: 100%;
                padding: 0.5rem;
                border: 1px solid #ddd;
                border-radius: 4px;
                box-sizing: border-box;
            }
            
            .instalador-content button {
                background: #3498db;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 4px;
                cursor: pointer;
                margin: 0.5rem 0.5rem 0.5rem 0;
            }
            
            .instalador-content button:hover {
                background: #2980b9;
            }
            
            .instalador-content small {
                color: #666;
                font-size: 0.8rem;
            }
            
            .instalador-content code {
                background: #f1f1f1;
                padding: 0.1rem 0.3rem;
                border-radius: 3px;
                font-family: monospace;
            }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
        document.body.appendChild(container);

        this.configurarEventosInstalador();
    }

    // Configura eventos do instalador
    configurarEventosInstalador() {
        const form = document.getElementById('form-config');
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const dados = {
                owner: document.getElementById('owner').value,
                repo: document.getElementById('repo').value,
                token: document.getElementById('token').value,
                branch: document.getElementById('branch').value,
                moderacao: document.getElementById('moderacao').checked,
                avancado: document.getElementById('avancado').checked
            };

            this.processarConfiguracao(dados);
        });

        // Copiar código HTML
        document.addEventListener('click', (e) => {
            if (e.target.id === 'copiar-codigo') {
                const textarea = document.getElementById('codigo-html');
                ComentariosUtils.copiarTexto(textarea.value);
                alert('Código copiado!');
            }
            
            if (e.target.id === 'copiar-config') {
                const textarea = document.getElementById('config-js');
                ComentariosUtils.copiarTexto(textarea.value);
                alert('Configuração copiada!');
            }
            
            if (e.target.id === 'fechar-instalador') {
                document.getElementById('instalador-comentarios').remove();
            }
        });
    }

    // Processa a configuração e avança nos passos
    processarConfiguracao(dados) {
        // Esconder passo 1
        document.getElementById('step-1').classList.add('hidden');
        
        // Mostrar passo 2 com código HTML
        document.getElementById('step-2').classList.remove('hidden');
        document.getElementById('codigo-html').value = this.gerarCodigoHTML(dados.avancado);
        
        // Mostrar passo 3 com configuração
        document.getElementById('step-3').classList.remove('hidden');
        document.getElementById('config-js').value = this.gerarConfig(dados);
        
        // Mostrar passo final
        setTimeout(() => {
            document.getElementById('step-4').classList.remove('hidden');
        }, 1000);
    }

    // Teste de conectividade com GitHub
    async testarConexao(owner, repo, token) {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${owner}/${repo}`,
                {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            return {
                sucesso: response.ok,
                status: response.status,
                erro: response.ok ? null : 'Erro de autenticação ou repositório não encontrado'
            };
        } catch (error) {
            return {
                sucesso: false,
                erro: 'Erro de conexão: ' + error.message
            };
        }
    }

    // Inicia o processo de instalação
    async iniciar() {
        console.log('🚀 Iniciando instalação do sistema de comentários...');
        
        // Verificar se já está instalado
        const arquivos = await this.verificarArquivos();
        const jaInstalado = Object.values(arquivos).every(existe => existe);
        
        if (jaInstalado) {
            const reinstalar = confirm(
                'Sistema de comentários já parece estar instalado.\n\n' +
                'Deseja reconfigurar mesmo assim?'
            );
            if (!reinstalar) return;
        }
        
        this.criarInterfaceInstalacao();
    }
}

// Função de conveniência para iniciar instalação
function instalarSistemaComentarios() {
    const instalador = new InstaladorComentarios();
    instalador.iniciar();
}

// Auto-execução se chamado diretamente
if (window.location.search.includes('instalar-comentarios')) {
    document.addEventListener('DOMContentLoaded', instalarSistemaComentarios);
}

// Disponibilizar globalmente
window.InstaladorComentarios = InstaladorComentarios;
window.instalarSistemaComentarios = instalarSistemaComentarios;
