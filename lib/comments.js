const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzNRj-1UXIF-C-zc-rESHBBUAIhlo32wqtUYaG9EYXig03GGDpB6a55uzfd1LcDbsmh/exec";

// Função para enviar comentário
async function enviarComentario(postId, autor, comentario) {
    const res = await fetch(WEB_APP_URL, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({post_id: postId, autor, comentario})
    });
    return await res.json();
}

// Função para carregar comentários
async function carregarComentarios(postId) {
    const res = await fetch(`${WEB_APP_URL}?post_id=${postId}`);
    const data = await res.json();
    return data;
}

// Função para renderizar os comentários na página
async function renderComentarios(postId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const comentarios = await carregarComentarios(postId);
    container.innerHTML = comentarios.map(c => `
        <div class="comentario">
            <strong>${c.autor}</strong> <em>(${new Date(c.data).toLocaleString()})</em>
            <p>${c.comentario}</p>
        </div>
    `).join('');
}

// Função para inicializar o formulário de envio
function initFormulario(postId, formId, containerId) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const autor = form.querySelector('input[name="autor"]').value;
        const comentario = form.querySelector('textarea[name="comentario"]').value;
        await enviarComentario(postId, autor, comentario);
        form.reset();
        await renderComentarios(postId, containerId);
    });
}
