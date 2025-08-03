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

        if (splitPos === -1) {
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

        if (ref && toggleBtn) { // Adiciona verificação de existência
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
        }
    });

    // --- LÓGICA DO PAINEL DE TAGS E FILTRO DE ARTIGOS ---

    // Atualizado: IDs e classes para as novas nomenclaturas
    const openBlogTagsButton = document.getElementById('open-blog-tags-panel');
    const closeBlogTagsButton = document.getElementById('close-blog-tags-panel');
    const blogTagsPanel = document.getElementById('blog-tags-panel');
    const blogTagsList = document.getElementById('blog-tags-list');
    const articlesContainer = document.getElementById("articles-container"); // Referência ao contêiner de artigos

    // Lógica para abrir e fechar o painel
    if (openBlogTagsButton && blogTagsPanel && closeBlogTagsButton) {
        openBlogTagsButton.addEventListener('click', () => {
            blogTagsPanel.classList.add('open');
        });

        closeBlogTagsButton.addEventListener('click', () => {
            blogTagsPanel.classList.remove('open');
        });

        document.addEventListener('click', (event) => {
            if (blogTagsPanel.classList.contains('open') &&
                !blogTagsPanel.contains(event.target) &&
                !openBlogTagsButton.contains(event.target)) {
                blogTagsPanel.classList.remove('open');
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
            articleEl.className = `article-card`;
            articleEl.dataset.tags = JSON.stringify(article.tags || []);

            const formattedDate = new Date(article.date).toLocaleDateString("pt-BR");

            articleEl.innerHTML = `
                <div class="article-content">
                    <div class="article-header">
                        <h3 class="article-title">${escapeHtml(article.title)}</h3>
                        <div class="article-date">${formattedDate}</div>
                    </div>

                    ${
                        article.tags && article.tags.length > 0
                        ? `
                        <div class="article-tags">
                            ${article.tags
                                .map((tag) => `<span class="article-tag">${escapeHtml(tag)}</span>`)
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
                                <div class="highlight ${highlight.color ? escapeHtml(highlight.color.toLowerCase()) : ''}">
                                    <div class="highlight-text">${
                                        escapeHtml(highlight.highlight)
                                    }</div>
                                    ${
                                        highlight.highlight_note
                                            ? `<div class="highlight-note">${escapeHtml(highlight.highlight_note)}</div>`
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
                        escapeHtml(article.url)
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

        // Atualizado: Seletor para as novas classes do painel de tags
        document.querySelectorAll(".blog-tags-list .tag").forEach((tagEl) => {
            const tagValue = tagEl.dataset.tag;
            const isActive = (tagEl.textContent === "Ver tudo" && currentTag === "all") || (tagValue === currentTag);
            tagEl.classList.toggle("active", isActive);
        });

        renderArticles(filteredData);
    }

    // Função para buscar e gerar as tags e artigos iniciais do highlights.json
    async function fetchAndInitializeContent() {
        if (!blogTagsList || !articlesContainer) {
            console.warn("Elementos #blog-tags-list ou #articles-container não encontrados. O carregamento de conteúdo não será executado.");
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
            blogTagsList.innerHTML = ''; // Limpa a lista existente

            const allTagListItem = document.createElement('li');
            const allTagElement = document.createElement('span');
            allTagElement.classList.add('tag'); // Mantém a classe 'tag' para os estilos básicos
            allTagElement.textContent = "Ver tudo";
            allTagElement.dataset.tag = "all";
            allTagElement.addEventListener('click', () => {
                currentTag = "all";
                filterArticles();
                blogTagsPanel.classList.remove('open'); // Fecha o painel
            });
            allTagListItem.appendChild(allTagElement);
            blogTagsList.appendChild(allTagListItem);

            uniqueSortedTags.forEach(tagText => {
                const listItem = document.createElement('li');
                const tagElement = document.createElement('span');
                tagElement.classList.add('tag'); // Mantém a classe 'tag'
                tagElement.textContent = tagText;
                tagElement.dataset.tag = tagText.toLowerCase().replace(/\s/g, '-');

                tagElement.addEventListener('click', () => {
                    currentTag = tagElement.dataset.tag;
                    filterArticles();
                    blogTagsPanel.classList.remove('open'); // Fecha o painel
                });

                listItem.appendChild(tagElement);
                blogTagsList.appendChild(listItem);
            });
            
            filterArticles(); // Define a tag "Ver tudo" como ativa e renderiza todos os artigos

        } catch (error) {
            console.error('Erro ao buscar ou processar os dados:', error);
            if (articlesContainer) {
                articlesContainer.innerHTML = '<div class="empty-state">Erro ao carregar artigos.</div>';
            }
            if (blogTagsList) {
                blogTagsList.innerHTML = '<li>Erro ao carregar tags.</li>';
            }
        }
    }

    // Inicia o carregamento e inicialização do conteúdo principal
    fetchAndInitializeContent();

    // --- FUNÇÃO FILTRO DE CATEGORIA NO BLOG (verificar se ainda é usada) ---
    // Esta função foi mantida pois não está diretamente relacionada ao novo sistema de tags/painel
    // e pode ser para outra funcionalidade de filtro de "categoria" no blog.
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
    const SUPABASE_URL = 'https://mliaymjoccftbvcwjhwo.supabase.co'; // Verifique novamente essa URL, parece ter um 'ph' extra
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1saWF5bWpvY2NmdGJ2Y3dqaHdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMzk0NjMsImV4cCI6MjA2NzkxNTQ2M30.vvRuJUDsWBUHhkb0X8zCd9KLYdG5Evygm2SzqBpqvtA';

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

    // Helper function to escape HTML to prevent XSS
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async function loadComments() {
        const container = document.getElementById('comments-container');
        if (!container) return;
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
                const escapedNome = escapeHtml(comment.nome);
                const escapedComentario = escapeHtml(comment.comentario);
                const escapedLink = comment.link ? escapeHtml(comment.link) : null;
                
                const authorLink = escapedLink ?
                    `<a href="${escapedLink}" class="comment-author" target="_blank" rel="noopener">${escapedNome}</a>` :
                    `<span class="comment-author">${escapedNome}</span>`;

                return `
                    <div class="comment">
                        <div class="comment-header">
                            ${authorLink}
                            <span class="comment-date">${date}</span>
                        </div>
                        <p class="comment-text">${escapedComentario}</p>
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

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';
        }

        try {
            const commentData = {
                post_slug: getPostSlug(),
                nome: formData.get('nome').trim(),
                link: formData.get('link') ? formData.get('link').trim() : null,
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
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Comentário';
            }
        }
    }

    const commentForm = document.getElementById('comment-form');
    if (commentForm) {
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
