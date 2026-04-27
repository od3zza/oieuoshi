/**
 * bloglist.js — /lib/bloglist.js
 *
 * Renderiza a lista do blog a partir do garden.json.
 * Agrupa por ano, ordena do mais recente ao mais antigo.
 * Lê ?tag=X da URL e filtra por tag temática.
 * Lê ?formato=X e filtra por formato (poesia, ensaio, conto…).
 *
 * Adicione no blog/index.html:
 *   <div id="blog-lista"></div>
 *   <script src="/lib/bloglist.js"></script>
 */

(async function () {

  const container = document.getElementById("blog-lista");
  if (!container) return;

  // ── parâmetros da URL ──────────────────────────────────────────────────────
  const params  = new URLSearchParams(window.location.search);
  const tagAtiva     = params.get("tag");
  const formatoAtivo = params.get("formato");

  // ── carrega garden.json ────────────────────────────────────────────────────
  let garden = [];
  try {
    const res = await fetch("/lib/garden/garden.json");
    if (!res.ok) throw new Error();
    garden = await res.json();
  } catch {
    container.innerHTML = `<p style="opacity:.5; font-size:.9rem;">não foi possível carregar os posts.</p>`;
    return;
  }

  // ── filtra ─────────────────────────────────────────────────────────────────
  let posts = [...garden];

  if (tagAtiva) {
    posts = posts.filter(p => (p.tags || []).includes(tagAtiva));
  }

  if (formatoAtivo) {
    posts = posts.filter(p => p.format === formatoAtivo);
  }

  // ── ordena por data (usa dates.json se disponível, senão mantém ordem do JSON) ──
  let dates = {};
  try {
    const res = await fetch("/lib/garden/dates.json");
    if (res.ok) dates = await res.json();
  } catch {}

  posts.sort((a, b) => {
    const da = dates[a.path]?.created || "0000-00-00";
    const db = dates[b.path]?.created || "0000-00-00";
    return db.localeCompare(da);
  });

  // ── helpers ────────────────────────────────────────────────────────────────
  function formatarData(iso) {
    if (!iso || iso === "0000-00-00") return "";
    const [y, m, d] = iso.split("-");
    const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
    return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
  }

  function tagLink(tag) {
    const ativa = tag === tagAtiva;
    return `<a href="/blog?tag=${encodeURIComponent(tag)}"
      class="blog-tag${ativa ? " blog-tag--ativa" : ""}"
      style="${ativa ? "border-color:var(--foreground);background:var(--foreground);color:var(--background);" : ""}"
    >${tag}</a>`;
  }

  // ── banner de filtro ativo ─────────────────────────────────────────────────
  let banner = "";
  if (tagAtiva || formatoAtivo) {
    const label = tagAtiva
      ? `tag: <strong>${tagAtiva}</strong>`
      : `formato: <strong>${formatoAtivo}</strong>`;
    banner = `
      <div class="blog-filtro-banner">
        <span>filtrando por ${label}</span>
        <a href="/blog">limpar ✕</a>
      </div>`;
  }

  // ── agrupa por ano e renderiza ────────────────────────────────────────────
  const POR_PAGINA = 10;
  let visiveis = POR_PAGINA;

  function renderItem(post) {
    const dataISO = dates[post.path]?.created || null;
    const dataStr = dataISO ? formatarData(dataISO) : "";
    const tagsHtml = (post.tags || []).map(tagLink).join(" ");
    return `
      <div class="item" data-formato="${post.format || ""}" data-tags="${(post.tags || []).join(" ")}">
        <div class="item-linha">
          <a href="${post.path.replace(".html", "")}">${post.title}</a>
          ${dataStr ? `<sub>${dataStr}</sub>` : ""}
        </div>
        ${tagsHtml ? `<div class="blog-item-tags">${tagsHtml}</div>` : ""}
      </div>`;
  }

  function renderLista() {
    const visivelAgora = posts.slice(0, visiveis);
    let html = banner + `<br>`;
    let anoAtual = null;

    for (const post of visivelAgora) {
      const dataISO = dates[post.path]?.created || null;
      const ano = dataISO ? parseInt(dataISO.split("-")[0]) : null;

      if (ano && ano !== anoAtual) {
        if (anoAtual !== null) html += `<br>`;
        anoAtual = ano;
      }

      html += renderItem(post);
    }

    if (posts.length === 0) {
      html += `<p style="opacity:.5; font-size:.9rem; margin-top:1rem;">nenhum post encontrado.</p>`;
    }

    if (visiveis < posts.length) {
      html += `
        <div style="margin-top: 1.5rem;">
          <button id="ver-mais-btn" style="
            font-family: 'Merriweather', serif;
            font-size: var(--font-size-s);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            background: none;
            border: 1px solid var(--border);
            padding: 0.4rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            color: var(--text-light);
            width: auto;
            transition: border-color 0.15s, color 0.15s;
          ">ver mais (${posts.length - visiveis} restantes)</button>
        </div>`;
    }

    container.innerHTML = html;

    const btn = document.getElementById("ver-mais-btn");
    if (btn) {
      btn.addEventListener("mouseenter", () => {
        btn.style.borderColor = "var(--foreground)";
        btn.style.color = "var(--foreground)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.borderColor = "var(--border)";
        btn.style.color = "var(--text-light)";
      });
      btn.addEventListener("click", () => {
        visiveis += POR_PAGINA;
        renderLista();
        // mantém scroll na posição atual
      });
    }
  }

  renderLista();

  // ── estilos injetados uma vez ──────────────────────────────────────────────
  if (!document.getElementById("blog-list-styles")) {
    const style = document.createElement("style");
    style.id = "blog-list-styles";
    style.textContent = `
      .blog-filtro-banner {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
        font-family: "Merriweather", serif;
        font-size: var(--font-size-s);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-light);
      }
      .blog-filtro-banner a {
        font-family: inherit;
        font-size: inherit;
        font-weight: normal;
        text-transform: inherit;
        letter-spacing: inherit;
        color: var(--foreground);
        text-decoration: underline;
        text-underline-offset: 3px;
      }
      .blog-filtro-banner strong {
        color: var(--foreground);
      }

      .item {
        margin-bottom: 0.5rem;
        line-height: 1.6;
        display: flex;
        flex-direction: column;   /* título + tags empilhados */
        align-items: flex-start;
        gap: 0.2rem;
      }

      .item a {
        font-weight: bold;
      }

      .item sub {
        display: inline;
      }

      .item-linha {
        display: flex;
        align-items: baseline;
        gap: 0.4rem;
        flex-wrap: wrap;
      }

      .blog-item-tags {
        display: flex;
        flex-wrap: wrap;          /* quebra para próxima linha */
        gap: 0.3rem;
        max-width: 100%;          /* nunca ultrapassa o container */
      }

      .blog-tag {
        font-family: "Merriweather", serif;
        font-size: var(--font-size-s);
        font-weight: normal;
        color: var(--text-light);
        text-transform: uppercase;
        letter-spacing: 0.03em;
        text-decoration: none;
        border: 1px solid var(--border);
        padding: 0.15rem 0.5rem;
        border-radius: 4px;
        white-space: nowrap;
        transition: background-color 0.15s, border-color 0.15s, color 0.15s;
      }
      .blog-tag:hover {
        border-color: var(--foreground);
        background: var(--foreground);
        color: var(--background);
        text-decoration: none;
      }

      body.dark-mode .blog-filtro-banner { color: var(--dark-border); }
      body.dark-mode .blog-filtro-banner a { color: var(--dark-text); }
      body.dark-mode .blog-filtro-banner strong { color: var(--dark-text); }
      body.dark-mode .blog-tag { border-color: var(--dark-border); color: var(--dark-border); }
      body.dark-mode .blog-tag:hover { background: var(--dark-link); border-color: var(--dark-link); color: var(--dark-bg); }
    `;
    document.head.appendChild(style);
  }

})();