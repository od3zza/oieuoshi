/**
 * blogroll.js — /lib/blogroll.js
 *
 * Busca /api/blogroll e renderiza a lista de blogs
 * ordenados por atualização mais recente.
 *
 * Adicione na página /blogroll/index.html:
 *   <div id="blogroll-lista"></div>
 *   <script src="/lib/blogroll.js"></script>
 */

(async function () {

  const container = document.getElementById("blogroll-lista");
  if (!container) return;

  // formata data relativa
  function dataRelativa(iso) {
    const d = new Date(iso);
    if (d.getTime() === 0) return "";
    const diff = Date.now() - d.getTime();
    const dias  = Math.floor(diff / 86400000);
    const meses = Math.floor(dias / 30);
    const anos  = Math.floor(dias / 365);

    if (dias < 1)    return "hoje";
    if (dias < 2)    return "ontem";
    if (dias < 7)    return `há ${dias} dias`;
    if (dias < 30)   return `há ${Math.floor(dias / 7)} semana${Math.floor(dias / 7) > 1 ? "s" : ""}`;
    if (meses < 12)  return `há ${meses} ${meses > 1 ? "meses" : "mês"}`;
    return `há ${anos} ano${anos > 1 ? "s" : ""}`;
  }

  try {
    const res = await fetch("/api/blogroll");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blogs = await res.json();

    if (!blogs.length) {
      container.innerHTML = `<p style="opacity:.5; font-size:.9rem;">nenhum blog encontrado.</p>`;
      return;
    }

    let html = `<div class="blogroll">`;

    for (const blog of blogs) {
      const data = blog.updatedAt && new Date(blog.updatedAt).getTime() !== 0
        ? dataRelativa(blog.updatedAt)
        : "";

      const ultimoPost = blog.lastPost?.titulo
        ? `<a href="${blog.lastPost.link || blog.url}" class="blogroll-post-titulo" target="_blank" rel="noopener">
             ${blog.lastPost.titulo}
           </a>`
        : "";

      html += `
        <div class="blogroll-item${!blog.ok ? " blogroll-item--offline" : ""}">
          <div class="blogroll-header">
            <img class="blogroll-favicon" src="${blog.favicon}" alt="" width="16" height="16" loading="lazy" />
            <a href="${blog.url}" class="blogroll-nome" target="_blank" rel="noopener">${blog.name}</a>
            ${data ? `<span class="blogroll-data">${data}</span>` : ""}
          </div>
          ${ultimoPost ? `<div class="blogroll-ultimo">${ultimoPost}</div>` : ""}
        </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;

  } catch (e) {
    container.innerHTML = `<p style="opacity:.5; font-size:.9rem;">erro ao carregar o blogroll.</p>`;
    console.warn("blogroll.js:", e.message);
  }

  // estilos
  if (!document.getElementById("blogroll-styles")) {
    const style = document.createElement("style");
    style.id = "blogroll-styles";
    style.textContent = `
      .blogroll {
        display: flex;
        flex-direction: column;
        gap: 1.4rem;
        margin-top: 1rem;
      }

      .blogroll-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .blogroll-item--offline {
        opacity: 0.4;
      }

      .blogroll-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .blogroll-favicon {
        width: 16px;
        height: 16px;
        border-radius: 2px;
        flex-shrink: 0;
        margin: 0;
        display: inline-block;
      }

      .blogroll-nome {
        font-family: "Rubik", sans-serif;
        font-size: var(--font-size-m);
        font-weight: bold;
        color: var(--foreground);
        text-decoration: none;
      }
      .blogroll-nome:hover { text-decoration: underline; }

      .blogroll-data {
        font-family: "Merriweather", serif;
        font-size: var(--font-size-s);
        font-weight: normal;
        color: var(--text-light);
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .blogroll-ultimo {
        padding-left: 1.5rem;
      }

      .blogroll-post-titulo {
        font-family: "Merriweather", serif;
        font-size: var(--font-size-s);
        font-weight: normal;
        color: var(--text-light);
        text-decoration: none;
        font-style: italic;
      }
      .blogroll-post-titulo:hover {
        color: var(--foreground);
        text-decoration: underline;
      }

      body.dark-mode .blogroll-nome { color: var(--dark-text); }
      body.dark-mode .blogroll-data { color: var(--dark-border); }
      body.dark-mode .blogroll-post-titulo { color: var(--dark-border); }
      body.dark-mode .blogroll-post-titulo:hover { color: var(--dark-text); }
    `;
    document.head.appendChild(style);
  }

})();