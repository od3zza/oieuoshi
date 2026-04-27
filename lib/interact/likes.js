/**
 * likes.js — /lib/interact/likes.js
 *
 * Chama /api/like (Vercel Serverless Function) em vez da GitHub API
 * diretamente. O token fica seguro nas env vars do Vercel.
 *
 * Em cada post, depois de garden.js:
 *   <script src="/lib/interact/likes.js"></script>
 */

(function () {

  const API = "/api/like";

  const slug = window.location.pathname
    .replace(/^\//, "")
    .replace(/\.html$/, "")
    .replace(/\/$/, "");

  if (!slug || !slug.startsWith("blog/")) return;

  const STORAGE_KEY = `liked:${slug}`;
  let alreadyLiked  = localStorage.getItem(STORAGE_KEY) === "1";

  const btn     = document.getElementById("like-btn");
  const countEl = document.getElementById("like-count");
  const iconEl  = btn?.querySelector(".like-icon");

  if (!btn || !countEl || !iconEl) return;

  let currentCount = 0;
  let saving       = false;

  function updateUI(count, liked) {
    countEl.textContent = count;
    iconEl.textContent  = liked ? "♥" : "♡";
    btn.classList.toggle("liked", liked);
  }

  async function loadLikes() {
    try {
      const res = await fetch(`${API}?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error(`GET ${res.status}`);
      const data   = await res.json();
      currentCount = data.count || 0;
      updateUI(currentCount, alreadyLiked);
      btn.onclick = handleLike;
    } catch (e) {
      console.warn("likes.js: erro ao carregar.", e.message);
      updateUI("—", alreadyLiked);
    }
  }

  async function handleLike() {
    if (saving || alreadyLiked) return;

    saving = true;
    btn.style.opacity = "0.5";

    currentCount += 1;
    alreadyLiked  = true;
    updateUI(currentCount, true);
    localStorage.setItem(STORAGE_KEY, "1");

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug })
      });
      if (!res.ok) throw new Error(`POST ${res.status}`);
      const data = await res.json();
      currentCount = data.count;
      countEl.textContent = currentCount;
    } catch (e) {
      console.warn("likes.js: erro ao salvar.", e.message);
      currentCount -= 1;
      alreadyLiked  = false;
      localStorage.removeItem(STORAGE_KEY);
      updateUI(currentCount, false);
    } finally {
      saving = false;
      btn.style.opacity = "1";
    }
  }

  loadLikes();

})();
