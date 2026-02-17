#!/usr/bin/env python3
import os, re
from urllib.parse import urlparse
root = os.getcwd()
sitemap = os.path.join(root, 'sitemap.xml')
if not os.path.exists(sitemap):
    print('sitemap.xml not found')
    raise SystemExit(1)

with open(sitemap, 'r', encoding='utf-8') as f:
    txt = f.read()

locs = re.findall(r'<loc>(.*?)</loc>', txt)
updated = 0
new_txt = txt
for loc in locs:
    parsed = urlparse(loc)
    path = parsed.path  # includes leading /
    # If path ends with /index.html -> replace with /
    if path.endswith('/index.html'):
        newpath = path[:-len('index.html')]
        newloc = parsed._replace(path=newpath).geturl()
        new_txt = new_txt.replace(loc, newloc)
        updated += 1
        continue
    # If path ends with .html, check if corresponding folder/index.html exists
    if path.endswith('.html'):
        # remove leading /
        rel = path.lstrip('/')
        # map to folder variant
        name = os.path.splitext(rel)[0]
        candidate = os.path.join(root, name, 'index.html')
        if os.path.exists(candidate):
            # use folder path
            newpath = '/' + name + '/'
            newloc = parsed._replace(path=newpath).geturl()
            new_txt = new_txt.replace(loc, newloc)
            updated += 1

if updated:
    bak = sitemap + '.bak'
    print('Updating sitemap.xml —', updated, 'entries to change. Backup at', bak)
    open(bak, 'w', encoding='utf-8').write(txt)
    open(sitemap, 'w', encoding='utf-8').write(new_txt)
else:
    print('No changes needed')

# git add and commit
import sys, subprocess
if '--commit' in sys.argv:
    subprocess.run(['git', 'add', 'sitemap.xml'])
    subprocess.run(['git', 'commit', '-m', 'fix: sitemap pretty URLs'])
    print('Committed sitemap.xml')
