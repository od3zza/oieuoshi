// /lib/comentarios/config.js

// Configuração do sistema de comentários
const CONFIG_COMENTARIOS = {
    // IMPORTANTE: Substitua pelos seus dados
    owner: 'od3zza',    // Ex: 'joaosilva'
    repo: 'oieuoshi',         // Ex: 'meu-blog'
    token: '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',       // Personal Access Token
    branch: 'main'                   // ou 'gh-pages' se usar GitHub Pages
};

// Função para inicializar comentários em uma página
function inicializarComentarios() {
    // Detecta automaticamente o path da postagem baseado na URL
    const path = window.location.pathname;
    
    // Verifica se estamos em uma página de blog
    if (!path.includes('/blog/')) {
        console.log('Sistema de comentários não carregado - não é uma página de blog');
        return;
    }

    // Cria instância do sistema
    const sistema = new SistemaComentarios(CONFIG_COMENTARIOS);
    
    // Inicializa com o path da postagem atual
    sistema.inicializar(path);
    
    // Disponibiliza globalmente para debug
    window.comentarios = sistema;
}

// Aguarda o DOM carregar para inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarComentarios);
} else {
    inicializarComentarios();
}

/* 
INSTRUÇÕES PARA CONFIGURAÇÃO:

1. GITHUB TOKEN:
   - Acesse: https://github.com/settings/tokens
   - Clique em "Generate new token (classic)"
   - Dê um nome como "Blog Comments"
   - Selecione as permissões: 'repo' (acesso completo ao repositório)
   - Copie o token gerado e substitua 'SEU_GITHUB_TOKEN'

2. CONFIGURAÇÃO:
   - Substitua 'SEU_USERNAME_GITHUB' pelo seu username
   - Substitua 'SEU_REPOSITORIO' pelo nome do seu repositório
   - Se usar GitHub Pages, talvez precise mudar 'main' para 'gh-pages'

3. SEGURANÇA:
   - NUNCA commite o token diretamente no código
   - Use variáveis de ambiente ou arquivo de config separado
   - Considere usar GitHub Apps para mais segurança

4. ESTRUTURA DE PASTAS:
   /lib/comentarios/
   ├── comentarios.js
   ├── config.js
   ├── comentarios.css
   └── comentarios.json (será criado automaticamente)
*/
