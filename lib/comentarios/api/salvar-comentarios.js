// /lib/comentarios/api/salvar-comentario.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { postPath, novoComentario } = req.body;
  const token = process.env.GITHUB_TOKEN;

  const repoOwner = "SEU_USUARIO";
  const repoName = "SEU_REPO";
  const filePath = "lib/comentarios/comments.json";

  // Buscar JSON atual
  const getFile = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
    headers: { Authorization: `token ${token}` }
  });
  const fileData = await getFile.json();
  const content = JSON.parse(Buffer.from(fileData.content, "base64").toString());

  // Atualizar comentários
  if (!content[postPath]) content[postPath] = [];
  content[postPath].push(novoComentario);

  // Commit atualizado
  const updatedContent = Buffer.from(JSON.stringify(content, null, 2)).toString("base64");
  await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
    method: "PUT",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Add comment to ${postPath}`,
      content: updatedContent,
      sha: fileData.sha
    })
  });

  res.status(200).json({ success: true });
}
