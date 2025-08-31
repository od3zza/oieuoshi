import { Octokit } from "@octokit/rest";
import yaml from "js-yaml";

const GITHUB_OWNER = "od3zza";
const GITHUB_REPO = "oieuoshi";
const FILE_PATH = "/lib/comments/comments.yaml";
const BRANCH = "main";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { category, post, name, website, comment } = req.body;
  if (!category || !post || !name || !comment) {
    return res.status(400).json({ error: "Dados incompletos" });
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // Pega o conteúdo atual
  const { data: fileData } = await octokit.repos.getContent({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    path: FILE_PATH,
    ref: BRANCH
  });

  const fileContent = Buffer.from(fileData.content, "base64").toString("utf-8");
  const data = yaml.load(fileContent) || { blog: {} };

  // Insere o comentário
  if (!data.blog[category]) data.blog[category] = {};
  if (!data.blog[category][post]) data.blog[category][post] = [];
  data.blog[category][post].push({
    name, website, comment, date: new Date().toISOString()
  });

  const newContent = yaml.dump(data);

  // Atualiza no GitHub
  await octokit.repos.createOrUpdateFileContents({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    path: FILE_PATH,
    message: `Add comment to ${category}/${post}`,
    content: Buffer.from(newContent).toString("base64"),
    sha: fileData.sha,
    branch: BRANCH
  });

  return res.status(200).json({ success: true });
}
