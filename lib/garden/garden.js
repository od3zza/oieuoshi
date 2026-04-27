/**
 * garden.js — /lib/garden/garden.js
 *
 * Lê /lib/garden/garden.json e /lib/garden/dates.json e injeta:
 *   - Datas em #post-dates
 *   - Footer do jardim em #garden-footer (links, backlinks, relacionados, like)
 *
 * Em cada post, antes de </body>:
 *   <div id="post-dates"></div>        ← no cabeçalho
 *   <div id="garden-footer"></div>
 *   <script src="/lib/garden/garden.js"></script>
 *   <script src="/lib/interact/likes.js"></script>
 */

(async function () {

  const path    = window.location.pathname.replace(/\/$/, "") || "/index.html";
  const pathHtml = path.endsWith(".html") ? path : path + ".html";

  // carrega os dois JSONs em paralelo
  let garden = [], dates = {};
  try {
    const [gRes, dRes] = await Promise.all([
      fetch("/lib/garden/garden.json"),
      fetch("/lib/garden/dates.json")
    ]);
    if (gRes.ok) garden = await gRes.json();
    if (dRes.ok) dates  = await dRes.json();
  } catch (e) {
    console.warn("garden.js: erro ao carregar JSONs", e);
    return;
  }

  const current = garden.find(p => p.path === pathHtml || p.path === path);

  // ── DATAS ────────────────────────────────────────────────────────────────
  const datesEl = document.getElementById("post-dates");
  if (datesEl) {
    // tenta os quatro formatos possíveis de chave no dates.json:
    // /blog/ensaios/samurai-negao.html          (arquivo .html direto)
    // /blog/ensaios/samurai-negao               (sem extensão)
    // /blog/ensaios/samurai-negao/index.html    (pasta com index — mais comum)
    // /blog/ensaios/samurai-negao/index          (sem extensão)
    const pathSemHtml = path.replace(/\.html$/, "");
    const entry =
      dates[pathHtml] ||
      dates[path] ||
      dates[pathSemHtml + "/index.html"] ||
      dates[pathSemHtml + "/index"];

    if (entry) {
      const fmt = iso => {
        const [y, m, d] = iso.split("-");
        const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
        return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
      };
      if (entry.created === entry.updated) {
        datesEl.innerHTML =
          `<span class="post-date">publicado em ${fmt(entry.created)}</span>`;
      } else {
        datesEl.innerHTML =
          `<span class="post-date">publicado em ${fmt(entry.created)} 🌱</span>` +
          `<span class="post-date-sep"> · </span>` +
          `<span class="post-date post-date-updated">editado em ${fmt(entry.updated)} 🌿</span>`;
      }
    }
  }

  // ── FOOTER DO JARDIM ─────────────────────────────────────────────────────
  const footerEl = document.getElementById("garden-footer");
  if (!footerEl || !current) return;

  const bySlug = Object.fromEntries(garden.map(p => [p.slug, p]));

  // links declarados
  const links = (current.links || [])
    .map(slug => bySlug[slug])
    .filter(Boolean);

  // backlinks automáticos
  const backlinks = garden.filter(p =>
    p.slug !== current.slug && (p.links || []).includes(current.slug)
  );

  // relacionados por tag
  const linkedSlugs = new Set([
    current.slug,
    ...links.map(p => p.slug),
    ...backlinks.map(p => p.slug)
  ]);

  const related = garden
    .filter(p => !linkedSlugs.has(p.slug))
    .map(p => {
      const shared = (p.tags || []).filter(t => (current.tags || []).includes(t));
      return { post: p, shared };
    })
    .filter(r => r.shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length)
    .slice(0, 5);

  // helpers
  function tagPills(tags) {
    return (tags || []).map(t =>
      `<a href="/blog?tag=${encodeURIComponent(t)}" class="gd-tag">${t}</a>`
    ).join("");
  }

function nodeLink(post) {
    return `
      <a href="${post.path}" class="gd-node">
        <span class="gd-node-title">${post.title}</span>
        <div class="gd-node-meta">
          ${tagPills(post.tags)}
        </div>
      </a>`;
  }

  // monta HTML
  let html = "";

  if (links.length > 0) {
    html += `
      <div class="gd-section">
        <span class="gd-label">🔗 este texto conversa com</span>
        <div class="gd-nodes">${links.map(nodeLink).join("")}</div>
      </div>`;
  }

  if (backlinks.length > 0) {
    html += `
      <div class="gd-section">
        <span class="gd-label">← citado em</span>
        <div class="gd-backlinks">
          ${backlinks.map(p => `
            <a href="${p.path}" class="gd-backlink">
              <span class="gd-backlink-arrow">↩</span>${p.title}
            </a>`).join("")}
        </div>
      </div>`;
  }

  if (related.length > 0) {
    html += `
      <div class="gd-section">
        <span class="gd-label">🏷 mais sobre ${current.tags.join(", ")}</span>
        <div class="gd-related">
          ${related.map(r => `
            <a href="${r.post.path}" class="gd-related-post">
              <span class="gd-related-title">${r.post.title}</span>
              <div class="gd-related-tags">${r.shared.map(t => `<span class="gd-tag">${t}</span>`).join("")}</div>
            </a>`).join("")}
        </div>
      </div>`;
  }

  if (!html) {
    html = `<div class="gd-section"><span class="gd-label" style="opacity:.4;">— sem conexões ainda —</span></div>`;
  }

  footerEl.innerHTML = `<div class="gd-footer">${html}</div>`;

})();