from urllib.request import urlopen
from xml.etree import ElementTree as ET
import html
from datetime import datetime
import re

def format_content(content):
    # 1. Preservar elementos complexos primeiro
    preserved_elements = []
    
    def save_element(match):
        preserved_elements.append(match.group(0))
        return f"PRESERVED_ELEMENT_{len(preserved_elements)-1}_"
    
    # Padrão para identificar elementos complexos
    complex_pattern = r'''
        (<iframe.*?</iframe>) |  # Iframes
        (<div[^>]+>.*?</div>) |  # Divs com atributos
        (<blockquote>.*?</blockquote>) |  # Citações
        (<img[^>]+>) |  # Imagens
        (<a[^>]+>.*?</a>)  # Links complexos
    '''
    content = re.sub(complex_pattern, save_element, content, flags=re.DOTALL|re.VERBOSE)
    
    # 2. Limpeza básica do conteúdo
    content = re.sub(r'<p>\s*</p>', '', content)  # Remove parágrafos vazios
    content = re.sub(r'<div>', '<p>', content)     # Converte divs simples
    content = re.sub(r'</div>', '</p>', content)
    content = re.sub(r'<br\s*/?>', '</p><p>', content)  # Quebras de linha
    
    # 3. Organizar parágrafos corretamente
    paragraphs = []
    current_paragraph = []
    in_paragraph = False
    
    for line in content.split('\n'):
        line = line.strip()
        if not line:
            continue
            
        if line.startswith('<p>'):
            if current_paragraph:
                paragraphs.append(' '.join(current_paragraph))
                current_paragraph = []
            paragraphs.append(line)
            in_paragraph = False
        elif line.startswith('</p>'):
            if current_paragraph:
                paragraphs.append('<p>' + ' '.join(current_paragraph) + '</p>')
                current_paragraph = []
            paragraphs.append(line)
            in_paragraph = False
        elif line.startswith(('<ul>', '<ol>', '<li>', '<h', '</')):
            if current_paragraph:
                paragraphs.append('<p>' + ' '.join(current_paragraph) + '</p>')
                current_paragraph = []
            paragraphs.append(line)
            in_paragraph = False
        else:
            current_paragraph.append(line)
            in_paragraph = True
    
    if current_paragraph:
        paragraphs.append('<p>' + ' '.join(current_paragraph) + '</p>')
    
    content = '\n'.join(paragraphs)
    
    # 4. Restaurar elementos preservados
    for i, element in enumerate(preserved_elements):
        content = content.replace(f'PRESERVED_ELEMENT_{i}_', element)
    
    # 5. Correções finais
    content = re.sub(r'</p>\s*<p>', '\n', content)  # Remove parágrafos duplicados
    content = re.sub(r'<p>\s*<blockquote>', '<blockquote>', content)
    content = re.sub(r'</blockquote>\s*</p>', '</blockquote>', content)
    content = re.sub(r'<p>\s*<img', '<img', content)
    content = re.sub(r'/>\s*</p>', '/>', content)
    
    return content

RSS_URL = "https://oieuoshi.blogspot.com/feeds/posts/default"

# Baixa o feed RSS
response = urlopen(RSS_URL)
xml_data = response.read().decode('utf-8')

# Parse do XML
root = ET.fromstring(xml_data)

# Namespaces para o XML Atom
ns = {'atom': 'http://www.w3.org/2005/Atom'}

# Pega a última postagem
latest_post = root.find('atom:entry', ns)
if latest_post is None:
    print("Nenhuma postagem encontrada!")
    exit()

title = latest_post.find('atom:title', ns).text
content = latest_post.find('atom:content', ns).text
link = latest_post.find('atom:link[@rel="alternate"]', ns).attrib['href']
date = latest_post.find('atom:published', ns).text

# Corrige o parsing da data
def parse_blogger_date(date_str):
    date_str = re.sub(r'\.\d+', '', date_str)
    return datetime.strptime(date_str, '%Y-%m-%dT%H:%M:%S%z')

pub_date = parse_blogger_date(date)
month_year = pub_date.strftime("%B %Y").replace("January", "Janeiro").replace("February", "Fevereiro").replace("March", "Março").replace("April", "Abril").replace("May", "Maio").replace("June", "Junho").replace("July", "Julho").replace("August", "Agosto").replace("September", "Setembro").replace("October", "Outubro").replace("November", "Novembro").replace("December", "Dezembro")

# Extrai o primeiro parágrafo para a meta description
first_paragraph = content.split('</p>')[0].replace('<p>', '') if '<p>' in content else content[:150]
first_paragraph = html.escape(first_paragraph.strip())

# Formata o conteúdo
processed_content = format_content(content)

# Gera o HTML completo
html_content = f"""<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt" lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>{html.escape(title)} - categoria - Uoshi</title>
    <meta name="author" content="Uoshi" />
    <meta name="description" content="{first_paragraph}" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="alternate" type="application/rss+xml" href="/sitemap.xml" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="stylesheet" href="/lib/style.css" type="text/css" media="screen, projection" />
    <script src="/lib/script.js" defer></script>
    <meta name="theme-color" content="#ffffff" />
    <link rel="icon" type="image/png" href="https://cdn.glitch.global/5d620f50-0e74-4257-aa4d-114f5d987ec5/favicon.png?v=1727965698348" />
    
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-G9WRTPFVLD"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){{dataLayer.push(arguments);}}
      gtag('js', new Date());
      gtag('config', 'G-G9WRTPFVLD');
    </script>
    
    <!-- SSL Redirect -->
    <script>
      if (location.protocol != "https:") {{
        location.href = "https:" + window.location.href.substring(window.location.protocol.length);
      }}
    </script>
    <meta name="p:domain_verify" content="fd7d215910ea0cf1c785c7c7cf7a7c0f" />
  </head>

  <body>
    <!-- Sidebar -->
    <div class="container"></div>
    <header class="sidebar">
      <div class="sidebar-text">
        <nav class="sections">
          <ul>
            <a href="/blog">← blog</a>
          </ul>
        </nav>
      </div>
    </header>

    <!-- Main Content -->
    <section class="main">
      <sub>{month_year}</sub>
      <h1>{html.escape(title)}</h1>
      <br />
      <sub>categoria</sub>
      <br /><br />

      <!-- Post Content -->
      {processed_content}
    </section>
    
    <!-- Footer -->
    <hr />
    <section class="footer"></section>
  </body>
</html>"""

with open("latest-post.html", "w", encoding='utf-8') as f:
    f.write(html_content)

print("Postagem atualizada com sucesso!")