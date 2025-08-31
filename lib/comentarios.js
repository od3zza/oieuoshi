const repo = "od3zza/oieuoshi"; // substitua pelo seu
const token = "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"; // ou busque via backend simples se quiser esconder

async function carregarComentarios(postId) {
  const res = await fetch(
    `https://raw.githubusercontent.com/${repo}/main/data/comentarios.json`
  );
  const comentarios = await res.json();
  const lista = comentarios.filter((c) => c.postId === postId);
  const div = document.getElementById("comentarios");
  div.innerHTML = lista
    .map(
      (c) =>
        `<p><strong>${c.nome}</strong> (${new Date(
          c.data
        ).toLocaleString()}):<br>${c.mensagem}</p>`
    )
    .join("");
}

async function enviarComentario(postId, nome, mensagem) {
  await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/save-comment.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: { postId, nome, mensagem },
      }),
    }
  );
  alert("Comentário enviado! Ele aparecerá assim que o workflow rodar.");
}
