#!/usr/bin/env python3
import os, shutil, re, sys
root = os.getcwd()
backup_dir = os.path.join(root, '.backup_pretty_urls')
ignore_dirs = {'.git', '.backup_pretty_urls', 'node_modules'}

print('Workspace:', root)
# Create backup
if os.path.exists(backup_dir):
    print('Backup dir already exists:', backup_dir)
else:
    print('Creating backup...')
    os.makedirs(backup_dir)
    for dirpath, dirnames, filenames in os.walk(root):
        # skip backup and git
        parts = dirpath.split(os.sep)
        if any(p in ignore_dirs for p in parts):
            continue
        rel = os.path.relpath(dirpath, root)
        target_dir = os.path.join(backup_dir, rel) if rel != '.' else backup_dir
        os.makedirs(target_dir, exist_ok=True)
        for fn in filenames:
            src = os.path.join(dirpath, fn)
            dst = os.path.join(target_dir, fn)
            try:
                shutil.copy2(src, dst)
            except Exception as e:
                print('Warning copy failed', src, e)

# Find .html files to move (non-index)
moves = []
for dirpath, dirnames, filenames in os.walk(root):
    parts = dirpath.split(os.sep)
    if any(p in ignore_dirs for p in parts):
        continue
    for fn in filenames:
        if fn.lower().endswith('.html') and fn.lower() != 'index.html':
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, root).replace(os.sep, '/')
            moves.append((full, rel))

print(f'Found {len(moves)} .html files to convert (excluding index.html).')
# Perform moves
moved_paths = []
for full, rel in moves:
    dirpath = os.path.dirname(full)
    name = os.path.splitext(os.path.basename(full))[0]
    new_dir = os.path.join(dirpath, name)
    new_idx = os.path.join(new_dir, 'index.html')
    os.makedirs(new_dir, exist_ok=True)
    # If target exists, warn and skip
    if os.path.exists(new_idx):
        print('Target index exists, skipping move:', new_idx)
        continue
    try:
        shutil.move(full, new_idx)
        moved_paths.append((rel, (os.path.relpath(new_idx, root).replace(os.sep, '/'))))
        print('Moved', rel, '->', os.path.relpath(new_idx, root))
    except Exception as e:
        print('Failed to move', full, e)

# Update links in all html files
pattern = re.compile(r'(href|src)=(?P<q>["\'])(?!https?:|mailto:|tel:|//)(?P<path>[^"\']+?)\.html(?P<frag>#[^"\']*)?(?P=q)', re.IGNORECASE)
count_replacements = 0
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
    new_txt = pattern.sub(lambda m: f"{m.group(1)}={m.group('q')}{m.group('path')}/{m.group('frag') or ''}{m.group('q')}", txt)
    if new_txt != txt:
        with open(fp, 'w', encoding='utf-8') as f:
            f.write(new_txt)
        num = len(pattern.findall(txt))
        count_replacements += num
        print(f'Updated {num} links in', os.path.relpath(fp, root))

print('Total link replacements:', count_replacements)

# Final report
print('\nMoved files:')
for src, dst in moved_paths:
    print('-', src, '->', dst)

print('\nDone.')

# If run with --commit, run git commit
if '--commit' in sys.argv:
    print('Staging and committing changes...')
    os.system('git add -A')
    os.system('git commit -m "convert: pretty URLs"')
    print('Git commit executed.')
