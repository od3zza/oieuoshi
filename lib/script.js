////////////////////////////////////////////////////////////////////////////////////
/* Função Anotações (notas de rodapé nos textos do blog) */
document.addEventListener('DOMContentLoaded', function() {
  // Cores baseadas no número da nota (hash simples)
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

  // Restante do código de toggle permanece igual
  const footnotes = document.querySelectorAll('.expanding-footnote');
  
  footnotes.forEach(fn => {
    const ref = fn.querySelector('.footnote-ref');
    const toggleBtn = fn.querySelector('.toggle-btn');
    
    ref.addEventListener('click', function(e) {
      e.stopPropagation();
      
      footnotes.forEach(other => {
        if (other !== fn) {
          other.classList.remove('active');
          other.querySelector('.toggle-btn').textContent = '[+]';
        }
      });
      
      const isActive = fn.classList.toggle('active');
      toggleBtn.textContent = isActive ? '[-]' : '[+]';
    });
  });
});



//////////////////////////////////////////////////////////////////////////////////////
/* Notas em highlights (páginas NOTAS)*/
const glaspData = []; // Seu JSON será colocado aqui
let currentTag = "all"; // Valor interno mantido como 'all'

// Função para renderizar as tags
function renderTags() {
  const tagsContainer = document.getElementById("tags-container");
  if (!tagsContainer) { // Adiciona esta verificação
    console.warn("Elemento #tags-container não encontrado. A função renderTags não será executada.");
    return;
  }
  tagsContainer.innerHTML = "";

  // Extrai todas as tags únicas dos dados completos
  const allTags = new Set(["Ver tudo"]); // Exibição "Ver tudo" para o usuário
  glaspData.forEach((article) => {
    if (article.tags && article.tags.length > 0) {
      article.tags.forEach((tag) => allTags.add(tag));
    }
  });

  // Renderiza as tags
  allTags.forEach((tag) => {
    const tagValue = tag === "Ver tudo" ? "all" : tag; // 'all' é o valor interno
    const isActive =
      (tag === "Ver tudo" && currentTag === "all") || tagValue === currentTag;

    tagsContainer.innerHTML += `
            <div class="tag ${isActive ? "active" : ""}" data-tag="${tagValue}">
                ${tag}
            </div>
        `;
  });

  // Adiciona event listeners para as tags
  document.querySelectorAll(".tag").forEach((tag) => {
    tag.addEventListener("click", () => {
      currentTag = tag.dataset.tag; // Recebe 'all' para "Ver tudo"
      filterArticles();
    });
  });
}

// Função para renderizar os artigos
function renderArticles(data) {
  const container = document.getElementById("articles-container");
  if (!container) { // Adiciona esta verificação
    console.warn("Elemento #articles-container não encontrado. A função renderArticles não será executada.");
    return;
  }
  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML =
      '<div class="empty-state">Nenhum artigo encontrado com os filtros atuais.</div>';
    return;
  }

  // Renderiza os artigos
  data.forEach((article) => {
    const articleEl = document.createElement("div");
    const shouldShow =
      currentTag === "all" ||
      (article.tags && article.tags.includes(currentTag));

    articleEl.className = `article-card ${shouldShow ? "" : "hidden"}`;
    articleEl.dataset.tags = JSON.stringify(article.tags || []);

    // Formata a data
    const formattedDate = new Date(article.date).toLocaleDateString("pt-BR");

    // Cria os elementos do card
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
                          .map(
                            (tag) => `<span class="article-tag">${tag}</span>`
                          )
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
                            <div class="highlight ${highlight.color.toLowerCase()}">
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

    container.appendChild(articleEl);
  });
}

// Função para filtrar os artigos por tag
function filterArticles() {
  let filteredData = [...glaspData];

  // Filtra por tag se não for 'all' (valor interno)
  if (currentTag !== "all") {
    filteredData = filteredData.filter(
      (article) => article.tags && article.tags.includes(currentTag)
    );
  }

  // Ordena por data mais recente primeiro
  filteredData.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Atualiza o estado ativo das tags
  document.querySelectorAll(".tag").forEach((tag) => {
    const tagValue = tag.dataset.tag;
    const isActive =
      (tag.textContent === "Ver tudo" && currentTag === "all") ||
      tagValue === currentTag;
    tag.classList.toggle("active", isActive);
  });

  // Renderiza os artigos filtrados
  renderArticles(filteredData);
}

// Carrega os dados e renderiza apenas se os elementos existirem
if (document.getElementById("tags-container") || document.getElementById("articles-container")) {
  fetch("/lib/highlights.json")
    .then((response) => response.json())
    .then((data) => {
      const processedData = data.map((item) => ({
        ...item,
        tags: item.tags || [],
        highlights: item.highlights || [],
      }));

      glaspData.push(...processedData);
      renderTags();
      renderArticles(processedData);
    })
    .catch((error) => {
      console.error("Erro ao carregar os dados:", error);
    });
}

////////////////////////////////////////////////////////////////////////////////////
/* Pop-up de anotações
window.addEventListener("DOMContentLoaded", () => {
  // Obter todas as notas
  document.querySelectorAll(".note").forEach((note, index) => {
    const noteContent = note.dataset.note;
    const noteNumber = index + 1; // Usar o índice para gerar o número da nota (1, 2, 3...)

    // Adicionar o número da nota como data-note-number
    note.setAttribute("data-note-number", noteNumber);

    // Inserir conteúdo no footer
    const footer = document.querySelector(".footer");
    const footerNote = document.createElement("div");
    footerNote.classList.add("footer-note");

    footerNote.innerHTML = `<span class="note-number">${noteNumber}</span> ${noteContent} 
        <a href="#note-${noteNumber}" class="back-to-note">↩</a>`; // Link clicável
    footer.appendChild(footerNote);

    // Adicionar ID à nota para permitir o link de retorno
    note.setAttribute("id", `note-${noteNumber}`);

    // Criar pop-up (opcional)
    note.addEventListener("click", function (event) {
      if (document.querySelector(".popup")) return; // Não criar novo popup se já existir

      const popup = document.createElement("div");
      popup.classList.add("popup");

      const popupText = document.createElement("div");
      popupText.innerHTML = noteContent;

      const closeButton = document.createElement("span");
      closeButton.classList.add("close");
      closeButton.innerHTML = "X";
      closeButton.onclick = () => popup.remove();

      popup.appendChild(popupText);
      popup.appendChild(closeButton);
      document.body.appendChild(popup);

      popup.style.display = "block";
     popup.style.left = `${event.pageX - popup.offsetWidth / 2}px`; // Centraliza horizontalmente
popup.style.top = `${event.pageY - 50}px`; // Desloca 50px para cima (ajuste conforme necessário)
      
      // Fechar pop-up ao clicar fora dela
      document.addEventListener("click", function closePopup(event) {
        if (!popup.contains(event.target) && !note.contains(event.target)) {
          popup.remove();
          document.removeEventListener("click", closePopup); // Remover o ouvinte de evento
        }
      });
    });
  });
});
 ______ Não está mais ativo */

///////////////////////////////////////////////////////////////////////////////////
/* Dark Mode 
$(".inner-switch").on("click", function () {
  $("body").toggleClass("dark");
  if ($("body").hasClass("dark")) {
    $(".inner-switch").text("🌞");
  } else {
    $(".inner-switch").text("🌚");
  }
});  ______ Não está mais ativo */

////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////
/* Acordeão */
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

////////////////////////////////////////////////////////////////////////////////////
/* Pop-up de anotações  
window.addEventListener("DOMContentLoaded", () => {
  // Obter todas as notas
  document.querySelectorAll(".note").forEach((note, index) => {
    const noteContent = note.dataset.note;
    const noteNumber = index + 1; // Usar o índice para gerar o número da nota (1, 2, 3...)

    // Adicionar o número da nota como data-note-number
    note.setAttribute("data-note-number", noteNumber);

    // Inserir conteúdo no footer
    const footer = document.querySelector(".footer");
    const footerNote = document.createElement("div");
    footerNote.classList.add("footer-note");

    footerNote.innerHTML = `<span class="note-number">${noteNumber}</span> ${noteContent} 
        <a href="#note-${noteNumber}" class="back-to-note">↩</a>`; // Link clicável
    footer.appendChild(footerNote);

    // Adicionar ID à nota para permitir o link de retorno
    note.setAttribute("id", `note-${noteNumber}`);

    // Criar pop-up (opcional)
    note.addEventListener("click", function (event) {
      if (document.querySelector(".popup")) return; // Não criar novo popup se já existir

      const popup = document.createElement("div");
      popup.classList.add("popup");

      const popupText = document.createElement("div");
      popupText.innerHTML = noteContent;

      const closeButton = document.createElement("span");
      closeButton.classList.add("close");
      closeButton.innerHTML = "X";
      closeButton.onclick = () => popup.remove();

      popup.appendChild(popupText);
      popup.appendChild(closeButton);
      document.body.appendChild(popup);

      popup.style.display = "block";
      popup.style.left = `${event.pageX - popup.offsetWidth / 2}px`; // Centraliza horizontalmente
      popup.style.top = `${event.pageY - 50}px`; // Desloca 50px para cima (ajuste conforme necessário)

      // Fechar pop-up ao clicar fora dela
      document.addEventListener("click", function closePopup(event) {
        if (!popup.contains(event.target) && !note.contains(event.target)) {
          popup.remove();
          document.removeEventListener("click", closePopup); // Remover o ouvinte de evento
        }
      });
    });
  });
});
  ______ Não está mais ativo */

////////////////////////////////////////////////////////////////////////////////////
/* Filtro de categoria no blog */
function filtrarCategoria(categoria) {
  // Se for "todos", exibir tudo
  if (categoria === "todos") {
    document.querySelectorAll(".item").forEach((item) => {
      item.style.display = "block";
    });
    return;
  }

  // Oculta todos os itens
  document.querySelectorAll(".item").forEach((item) => {
    item.style.display = "none";
  });

  // Exibe apenas os itens da categoria selecionada
  document
    .querySelectorAll(`[data-categoria="${categoria}"]`)
    .forEach((item) => {
      item.style.display = "block";
    });
}

/////////////////////////////
 




////////////////////////////////////////////////////////////////////////////////////
   // Configuração do Supabase - SUBSTITUA PELOS SEUS DADOS!
        const SUPABASE_URL = 'https://emoqyenkhphvmpsmoyzl.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtb3F5ZW5raHBodm1wc21veXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3ODU2ODEsImV4cCI6MjA2NjM2MTY4MX0.wtPcNxGM750fDbYbyXiSG4QFDbiokoqbTfVjfq-tqHs';

        // Função para obter o slug do post atual
        function getPostSlug() {
            // Você pode personalizar isso baseado na estrutura das suas URLs
            const path = window.location.pathname;
            return path.replace(/^\//, '').replace(/\/$/, '') || 'home';
        }

        // Função para fazer requisições ao Supabase
        async function supabaseRequest(endpoint, options = {}) {
            const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
            const headers = {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
                ...options.headers
            };

            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }

            return response.json();
        }

        // Função para carregar comentários
        async function loadComments() {
            const container = document.getElementById('comments-container');
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

        // Função para mostrar mensagens
        function showMessage(message, type = 'success') {
            const messageArea = document.getElementById('message-area');
            messageArea.innerHTML = `<div class="${type}">${message}</div>`;
            setTimeout(() => {
                messageArea.innerHTML = '';
            }, 5000);
        }

        // Função para enviar comentário
        async function submitComment(event) {
            event.preventDefault();
            
            const form = event.target;
            const submitBtn = form.querySelector('.btn-submit');
            const formData = new FormData(form);
            
            // Desabilita o botão durante o envio
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            try {
                const commentData = {
                    post_slug: getPostSlug(),
                    nome: formData.get('nome').trim(),
                    link: formData.get('link').trim() || null,
                    comentario: formData.get('comentario').trim()
                };

                // Validações básicas
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
                loadComments(); // Recarrega os comentários

            } catch (error) {
                console.error('Erro ao enviar comentário:', error);
                showMessage(error.message || 'Erro ao enviar comentário. Tente novamente.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Comentário';
            }
        }

        // Função para validar URL
        function isValidUrl(string) {
            try {
                new URL(string);
                return true;
            } catch (_) {
                return false;
            }
        }

        // Inicialização
        document.addEventListener('DOMContentLoaded', function() {
            // Carrega comentários ao carregar a página
            loadComments();

            // Adiciona evento ao formulário
            document.getElementById('comment-form').addEventListener('submit', submitComment);
        });
