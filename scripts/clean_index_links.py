#!/usr/bin/env python3
import os, re, sys, subprocess
root = os.getcwd()
ignore_dirs = {'.git', '.backup_pretty_urls', 'node_modules'}
pattern = re.compile(r'(?P<attr>href|src)=(?P<q>["\'])(?P<url>)(?P<path>(?!https?:|//|mailto:|tel:)[^"\']*?)index\.html(?P<frag>[#?][^"\']*)?(?P=q)', re.IGNORECASE)
# Note: pattern captures relative or root paths that end with index.html
changed_files = []
all_html = []
for dirpath, dirnames, filenames in os.walk(root):
    parts = dirpath.split(os.sep)
    if any(p in ignore_dirs for p in parts):
        continue
    for fn in filenames:
        if fn.lower().endswith('.html'):
            all_html.append(os.path.join(dirpath, fn))

for fp in all_html:
    try:
        with open(fp, 'r', encoding='utf-8') as f:
            txt = f.read()
    except Exception:
        continue
    def repl(m):
        attr = m.group('attr')
        q = m.group('q')
        path = m.group('path')
        frag = m.group('frag') or ''
        # ensure single trailing slash
        if path.endswith('/'):
            new = f"{attr}={q}{path}{frag}{q}"
        else:
            new = f"{attr}={q}{path}/{frag}{q}"
        return new
    new_txt, n = pattern.subn(repl, txt)
    if n:
        with open(fp, 'w', encoding='utf-8') as f:
            f.write(new_txt)
        changed_files.append((fp, n))
        print(f'Updated {n} links in {os.path.relpath(fp, root)}')

print('\nTotal files changed:', len(changed_files))
if '--commit' in sys.argv and changed_files:
    subprocess.run(['git','add'] + [c[0] for c in changed_files])
    subprocess.run(['git','commit','-m','chore: remove /index.html from internal links'])
    print('Committed changes')
