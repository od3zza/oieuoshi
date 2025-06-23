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

// Carrega os dados
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
 
/////////////////////////////
 
 
/**
 * Sistema de Comentários integrado com Google Sheets
 * Adicione este código ao seu arquivo script.js existente
 */

// Configuração - SUBSTITUA PELA URL DO SEU GOOGLE APPS SCRIPT
const COMMENTS_CONFIG = {
  // URL do Google Apps Script Web App (será fornecida após criar o script)
  scriptUrl: 'https://script.google.com/macros/s/AKfycbxVmRdfJlAGbCl35kZtg0Flh6MgmliVwbYt7RiZ1hkxdf38acZZYVa_UkRkoMuvzuDW0A/exec',
  
  // ID único do post - deve ser definido em cada página
  // Exemplo: 'post-blade-runner-2049', 'post-detroit-become-human', etc.
  postId: null,
  
  // Configurações gerais
  maxComments: 50, // Máximo de comentários a carregar por vez
  autoRefresh: false, // Auto-refresh dos comentários (em minutos, false para desabilitar)
};

/**
 * Inicializa o sistema de comentários
 * @param {string} postId - ID único do post
 */
function initComments(postId) {
  if (!postId) {
    console.error('ID do post é obrigatório para inicializar os comentários');
    return;
  }
  
  COMMENTS_CONFIG.postId = postId;
  
  // Carrega comentários existentes
  loadComments();
  
  // Configura o formulário
  setupCommentForm();
  
  // Auto-refresh se configurado
  if (COMMENTS_CONFIG.autoRefresh) {
    setInterval(loadComments, COMMENTS_CONFIG.autoRefresh * 60000);
  }
}

/**
 * Configura o formulário de comentários
 */
function setupCommentForm() {
  const form = document.getElementById('comment-form');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitComment();
  });
}

/**
 * Envia um novo comentário
 */
async function submitComment() {
  const form = document.getElementById('comment-form');
  const submitButton = document.getElementById('submit-comment');
  const statusDiv = document.getElementById('comment-status');
  
  if (!form || !submitButton || !statusDiv) return;
  
  // Coleta dados do formulário
  const formData = new FormData(form);
  const commentData = {
    postId: COMMENTS_CONFIG.postId,
    name: formData.get('name').trim(),
    email: formData.get('email').trim(),
    comment: formData.get('comment').trim(),
    timestamp: new Date().toISOString()
  };
  
  // Validação básica
  if (!commentData.name || !commentData.comment) {
    showStatus('Por favor, preencha nome e comentário.', 'error');
    return;
  }
  
  if (commentData.name.length > 50) {
    showStatus('Nome deve ter no máximo 50 caracteres.', 'error');
    return;
  }
  
  if (commentData.comment.length > 1000) {
    showStatus('Comentário deve ter no máximo 1000 caracteres.', 'error');
    return;
  }
  
  // Validação de email se fornecido
  if (commentData.email && !isValidEmail(commentData.email)) {
    showStatus('Por favor, insira um email válido.', 'error');
    return;
  }
  
  // Desabilita o botão durante o envio
  submitButton.disabled = true;
  submitButton.textContent = 'Enviando...';
  showStatus('Enviando comentário...', 'info');
  
  try {
    // Envia para o Google Apps Script
    const response = await fetch(COMMENTS_CONFIG.scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'addComment',
        data: commentData
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showStatus('Comentário enviado com sucesso!', 'success');
      form.reset();
      
      // Recarrega comentários após um breve delay
      setTimeout(loadComments, 1000);
    } else {
      showStatus(result.message || 'Erro ao enviar comentário. Tente novamente.', 'error');
    }
  } catch (error) {
    console.error('Erro ao enviar comentário:', error);
    showStatus('Erro de conexão. Verifique sua internet e tente novamente.', 'error');
  } finally {
    // Reabilita o botão
    submitButton.disabled = false;
    submitButton.textContent = 'Enviar Comentário';
  }
}

/**
 * Carrega comentários existentes
 */
async function loadComments() {
  const container = document.getElementById('comments-container');
  if (!container) return;
  
  if (!COMMENTS_CONFIG.scriptUrl || COMMENTS_CONFIG.scriptUrl.includes('SUBSTITUA')) {
    container.innerHTML = '<div class="no-comments">Configure a URL do Google Apps Script para carregar comentários.</div>';
    return;
  }
  
  try {
    const response = await fetch(COMMENTS_CONFIG.scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'getComments',
        data: {
          postId: COMMENTS_CONFIG.postId,
          limit: COMMENTS_CONFIG.maxComments
        }
      })
    });
    
    const result = await response.json();
    
    if (result.success && result.data) {
      displayComments(result.data);
    } else {
      container.innerHTML = '<div class="no-comments">Erro ao carregar comentários.</div>';
    }
  } catch (error) {
    console.error('Erro ao carregar comentários:', error);
    container.innerHTML = '<div class="no-comments">Erro de conexão ao carregar comentários.</div>';
  }
}

/**
 * Exibe os comentários na página
 * @param {Array} comments - Array de comentários
 */
function displayComments(comments) {
  const container = document.getElementById('comments-container');
  if (!container) return;
  
  if (!comments || comments.length === 0) {
    container.innerHTML = '<div class="no-comments">Ainda não há comentários. Seja o primeiro a comentar!</div>';
    return;
  }
  
  // Ordena comentários por data (mais recentes primeiro)
  comments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  const commentsHtml = comments.map(comment => {
    const date = new Date(comment.timestamp);
    const formattedDate = date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `
      <div class="comment-item">
        <div class="comment-header">
          <span class="comment-author">${escapeHtml(comment.name)}</span>
          <span class="comment-date">${formattedDate}</span>
        </div>
        <div class="comment-text">${escapeHtml(comment.comment)}</div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = commentsHtml;
}

/**
 * Exibe mensagem de status
 * @param {string} message - Mensagem a exibir
 * @param {string} type - Tipo da mensagem (success, error, info)
 */
function showStatus(message, type) {
  const statusDiv = document.getElementById('comment-status');
  if (!statusDiv) return;
  
  statusDiv.textContent = message;
  statusDiv.className = `comment-status ${type}`;
  statusDiv.style.display = 'block';
  
  // Remove a mensagem após 5 segundos para mensagens de sucesso
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
}

/**
 * Valida formato de email
 * @param {string} email - Email a validar
 * @returns {boolean} - True se válido
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Escapa HTML para prevenir XSS
 * @param {string} text - Texto a escapar
 * @returns {string} - Texto escapado
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Função utilitária para definir o ID do post
 * Use esta função em cada página de post
 * @param {string} postId - ID único do post
 */
function setPostId(postId) {
  // Aguarda o DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initComments(postId));
  } else {
    initComments(postId);
  }
}

// Exemplo de uso:
// setPostId('post-blade-runner-2049');

// Auto-inicialização se o ID do post estiver definido no HTML
document.addEventListener('DOMContentLoaded', () => {
  // Procura por um elemento com data-post-id
  const postElement = document.querySelector('[data-post-id]');
  if (postElement) {
    const postId = postElement.getAttribute('data-post-id');
    initComments(postId);
  }
});





