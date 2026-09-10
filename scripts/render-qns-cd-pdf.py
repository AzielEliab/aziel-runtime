#!/usr/bin/env python3
"""Render docs/designs/QNS-CD-1.0.md to a simple text PDF. Author: Aziel Eliab only."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs/designs/QNS-CD-1.0.md"
OUT = ROOT / "docs/designs/QNS-CD-1.0.pdf"

PAGE_W, PAGE_H = 612, 792
MARGIN = 54
LINE_H = 11
FONT_SIZE = 9
CHARS = 92


def escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def wrap_lines(text: str):
    lines = []
    for raw in text.splitlines():
        row = raw.replace("\t", "    ").rstrip()
        if not row:
            lines.append("")
            continue
        while len(row) > CHARS:
            cut = row.rfind(" ", 0, CHARS)
            if cut < 40:
                cut = CHARS
            lines.append(row[:cut])
            row = row[cut:].lstrip()
        lines.append(row)
    return lines


def page_stream(lines, page_no, pages):
    y = PAGE_H - MARGIN
    cmds = ["BT", "/F1 %d Tf" % FONT_SIZE, "%d %d Td" % (MARGIN, y)]
    first = True
    used = 0
    for line in lines:
        if not first:
            cmds.append("0 -%d Td" % LINE_H)
        first = False
        cmds.append("(%s) Tj" % escape(line if line else " "))
        used += 1
        y -= LINE_H
        if y < MARGIN + 24:
            break
    cmds.append("ET")
    footer_y = 28
    cmds.append("BT")
    cmds.append("/F1 8 Tf")
    cmds.append("%d %d Td" % (MARGIN, footer_y))
    cmds.append("(%s) Tj" % escape("QNS-CD-1.0  ·  Aziel Eliab only  ·  page %d / %d" % (page_no, pages)))
    cmds.append("ET")
    return "\n".join(cmds), used


def build_pdf(pages_content):
    objs = []
    objs.append("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj")
    kids = " ".join("%d 0 R" % (3 + i * 2) for i in range(len(pages_content)))
    objs.append("2 0 obj << /Type /Pages /Kids [%s] /Count %d >> endobj" % (kids, len(pages_content)))
    font_id = 3 + len(pages_content) * 2
    next_id = 3
    for stream in pages_content:
        data = stream.encode("latin-1", "replace")
        page_id = next_id
        content_id = next_id + 1
        objs.append(
            "%d 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 %d %d] /Contents %d 0 R /Resources << /Font << /F1 %d 0 R >> >> >> endobj"
            % (page_id, PAGE_W, PAGE_H, content_id, font_id)
        )
        objs.append("%d 0 obj << /Length %d >> stream\n%s\nendstream endobj" % (content_id, len(data), stream))
        next_id += 2
    objs.append("%d 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Courier >> endobj" % font_id)
    body = "\n".join(objs) + "\n"
    offsets = [0]
    acc = "%PDF-1.4\n"
    for obj in objs:
        offsets.append(len(acc))
        acc += obj + "\n"
    xref_pos = len(acc)
    acc += "xref\n0 %d\n" % (len(objs) + 1)
    acc += "0000000000 65535 f \n"
    for off in offsets[1:]:
        acc += "%010d 00000 n \n" % off
    acc += "trailer << /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, xref_pos)
    return acc.encode("latin-1", "replace")


def main():
    text = SRC.read_text(encoding="utf-8")
    lines = wrap_lines(text)
    usable = int((PAGE_H - MARGIN - 40) / LINE_H)
    chunks = [lines[i : i + usable] for i in range(0, len(lines), usable)] or [[""]]
    streams = []
    for i, chunk in enumerate(chunks, 1):
        stream, _ = page_stream(chunk, i, len(chunks))
        streams.append(stream)
    OUT.write_bytes(build_pdf(streams))
    print("wrote", OUT, "pages", len(streams))


if __name__ == "__main__":
    main()
