async function carregarComentarios(postId) {
  const res = await fetch(`/api/comentarios?post=${encodeURIComponent(postId)}`);
  const comentarios = await res.json();
  
  const lista = document.getElementById('comentarios-lista');
  lista.innerHTML = '';

  comentarios.forEach(c => {
    const div = document.createElement('div');
    div.className = 'comentario';
    div.innerHTML = `
      <p><strong><a href="${c.link || '#'}" target="_blank">${c.nome}</a></strong> disse:</p>
      <p>${c.comentario}</p>
      <small>${new Date(c.data).toLocaleString()}</small>
    `;
    lista.appendChild(div);
  });
}

async function enviarComentario(postId) {
  const nome = document.getElementById('nome').value;
  const link = document.getElementById('link').value;
  const comentario = document.getElementById('comentario').value;

  await fetch('/api/comentarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ post: postId, nome, link, comentario })
  });

  document.getElementById('form-comentario').reset();
  carregarComentarios(postId);
}

window.addEventListener('DOMContentLoaded', () => {
  const postId = window.location.pathname; 
  carregarComentarios(postId);

  document.getElementById('form-comentario').addEventListener('submit', e => {
    e.preventDefault();
    enviarComentario(postId);
  });
});
