"""
api/atualizar_garden.py
Detecta posts em /blog que ainda não estão no garden.json
e adiciona entradas com slug, title, path e format preenchidos.
tags e links ficam vazios para revisão manual.
Rodado pelo GitHub Actions a cada push em /blog/**
"""

import os
import re
import json
import html

BLOG_DIR    = "blog"
GARDEN_JSON = "lib/garden/garden.json"

# mapeia pasta do post → format
FORMATO = {
    "poesias":   "poesia",
    "ensaios":   "ensaio",
    "contos":    "conto",
    "misc":      "misc",
    "ttrpg":     "ttrpg",
    "nao-durmo": "ensaio",
    "traducoes": "traducao",
}

def extrair_titulo(conteudo):
    conteudo = html.unescape(conteudo)
    m = re.search(r'<h1[^>]*>(.*?)</h1>', conteudo, re.DOTALL)
    if m:
        t = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        # remove badge de status se existir
        t = re.sub(r'\s*[🌱🌿🌳].*', '', t).strip()
        return t
    m = re.search(r'<title[^>]*>(.*?)</title>', conteudo, re.DOTALL)
    if m:
        t = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        return re.sub(r'\s*[-–]\s*Uoshi.*$', '', t).strip()
    return ""

# ── carrega garden.json atual ─────────────────────────────────────────────────
with open(GARDEN_JSON, encoding="utf-8") as f:
    garden = json.load(f)

slugs_existentes = {p["slug"] for p in garden}

# ── varre /blog procurando posts novos ───────────────────────────────────────
novos = []

for dirpath, _, arquivos in os.walk(BLOG_DIR):
    partes = dirpath.replace("\\", "/").split("/")

    # ignora /arquivo e a raiz /blog
    if "arquivo" in partes:
        continue
    if len(partes) < 2:
        continue

    for nome in arquivos:
        if not nome.endswith(".html"):
            continue

        caminho = os.path.join(dirpath, nome).replace("\\", "/")

        if nome == "index.html":
            # estrutura: blog/misc/novo-post/index.html
            # partes[-1] = novo-post (slug), partes[-2] = misc (categoria)
            if len(partes) < 3:
                continue
            slug      = partes[-1]
            categoria = partes[-2]
            path      = "/" + "/".join(partes) + ".html"  # /blog/misc/novo-post.html
        else:
            # estrutura: blog/misc/novo-post.html
            # partes[-1] = misc (categoria)
            slug      = nome.replace("index.html", "")
            categoria = partes[-1]
            path      = "/" + caminho

        formato = FORMATO.get(categoria)
        if not formato:
            continue

        if slug in slugs_existentes:
            continue

        # lê o HTML para extrair o título
        with open(caminho, encoding="utf-8", errors="ignore") as f:
            conteudo = f.read()

        titulo = extrair_titulo(conteudo)
        if not titulo:
            print(f"  ⚠ sem título em {caminho}, ignorando.")
            continue

        novos.append({
            "slug":   slug,
            "title":  titulo,
            "path":   path,
            "format": formato,
            "tags":   [],
            "links":  []
        })
        print(f"  + novo post detectado: {slug}")

# ── adiciona no início do garden.json (mais recentes primeiro) ────────────────
if novos:
    garden = novos + garden
    with open(GARDEN_JSON, "w", encoding="utf-8") as f:
        json.dump(garden, f, ensure_ascii=False, indent=2)
    print(f"\n✓ {GARDEN_JSON} atualizado com {len(novos)} novo(s) post(s).")
    print("  Lembre de adicionar tags e links manualmente.")
else:
    print("✓ Nenhum post novo encontrado.")