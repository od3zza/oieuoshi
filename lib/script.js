////////////////////////////////////////////////////////////////////////////////////
// Variáveis globais para os dados e o filtro de tags.
// Declaradas no topo do script para serem acessíveis por todas as funções.
let glaspData = []; // Armazena todos os dados de highlights.json
let currentTag = "all"; // A tag atualmente selecionada para filtro (padrão: "all" para ver tudo)

document.addEventListener('DOMContentLoaded', function () {
    // --- FUNÇÕES GERAIS DE UTILIDADE ---

    // Função para obter o slug do post atual (para comentários do Supabase)
    function getPostSlug() {
        const path = window.location.pathname;
        // Remove barras iniciais/finais e retorna 'home' se for a raiz
        return path.replace(/^\//, '').replace(/\/$/, '') || 'home';
    }

    // Função para validar URL (para formulário de comentários)
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Função para mostrar mensagens (sucesso/erro no formulário de comentários)
    function showMessage(message, type = 'success') {
        const messageArea = document.getElementById('message-area');
        if (messageArea) {
            messageArea.innerHTML = `<div class="${type}">${message}</div>`;
            setTimeout(() => {
                messageArea.innerHTML = '';
            }, 5000);
        }
    }

    // --- FUNÇÃO ANOTAÇÕES (NOTAS DE RODAPÉ) ---
    // Esta função foi colocada dentro do DOMContentLoaded para que possa acessar todos os elementos
    // e variáveis globais se necessário, e para garantir que o DOM está pronto.
    const getNoteColor = (num) => {
        const colors = [
            '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
            '#1abc9c', '#d35400', '#34495e', '#c0392b', '#27ae60'
        ];
        return colors[Number(num) % colors.length];
    };

    document.querySelectorAll('.note').forEach(note => {
        const noteContent = note.innerHTML;
        const splitPos = noteContent.indexOf('|');

        if (splitPos === -1) { // Garante que a nota tenha o formato esperado
            console.warn("Formato de nota inválido:", noteContent);
            return;
        }

        const num = noteContent.substring(0, splitPos).trim();
        const content = noteContent.substring(splitPos + 1).trim();
        const color = getNoteColor(num);

        note.innerHTML = `
            <span class="footnote-ref">
                <span class="footnote-number" style="color: ${color}">${num}</span>
                <sup class="toggle-btn" style="color: ${color}">[+]</sup>
            </span>
            <span class="footnote-text" style="border-left-color: ${color}">${content}</span>
        `;
        note.className = 'expanding-footnote';
    });

    const footnotes = document.querySelectorAll('.expanding-footnote');

    footnotes.forEach(fn => {
        const ref = fn.querySelector('.footnote-ref');
        const toggleBtn = fn.querySelector('.toggle-btn');

        ref.addEventListener('click', function (e) {
            e.stopPropagation();

            footnotes.forEach(other => {
                if (other !== fn) {
                    other.classList.remove('active');
                    const otherToggleBtn = other.querySelector('.toggle-btn');
                    if (otherToggleBtn) {
                        otherToggleBtn.textContent = '[+]';
                    }
                }
            });

            const isActive = fn.classList.toggle('active');
            toggleBtn.textContent = isActive ? '[-]' : '[+]';
        });
    });

    // --- LÓGICA DO PAINEL DE TAGS E FILTRO DE ARTIGOS ---

    const openTagsButton = document.getElementById('open-tags-panel');
    const closeTagsButton = document.getElementById('close-tags-panel');
    const tagsSidebar = document.getElementById('tags-sidebar');
    const tagsList = document.getElementById('tags-list');
    const articlesContainer = document.getElementById("articles-container"); // Referência ao contêiner de artigos

    // Lógica para abrir e fechar o painel
    if (openTagsButton && tagsSidebar && closeTagsButton) { // Garante que os elementos existem
        openTagsButton.addEventListener('click', () => {
            tagsSidebar.classList.add('open');
        });

        closeTagsButton.addEventListener('click', () => {
            tagsSidebar.classList.remove('open');
        });

        // Fechar o painel ao clicar fora dele
        document.addEventListener('click', (event) => {
            if (tagsSidebar.classList.contains('open') &&
                !tagsSidebar.contains(event.target) &&
                !openTagsButton.contains(event.target)) {
                tagsSidebar.classList.remove('open');
            }
        });
    }

    // Função para renderizar os artigos
    function renderArticles(data) {
        if (!articlesContainer) {
            console.warn("Elemento #articles-container não encontrado. A função renderArticles não será executada.");
            return;
        }
        articlesContainer.innerHTML = "";

        if (data.length === 0) {
            articlesContainer.innerHTML =
                '<div class="empty-state">Nenhum artigo encontrado com os filtros atuais.</div>';
            return;
        }

        data.forEach((article) => {
            const articleEl = document.createElement("div");
            articleEl.className = `article-card`; // Removido 'hidden' aqui, pois filterArticles já passa dados filtrados
            articleEl.dataset.tags = JSON.stringify(article.tags || []);

            const formattedDate = new Date(article.date).toLocaleDateString("pt-BR");

            articleEl.innerHTML = `
                <div class="article-content">
                    <div class="article-header">
                        <h3 class="article-title">${article.title}</h3>
                        <div class="article-date">${formattedDate}</div>
                    </div>

                    ${
                        article.tags && article.tags.length > 0
                        ? `
                        <div class="article-tags">
                            ${article.tags
                                .map((tag) => `<span class="article-tag">${tag}</span>`)
                                .join("")}
                        </div>
                        `
                        : ""
                    }

                    <div class="highlights-container">
                        ${
                            article.highlights && article.highlights.length > 0
                            ? article.highlights
                                .map(
                                    (highlight) => `
                                <div class="highlight ${highlight.color ? highlight.color.toLowerCase() : ''}">
                                    <div class="highlight-text">${
                                        highlight.highlight
                                    }</div>
                                    ${
                                        highlight.highlight_note
                                            ? `<div class="highlight-note">${highlight.highlight_note}</div>`
                                            : ""
                                    }
                                </div>
                                `
                                )
                                .join("")
                            : "<p>Nenhum highlight disponível para este artigo.</p>"
                        }
                    </div>

                    <a href="${
                        article.url
                    }" target="_blank" class="article-link">Ver artigo original →</a>
                </div>
            `;
            articlesContainer.appendChild(articleEl);
        });
    }

    // Função para filtrar os artigos por tag
    function filterArticles() {
        let filteredData = [...glaspData];

        if (currentTag !== "all") {
            filteredData = filteredData.filter(
                (article) => article.tags && article.tags.map(t => t.toLowerCase()).includes(currentTag)
            );
        }

        filteredData.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Atualiza o estado ativo das tags no PAINEL LATERAL
        document.querySelectorAll(".tags-list .tag").forEach((tagEl) => {
            const tagValue = tagEl.dataset.tag;
            const isActive = (tagEl.textContent === "Ver tudo" && currentTag === "all") || (tagValue === currentTag);
            tagEl.classList.toggle("active", isActive);
        });

        renderArticles(filteredData);
    }

    // Função para buscar e gerar as tags e artigos iniciais do highlights.json
    async function fetchAndInitializeContent() {
        if (!tagsList || !articlesContainer) {
            console.warn("Elementos #tags-list ou #articles-container não encontrados. O carregamento de conteúdo não será executado.");
            return;
        }

        try {
            const response = await fetch('/lib/highlights.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            glaspData = data.map((item) => ({
                ...item,
                tags: item.tags || [],
                highlights: item.highlights || [],
            }));

            const allTags = new Set();
            glaspData.forEach(item => {
                if (item.tags && Array.isArray(item.tags)) {
                    item.tags.forEach(tag => allTags.add(tag.trim()));
                }
            });

            const uniqueSortedTags = Array.from(allTags).sort((a, b) => a.localeCompare(b));

            // Gera as tags no painel lateral, incluindo "Ver tudo"
            tagsList.innerHTML = ''; // Limpa a lista existente

            const allTagListItem = document.createElement('li');
            const allTagElement = document.createElement('span');
            allTagElement.classList.add('tag');
            allTagElement.textContent = "Ver tudo";
            allTagElement.dataset.tag = "all";
            allTagElement.addEventListener('click', () => {
                currentTag = "all";
                filterArticles();
                tagsSidebar.classList.remove('open');
            });
            allTagListItem.appendChild(allTagElement);
            tagsList.appendChild(allTagListItem);

            uniqueSortedTags.forEach(tagText => {
                const listItem = document.createElement('li');
                const tagElement = document.createElement('span');
                tagElement.classList.add('tag');
                tagElement.textContent = tagText;
                tagElement.dataset.tag = tagText.toLowerCase().replace(/\s/g, '-');

                tagElement.addEventListener('click', () => {
                    currentTag = tagElement.dataset.tag;
                    filterArticles();
                    tagsSidebar.classList.remove('open');
                });

                listItem.appendChild(tagElement);
                tagsList.appendChild(listItem);
            });
            
            // Define a tag "Ver tudo" como ativa e renderiza todos os artigos inicialmente
            filterArticles(); // Isso chamará renderArticles com todos os dados e ativará "Ver tudo"

        } catch (error) {
            console.error('Erro ao buscar ou processar os dados:', error);
            if (articlesContainer) {
                articlesContainer.innerHTML = '<div class="empty-state">Erro ao carregar artigos.</div>';
            }
            if (tagsList) {
                tagsList.innerHTML = '<li>Erro ao carregar tags.</li>';
            }
        }
    }

    // Inicia o carregamento e inicialização do conteúdo principal
    fetchAndInitializeContent();

    // --- FUNÇÃO FILTRO DE CATEGORIA NO BLOG (função antiga, verificar se ainda é usada) ---
    // Se essa função não for mais usada para o novo sistema de tags, você pode removê-la.
    // Se for usada para outras categorizações, certifique-se de que não conflita com o filtro de tags.
    function filtrarCategoria(categoria) {
        if (categoria === "todos") {
            document.querySelectorAll(".item").forEach((item) => {
                item.style.display = "block";
            });
            return;
        }

        document.querySelectorAll(".item").forEach((item) => {
            item.style.display = "none";
        });

        document
            .querySelectorAll(`[data-categoria="${categoria}"]`)
            .forEach((item) => {
                item.style.display = "block";
            });
    }

    // --- INTEGRAÇÃO COM SUPABASE PARA COMENTÁRIOS ---
    const SUPABASE_URL = 'https://emoqyenkhphvmpsmoyzl.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtb3F5ZW5raHBodm1wc21veXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3ODU2ODEsImV4cCI6MjA2NjM2MTY4MX0.wtPcNxGM750fDbYbyXiSG4QFDbiokoqbTfVjfq-tqHs';

    async function supabaseRequest(endpoint, options = {}) {
        const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
        const headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            ...options.headers
        };

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }
        return response.json();
    }

    async function loadComments() {
        const container = document.getElementById('comments-container');
        if (!container) return; // Adicionado: se o container não existe, não faz nada
        const postSlug = getPostSlug();

        try {
            const comments = await supabaseRequest(
                `comentarios?post_slug=eq.${postSlug}&order=created_at.desc`
            );

            if (comments.length === 0) {
                container.innerHTML = '<div class="no-comments">Ainda não há comentários. Seja o primeiro!</div>';
                return;
            }

            container.innerHTML = comments.map(comment => {
                const date = new Date(comment.created_at).toLocaleString('pt-BR');
                const authorLink = comment.link ?
                    `<a href="${comment.link}" class="comment-author" target="_blank" rel="noopener">${comment.nome}</a>` :
                    `<span class="comment-author">${comment.nome}</span>`;

                return `
                    <div class="comment">
                        <div class="comment-header">
                            ${authorLink}
                            <span class="comment-date">${date}</span>
                        </div>
                        <p class="comment-text">${comment.comentario}</p>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Erro ao carregar comentários:', error);
            container.innerHTML = '<div class="error">Erro ao carregar comentários. Tente recarregar a página.</div>';
        }
    }

    async function submitComment(event) {
        event.preventDefault();

        const form = event.target;
        const submitBtn = form.querySelector('.btn-submit');
        const formData = new FormData(form);

        if (submitBtn) { // Verifica se o botão existe antes de manipular
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';
        }

        try {
            const commentData = {
                post_slug: getPostSlug(),
                nome: formData.get('nome').trim(),
                link: formData.get('link') ? formData.get('link').trim() : null, // Garante que link é null se vazio
                comentario: formData.get('comentario').trim()
            };

            if (!commentData.nome || !commentData.comentario) {
                throw new Error('Nome e comentário são obrigatórios.');
            }

            if (commentData.link && !isValidUrl(commentData.link)) {
                throw new Error('Por favor, insira uma URL válida.');
            }

            await supabaseRequest('comentarios', {
                method: 'POST',
                body: JSON.stringify(commentData)
            });

            showMessage('Comentário enviado com sucesso!', 'success');
            form.reset();
            loadComments();

        } catch (error) {
            console.error('Erro ao enviar comentário:', error);
            showMessage(error.message || 'Erro ao enviar comentário. Tente novamente.', 'error');
        } finally {
            if (submitBtn) { // Verifica novamente antes de reabilitar
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Comentário';
            }
        }
    }

    // Inicialização dos comentários do Supabase
    const commentForm = document.getElementById('comment-form');
    if (commentForm) { // Verifica se o formulário existe
        loadComments();
        commentForm.addEventListener('submit', submitComment);
    }

    // --- LÓGICA DO ACORDEÃO ---
    var acc = document.getElementsByClassName("accordion");
    for (var i = 0; i < acc.length; i++) {
        acc[i].addEventListener("click", function () {
            this.classList.toggle("active");
            var panel = this.nextElementSibling;
            if (panel.style.display === "block") {
                panel.style.display = "none";
            } else {
                panel.style.display = "block";
            }
        });
    }

}); // Fim do DOMContentLoaded
