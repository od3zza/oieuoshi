"""
gerar_rss.py
Gera feed.xml a partir dos posts em /blog.
Usa lib/garden/dates.json (gerado pelo dates.yml) como fonte de datas.
Rodado pelo GitHub Actions toda semana.
"""

import os
import re
import json
import html
from datetime import datetime, timezone
from xml.etree.ElementTree import Element, SubElement, ElementTree, indent

# ── configuração ──────────────────────────────────────────────────────────────
SITE_URL   = "https://oieuoshi.vercel.app"
BLOG_DIR   = "blog"
DATES_JSON = "lib/garden/dates.json"
OUTPUT     = "feed.xml"
FEED_TITLE = "Uoshi"
FEED_DESC  = "o jardim digital e caótico de um designer multidisciplinar"
MAX_ITEMS  = 50
# ─────────────────────────────────────────────────────────────────────────────

def limpar(texto):
    texto = html.unescape(texto)
    texto = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', texto, flags=re.DOTALL)
    texto = re.sub(r'<[^>]+>', ' ', texto)
    texto = re.sub(r'\s+', ' ', texto).strip()
    return texto

def extrair_titulo(conteudo):
    m = re.search(r'<h1[^>]*>(.*?)</h1>', conteudo, re.DOTALL)
    if m:
        t = limpar(m.group(1))
        # remove badge de status (🌱 🌿 🌳) se existir
        t = re.sub(r'\s*[🌱🌿🌳].*', '', t).strip()
        return t
    m = re.search(r'<title[^>]*>(.*?)</title>', conteudo, re.DOTALL)
    if m:
        t = limpar(m.group(1))
        return re.sub(r'\s*[-–]\s*Uoshi.*$', '', t).strip()
    return ""

def extrair_descricao(conteudo):
    texto = limpar(conteudo)
    partes = [p.strip() for p in texto.split('  ') if len(p.strip()) > 80]
    if partes:
        return partes[0][:300] + "…"
    return texto[:300] + "…"

def iso_para_datetime(iso):
    """Converte "2025-09-07" em datetime UTC."""
    try:
        return datetime.strptime(iso, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except:
        return None

# ── carrega dates.json ────────────────────────────────────────────────────────
dates = {}
if os.path.exists(DATES_JSON):
    with open(DATES_JSON, encoding="utf-8") as f:
        dates = json.load(f)
else:
    print(f"⚠ {DATES_JSON} não encontrado — datas podem ficar incorretas.")

# ── coleta posts ──────────────────────────────────────────────────────────────
posts = []

for dirpath, _, arquivos in os.walk(BLOG_DIR):
    if "/arquivo" in dirpath.replace("\\", "/"):
        continue

    for nome in arquivos:
        if not nome.endswith(".html"):
            continue
        if nome == "index.html" and dirpath == BLOG_DIR:
            continue

        caminho = os.path.join(dirpath, nome)
        slug    = caminho.replace("\\", "/")

        # chave no dates.json: "/blog/ensaios/samurai-negao.html"
        chave = "/" + slug

        with open(caminho, encoding="utf-8", errors="ignore") as f:
            conteudo = f.read()

        titulo = extrair_titulo(conteudo)
        if not titulo:
            continue

        # usa data de criação do dates.json como fonte principal
        data = None
        if chave in dates:
            data = iso_para_datetime(dates[chave]["created"])

        # fallback: tenta extrair do conteúdo
        if not data:
            meses = {
                "janeiro": 1, "fevereiro": 2, "março": 3, "abril": 4,
                "maio": 5, "junho": 6, "julho": 7, "agosto": 8,
                "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12
            }
            m = re.search(
                r'(\d{1,2})\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto'
                r'|setembro|outubro|novembro|dezembro)\s+(\d{4})',
                html.unescape(conteudo), re.IGNORECASE
            )
            if m:
                try:
                    data = datetime(
                        int(m.group(3)), meses[m.group(2).lower()], int(m.group(1)),
                        tzinfo=timezone.utc
                    )
                except:
                    pass

        # se ainda não tem data, pula — melhor do que publicar com data errada
        if not data:
            print(f"  ⚠ sem data para {slug}, ignorando.")
            continue

        desc = extrair_descricao(conteudo)
        url  = SITE_URL + "/" + slug.replace(".html", "").replace("/index", "")

        posts.append({
            "titulo": titulo,
            "url":    url,
            "data":   data,
            "desc":   desc
        })

# ordena por data de criação, mais recente primeiro
posts.sort(key=lambda p: p["data"], reverse=True)
posts = posts[:MAX_ITEMS]

# ── gera RSS 2.0 ──────────────────────────────────────────────────────────────
rss = Element("rss", version="2.0", attrib={
    "xmlns:atom": "http://www.w3.org/2005/Atom"
})
channel = SubElement(rss, "channel")

SubElement(channel, "title").text        = FEED_TITLE
SubElement(channel, "link").text         = SITE_URL
SubElement(channel, "description").text  = FEED_DESC
SubElement(channel, "language").text     = "pt-BR"
SubElement(channel, "lastBuildDate").text = datetime.now(timezone.utc).strftime(
    "%a, %d %b %Y %H:%M:%S +0000"
)

atom_link = SubElement(channel, "atom:link")
atom_link.set("href", f"{SITE_URL}/feed.xml")
atom_link.set("rel", "self")
atom_link.set("type", "application/rss+xml")

for post in posts:
    item = SubElement(channel, "item")
    SubElement(item, "title").text       = post["titulo"]
    SubElement(item, "link").text        = post["url"]
    SubElement(item, "guid").text        = post["url"]
    SubElement(item, "description").text = post["desc"]
    SubElement(item, "pubDate").text     = post["data"].strftime(
        "%a, %d %b %Y %H:%M:%S +0000"
    )

indent(rss, space="  ")
tree = ElementTree(rss)
tree.write(OUTPUT, encoding="utf-8", xml_declaration=True)

print(f"✓ {OUTPUT} gerado com {len(posts)} posts.")