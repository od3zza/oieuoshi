#!/usr/bin/env python3
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString

ROOT = Path('.').resolve()
modified = []

for p in ROOT.rglob('*.html'):
    try:
        s = p.read_text(encoding='utf-8')
    except Exception:
        continue
    soup = BeautifulSoup(s, 'html.parser')
    changed = False
    for section in soup.find_all('section', class_='main'):
        # work on direct children only
        for child in list(section.contents):
            if isinstance(child, NavigableString):
                text = str(child).strip()
                if text:
                    new_p = soup.new_tag('p')
                    new_p.string = text
                    child.replace_with(new_p)
                    changed = True
    if changed:
        bak = p.with_suffix(p.suffix + '.pwrapbak')
        bak.write_text(s, encoding='utf-8')
        p.write_text(str(soup), encoding='utf-8')
        modified.append(str(p))

print(f"Modified {len(modified)} file(s)")
for f in modified:
    print(f)
