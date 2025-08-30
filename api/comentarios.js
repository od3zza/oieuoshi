import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  const filePath = path.join(process.cwd(), "data", "comentarios.json");
  const data = fs.readFileSync(filePath, "utf-8");
  let comentarios = JSON.parse(data || "[]");

  if (req.method === "POST") {
    const { postId, nome, mensagem } = req.body;

    if (!postId || !nome || !mensagem) {
      return res.status(400).json({ error: "Campos obrigatórios" });
    }

    const novoComentario = {
      postId,
      nome: nome.replace(/</g, "&lt;"),
      mensagem: mensagem.replace(/</g, "&lt;"),
      data: new Date().toISOString(),
    };

    comentarios.push(novoComentario);
    fs.writeFileSync(filePath, JSON.stringify(comentarios, null, 2));

    return res.status(200).json({ status: "ok" });
  }

  if (req.method === "GET") {
    const { postId } = req.query;
    const filtrados = comentarios.filter((c) => c.postId === postId);
    return res.status(200).json(filtrados);
  }

  res.status(405).json({ error: "Método não permitido" });
}
