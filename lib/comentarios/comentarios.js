// /lib/comentarios/comentarios.js

async function getComentarios(postPath) {
  const url = "https://raw.githubusercontent.com/SEU_USUARIO/SEU_REPO/main/lib/comentarios/comments.json";
  const res = await fetch(url);
  const data = await res.json();
  return data[postPath] || [];
}

function renderComentarios(comentarios) {
  const lista = document.getElementById("lista-comentarios");
  lista.innerHTML = "";
  comentarios.forEach(c => {
    const div = document.createElement("div");
    div.classList.add("comentario");
    div.innerHTML = `
      <p><strong>${c.link ? `<a href="${c.link}" target="_blank">${c.nome}</a>` : c.nome}</strong></p>
      <p>${c.comentario}</p>
      <small>${new Date(c.data).toLocaleString()}</small>
    `;
    lista.appendChild(div);
  });
}
