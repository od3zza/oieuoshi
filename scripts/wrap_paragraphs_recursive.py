#!/usr/bin/env python3
"""Recursively wrap stray text nodes under <section class="main"> with <p>.

Creates a backup for each modified file with suffix .pwraprecbak.
Skips text inside excluded tags: pre, code, script, style and common inline/heading tags.
"""
import sys
from pathlib import Path
import shutil
import re

try:
    from bs4 import BeautifulSoup, NavigableString
except Exception:
    print("BeautifulSoup4 is required. Please run: pip install beautifulsoup4")
    raise


EXCLUDE_TAGS = {"pre", "code", "script", "style"}
INLINE_OR_HEADING = {
    "a",
    "strong",
    "em",
    "span",
    "b",
    "i",
    "u",
    "small",
    "sub",
    "sup",
    "label",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
}
BLOCK_PARENT_TAGS = {
    "div",
    "section",
    "article",
    "header",
    "footer",
    "main",
    "aside",
    "blockquote",
    "figcaption",
    "td",
    "th",
    "li",
}


def has_excluded_ancestor(tag, stop, excluded):
    curr = tag
    while curr and curr is not stop:
        if getattr(curr, "name", None) in excluded:
            return True
        curr = curr.parent
    return False


def should_wrap_string(s, parent, section):
    if not s or not s.strip():
        return False
    if parent is None:
        return False
    pname = getattr(parent, "name", None)
    if pname == "p":
        return False
    if pname in INLINE_OR_HEADING:
        return False
    if has_excluded_ancestor(parent, section, EXCLUDE_TAGS):
        return False
    if pname in BLOCK_PARENT_TAGS:
        return True
    # If parent is not a known inline tag but sits directly under section, wrap it
    # e.g., NavigableString directly under section
    if parent == section:
        return True
    return False


def process_file(path: Path):
    text = path.read_text(encoding="utf-8")
    if "<section" not in text:
        return False

    soup = BeautifulSoup(text, "html.parser")
    modified = False

    sections = []
    for sec in soup.find_all("section"):
        cls = sec.get("class") or []
        if any("main" == c or c == "main" or "main" in c.split() for c in cls):
            sections.append(sec)

    for section in sections:
        # Iterate over all NavigableStrings under this section
        for s in list(section.find_all(string=True)):
            if not isinstance(s, NavigableString):
                continue
            parent = s.parent
            if should_wrap_string(s, parent, section):
                content = str(s)
                # preserve leading/trailing whitespace around text node
                leading = re.match(r"^\s*", content).group(0)
                trailing = re.match(r".*?(\s*)$", content).group(1)
                inner = content.strip()
                if not inner:
                    continue
                ptag = soup.new_tag("p")
                ptag.string = inner
                # replace the string node with [leading][ptag][trailing]
                insert_nodes = []
                if leading:
                    insert_nodes.append(leading)
                insert_nodes.append(ptag)
                if trailing:
                    insert_nodes.append(trailing)

                # perform replacement carefully
                last = None
                for node in insert_nodes:
                    if isinstance(node, str):
                        new = NavigableString(node)
                    else:
                        new = node
                    parent.insert_before(new)
                    last = new
                s.extract()
                modified = True

    if modified:
        backup = path.with_suffix(path.suffix + ".pwraprecbak")
        shutil.copy(path, backup)
        path.write_text(str(soup), encoding="utf-8")
        print(f"Modified: {path}")
        return True
    return False


def main():
    root = Path(".")
    html_files = list(root.rglob("*.html"))
    changed = []
    for f in html_files:
        try:
            if process_file(f):
                changed.append(str(f))
        except Exception as e:
            print(f"Error processing {f}: {e}")

    print(f"Total modified files: {len(changed)}")


if __name__ == "__main__":
    main()
