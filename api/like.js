/**
 * api/like.js — Vercel Serverless Function
 *
 * Proxy seguro para o GitHub Contents API.
 * O token nunca fica exposto no frontend.
 *
 * Configuração:
 *   No painel do Vercel → Settings → Environment Variables:
 *   GITHUB_TOKEN = seu fine-grained token (Contents: Read and Write)
 *
 * Aceita:
 *   GET  /api/like?slug=blog/ensaios/o-ocio-no-caos  → retorna contagem
 *   POST /api/like  body: { slug: "blog/..." }        → incrementa e salva
 */

const REPO = "od3zza/oieuoshi";
const FILE = "lib/interact/likes.json";
const API  = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

function githubHeaders() {
  return {
    "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json"
  };
}

async function readLikes() {
  const res = await fetch(API, { headers: githubHeaders() });
  if (!res.ok) throw new Error(`GitHub GET ${res.status}`);
  const data = await res.json();
  const likes = JSON.parse(
    Buffer.from(data.content, "base64").toString("utf-8")
  );
  return { likes, sha: data.sha };
}

async function writeLikes(likes, sha) {
  const content = Buffer.from(
    JSON.stringify(likes, null, 2)
  ).toString("base64");

  const res = await fetch(API, {
    method: "PUT",
    headers: githubHeaders(),
    body: JSON.stringify({
      message: "like: atualiza contagem",
      content,
      sha
    })
  });

  if (!res.ok) throw new Error(`GitHub PUT ${res.status}`);
  const data = await res.json();
  return data.content.sha;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://oieuoshi.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    const slug = req.query.slug;
    if (!slug) return res.status(400).json({ error: "slug obrigatório" });

    try {
      const { likes } = await readLikes();
      return res.status(200).json({ count: likes[slug] || 0 });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "POST") {
    const { slug } = req.body || {};
    if (!slug || !slug.startsWith("blog/")) {
      return res.status(400).json({ error: "slug inválido" });
    }

    try {
      const { likes, sha } = await readLikes();
      likes[slug] = (likes[slug] || 0) + 1;
      await writeLikes(likes, sha);
      return res.status(200).json({ count: likes[slug] });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "método não permitido" });
}
