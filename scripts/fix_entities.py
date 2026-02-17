#!/usr/bin/env python3
from pathlib import Path

ROOT = Path('.').resolve()
changed = []

for p in ROOT.rglob('*.html'):
    try:
        s = p.read_text(encoding='utf-8')
    except Exception:
        continue
    new = s.replace('&nbsp;', ' ').replace('&gt;', '>').replace('&quot;', '"')
    if new != s:
        bak = p.with_name(p.name + '.entitiesbak')
        bak.write_text(s, encoding='utf-8')
        p.write_text(new, encoding='utf-8')
        changed.append(str(p))

print(f"Changed {len(changed)} file(s)")
for f in changed:
    print(f)
