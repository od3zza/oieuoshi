////////////////////////////////////////////////////////////////////////////////////
// Variáveis globais para os dados e o filtro de tags
let glaspData = [];
let currentTag = "all";

document.addEventListener('DOMContentLoaded', function () {
    // --- FUNÇÕES GERAIS DE UTILIDADE ---
    function getPostSlug() {
        const path = window.location.pathname;
        return path.replace(/^\//, '').replace(/\/$/, '') || 'home';
    }

    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

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

        if (splitPos === -1) return;

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

        if (ref && toggleBtn) {
            ref.addEventListener('click', function (e) {
                e.stopPropagation();

                footnotes.forEach(other => {
                    if (other !== fn) {
                        other.classList.remove('active');
                        const otherToggleBtn = other.querySelector('.toggle-btn');
                        if (otherToggleBtn) otherToggleBtn.textContent = '[+]';
                    }
                });

                const isActive = fn.classList.toggle('active');
                toggleBtn.textContent = isActive ? '[-]' : '[+]';
            });
        }
    });

    // --- LÓGICA DO PAINEL DE TAGS E FILTRO DE ARTIGOS ---
    const openBlogTagsButton = document.getElementById('open-blog-tags-panel');
    const closeBlogTagsButton = document.getElementById('close-blog-tags-panel');
    const blogTagsPanel = document.getElementById('blog-tags-panel');
    const blogTagsList = document.getElementById('blog-tags-list');
    const articlesContainer = document.getElementById("articles-container");

    if (openBlogTagsButton && blogTagsPanel && closeBlogTagsButton) {
        openBlogTagsButton.addEventListener('click', () => blogTagsPanel.classList.add('open'));
        closeBlogTagsButton.addEventListener('click', () => blogTagsPanel.classList.remove('open'));
        document.addEventListener('click', (event) => {
            if (blogTagsPanel.classList.contains('open') &&
                !blogTagsPanel.contains(event.target) &&
                !openBlogTagsButton.contains(event.target)) {
                blogTagsPanel.classList.remove('open');
            }
        });
    }

    function renderArticles(data) {
        if (!articlesContainer) return;
        articlesContainer.innerHTML = "";

        if (data.length === 0) {
            articlesContainer.innerHTML = '<div class="empty-state">Nenhum artigo encontrado com os filtros atuais.</div>';
            return;
        }

        data.forEach(article => {
            const articleEl = document.createElement("div");
            articleEl.className = `article-card`;
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
                        ? `<div class="article-tags">${article.tags.map(tag => `<span class="article-tag">${tag}</span>`).join("")}</div>`
                        : ""
                    }
                    <div class="highlights-container">
                        ${
                            article.highlights && article.highlights.length > 0
                            ? article.highlights.map(h => `
                                <div class="highlight ${h.color ? h.color.toLowerCase() : ''}">
                                    <div class="highlight-text">${h.highlight}</div>
                                    ${h.highlight_note ? `<div class="highlight-note">${h.highlight_note}</div>` : ""}
                                </div>
                            `).join("")
                            : "<p>Nenhum highlight disponível para este artigo.</p>"
                        }
                    </div>
                    <a href="${article.url}" target="_blank" class="article-link">Ver artigo original →</a>
                </div>
            `;
            articlesContainer.appendChild(articleEl);
        });
    }

    function filterArticles() {
        let filteredData = [...glaspData];
        if (currentTag !== "all") {
            filteredData = filteredData.filter(article =>
                article.tags && article.tags.map(t => t.toLowerCase()).includes(currentTag)
            );
        }
        filteredData.sort((a, b) => new Date(b.date) - new Date(a.date));

        document.querySelectorAll(".blog-tags-list .tag").forEach(tagEl => {
            const tagValue = tagEl.dataset.tag;
            const isActive = (tagEl.textContent === "Ver tudo" && currentTag === "all") || (tagValue === currentTag);
            tagEl.classList.toggle("active", isActive);
        });

        renderArticles(filteredData);
    }

    async function fetchAndInitializeContent() {
        if (!blogTagsList || !articlesContainer) return;

        try {
            const response = await fetch('/lib/highlights.json');
            const data = await response.json();

            glaspData = data.map(item => ({
                ...item,
                tags: item.tags || [],
                highlights: item.highlights || []
            }));

            const allTags = new Set();
            glaspData.forEach(item => {
                if (item.tags && Array.isArray(item.tags)) item.tags.forEach(tag => allTags.add(tag.trim()));
            });

            const uniqueSortedTags = Array.from(allTags).sort((a, b) => a.localeCompare(b));

            blogTagsList.innerHTML = '';

            const allTagListItem = document.createElement('li');
            const allTagElement = document.createElement('span');
            allTagElement.classList.add('tag');
            allTagElement.textContent = "Ver tudo";
            allTagElement.dataset.tag = "all";
            allTagElement.addEventListener('click', () => {
                currentTag = "all";
                filterArticles();
                blogTagsPanel.classList.remove('open');
            });
            allTagListItem.appendChild(allTagElement);
            blogTagsList.appendChild(allTagListItem);

            uniqueSortedTags.forEach(tagText => {
                const listItem = document.createElement('li');
                const tagElement = document.createElement('span');
                tagElement.classList.add('tag');
                tagElement.textContent = tagText;
                tagElement.dataset.tag = tagText.toLowerCase().replace(/\s/g, '-');
                tagElement.addEventListener('click', () => {
                    currentTag = tagElement.dataset.tag;
                    filterArticles();
                    blogTagsPanel.classList.remove('open');
                });
                listItem.appendChild(tagElement);
                blogTagsList.appendChild(listItem);
            });

            filterArticles();

        } catch (error) {
            console.error('Erro ao carregar conteúdo:', error);
            articlesContainer.innerHTML = '<div class="empty-state">Erro ao carregar artigos.</div>';
            blogTagsList.innerHTML = '<li>Erro ao carregar tags.</li>';
        }
    }

    fetchAndInitializeContent();

    // --- FUNÇÃO FILTRO DE CATEGORIA ---
    function filtrarCategoria(categoria) {
        if (categoria === "todos") {
            document.querySelectorAll(".item").forEach(item => item.style.display = "block");
            return;
        }
        document.querySelectorAll(".item").forEach(item => item.style.display = "none");
        document.querySelectorAll(`[data-categoria="${categoria}"]`).forEach(item => item.style.display = "block");
    }

    // --- LÓGICA DO ACORDEÃO ---
    document.querySelectorAll(".accordion").forEach(acc => {
        acc.addEventListener("click", function () {
            this.classList.toggle("active");
            const panel = this.nextElementSibling;
            panel.style.display = panel.style.display === "block" ? "none" : "block";
        });
    });
});
