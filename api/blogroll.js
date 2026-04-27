/**
 * api/blogroll.js — Vercel Serverless Function
 *
 * Busca os feeds RSS/Atom dos blogs do blogroll e retorna
 * os dados do post mais recente de cada um.
 * Roda no servidor, evitando problemas de CORS.
 *
 * GET /api/blogroll → retorna array de blogs ordenados por data de atualização
 */

const FEEDS = [
  { name: "tristezinhas cotidianas", url: "http://www.tristezinhascotidianas.com.br", feed: "http://www.tristezinhascotidianas.com.br/feeds/posts/default?alt=rss" },
  { name: "BMRTT", url: "http://www.bamoretti.com/", feed: "https://feeds.feedburner.com/bamoretti" },
  { name: "caderninho", url: "https://www.jteotonio.com.br", feed: "https://www.jteotonio.com.br/feeds/posts/default?alt=rss" },
  { name: "caldo de marola", url: "http://caldodemarola.blogspot.com/", feed: "http://caldodemarola.blogspot.com/feeds/posts/default?alt=rss" },
  { name: "camundonguinha", url: "http://camundonguinha.blogspot.com/", feed: "http://camundonguinha.blogspot.com/feeds/posts/default?alt=rss" },
  { name: "Cine África", url: "http://cine-africa.blogspot.com/", feed: "http://cine-africa.blogspot.com/feeds/posts/default?alt=rss" },
  { name: "convergência cinéfila", url: "http://cinefilosconvergentes.blogspot.com/", feed: "http://cinefilosconvergentes.blogspot.com/feeds/posts/default?alt=rss" },
  { name: "domingo", url: "http://ao-domingo.blogspot.com/", feed: "http://ao-domingo.blogspot.com/feeds/posts/default?alt=rss" },
  { name: "DOWNLOAD CULT", url: "http://downloadcult.org/", feed: "http://downloadcult.org/feed" },
  { name: "Fabled Lands", url: "http://fabledlands.blogspot.com/", feed: "http://fabledlands.blogspot.com/feeds/posts/default?alt=rss" },
  { name: "Facada no Fígado", url: "http://facadanofigado.blogspot.com/", feed: "http://facadanofigado.blogspot.com/feeds/posts/default?alt=rss" },
  { name: "fugi de casa", url: "http://odisseia666.blogspot.com/", feed: "http://odisseia666.blogspot.com/feeds/posts/default?alt=rss" },
  { name: "ground control to major confusion", url: "http://www.uaba.wtf/", feed: "https://www.uaba.wtf/feeds/posts/default?alt=rss" },
  { name: "Hey I'm With The Band", url: "http://www.heyimwiththeband.com.br/", feed: "https://www.heyimwiththeband.com.br/feeds/posts/default?alt=rss" },
  { name: "barnsworthburning", url: "https://barnsworthburning.net", feed: "https://barnsworthburning.net/feed.xml" },
  { name: "kalopsia", url: "https://nicolledulce.wordpress.com", feed: "https://nicolledulce.wordpress.com/feed" },
  { name: "marrrina", url: "http://www.marrrina.space/", feed: "http://www.marrrina.space/feeds/posts/default?alt=rss" },
  { name: "Mysterious Chanting", url: "https://mysteriouschanting.wordpress.com", feed: "https://mysteriouschanting.wordpress.com/feed" },
  { name: "onde as estrelas são selvagens", url: "http://oaess.blogspot.com/", feed: "http://oaess.blogspot.com/feeds/posts/default?alt=rss" },
  { name: "PorceLana", url: "http://porce-lana.blogspot.com/", feed: "http://porce-lana.blogspot.com/feeds/posts/default?alt=rss" },
  { name: "SPACE MONSTER", url: "http://cinespacemonster.blogspot.com/", feed: "http://cinespacemonster.blogspot.com/feeds/posts/default?alt=rss" },
  { name: "TechDemo", url: "https://techdemo.com.br/", feed: "https://techdemo.com.br/feed" },
  { name: "WILBUR D.", url: "http://wilburdcontos.blogspot.com/", feed: "http://wilburdcontos.blogspot.com/feeds/posts/default?alt=rss" },
  { name: "Neolíria", url: "http://www.neoliria.com/", feed: "http://www.neoliria.com/https://www.neoliria.com/feeds/posts/default?alt=rss" },
  { name: "DENIAC", url: "https://deniac.com", feed: "https://deniac.com/feed" },
  { name: "A Ilha em Circe", url: "http://www.ailhaemcirce.com/", feed: "http://www.ailhaemcirce.com/feeds/posts/default?alt=rss" },
];

// extrai texto de uma tag XML
function tag(xml, name) {
  const patterns = [
    new RegExp(`<${name}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${name}>`, "i"),
    new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"),
  ];
  for (const re of patterns) {
    const m = xml.match(re);
    if (m) return m[1].trim();
  }
  return "";
}

// extrai data do item mais recente
function extrairData(xml) {
  // tenta pubDate (RSS) e updated/published (Atom)
  const campos = ["pubDate", "published", "updated", "dc:date"];
  for (const campo of campos) {
    const v = tag(xml, campo);
    if (v) {
      const d = new Date(v);
      if (!isNaN(d)) return d;
    }
  }
  return new Date(0);
}

// extrai título e link do post mais recente
function extrairPost(feedXml) {
  // pega o primeiro <item> ou <entry>
  const itemMatch = feedXml.match(/<item[\s>]([\s\S]*?)<\/item>/i) ||
                    feedXml.match(/<entry[\s>]([\s\S]*?)<\/entry>/i);
  if (!itemMatch) return { titulo: "", link: "", data: new Date(0) };

  const item = itemMatch[1];
  const titulo = tag(item, "title");
  const link = tag(item, "link") ||
    (item.match(/<link[^>]+href="([^"]+)"/i) || [])[1] || "";
  const data = extrairData(item);

  return { titulo, link, data };
}

// busca um feed com timeout
async function fetchFeed(blog) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(blog.feed, {
      signal: controller.signal,
      headers: { "User-Agent": "Uoshi-Blogroll/1.0" }
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const { titulo, link, data } = extrairPost(xml);
    return {
      name: blog.name,
      url: blog.url,
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(blog.url).hostname}&sz=32`,
      lastPost: { titulo, link },
      updatedAt: data.toISOString(),
      ok: true
    };
  } catch (e) {
    clearTimeout(timeout);
    return {
      name: blog.name,
      url: blog.url,
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(blog.url).hostname}&sz=32`,
      lastPost: { titulo: "", link: "" },
      updatedAt: new Date(0).toISOString(),
      ok: false
    };
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://oieuoshi.vercel.app");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate"); // cache 1h

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "método não permitido" });

  // busca todos os feeds em paralelo
  const results = await Promise.all(FEEDS.map(fetchFeed));

  // ordena por data de atualização, mais recente primeiro
  results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return res.status(200).json(results);
}
