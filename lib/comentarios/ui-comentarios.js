// /lib/comentarios/ui-comentarios.js
document.addEventListener("DOMContentLoaded", async () => {
  const postPath = window.location.pathname.replace(/^\/+/, "");
  const comentarios = await getComentarios(postPath);
  renderComentarios(comentarios);

  document.getElementById("form-comentario").addEventListener("submit", async (e) => {
    e.preventDefault();
    const novoComentario = {
      nome: document.getElementById("nome").value,
      link: document.getElementById("link").value,
      comentario: document.getElementById("comentario").value,
      data: new Date().toISOString()
    };

    const res = await fetch("/api/salvar-comentario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postPath, novoComentario })
    });

    if (res.ok) {
      comentarios.push(novoComentario);
      renderComentarios(comentarios);
      e.target.reset();
    } else {
      alert("Erro ao salvar comentário!");
    }
  });
});
