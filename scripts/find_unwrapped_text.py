#!/usr/bin/env python3
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString

ROOT = Path('.').resolve()
problems = {}

for p in ROOT.rglob('*.html'):
    try:
        s = p.read_text(encoding='utf-8')
    except Exception:
        continue
    soup = BeautifulSoup(s, 'html.parser')
    for section in soup.find_all('section', class_='main'):
        for string in section.find_all(string=True):
            # ignore whitespace-only
            if not isinstance(string, NavigableString):
                continue
            text = str(string)
            if not text.strip():
                continue
            # ignore strings inside these tags
            parent = string.parent
            # skip if any ancestor up to section is a <p>
            ancestor = parent
            inside_p = False
            while ancestor and ancestor != section:
                if getattr(ancestor, 'name', None) == 'p':
                    inside_p = True
                    break
                ancestor = ancestor.parent
            if inside_p:
                continue
            # skip if parent is allowed inline tag (we still consider text nodes inside <a> etc. as okay only if wrapped in p)
            # If parent is body of section or div and not p, mark as problem
            # Also skip script/style/pre/code areas
            if parent.name in ('script','style','pre','code'):
                continue
            # record problem
            snippet = text.strip()
            if len(snippet) > 200:
                snippet = snippet[:200] + '...'
            problems.setdefault(str(p), []).append((parent.name, snippet))

# Print summary
print(f"Files with unwrapped text: {len(problems)}")
for f, items in sorted(problems.items()):
    print('\n' + f)
    for tag, txt in items:
        print(f"  parent=<{tag}>: {txt}")
