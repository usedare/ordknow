from __future__ import annotations

import math
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image, ImageDraw


PDF = Path(r"D:\OrdKnow\docs\序知_AI个人体系化知识库_软件工程文档合订本_去AI味修订版.pdf")
OUT = Path(r"D:\OrdKnow\docs\final_revised_rendered")


def main() -> None:
    OUT.mkdir(exist_ok=True)
    pdf = pdfium.PdfDocument(str(PDF))
    thumbs: list[tuple[int, Image.Image]] = []
    print(f"pages {len(pdf)}")
    for i, page in enumerate(pdf, 1):
        image = page.render(scale=1.4).to_pil()
        image.save(OUT / f"page-{i:03d}.png")
        thumb = image.copy()
        thumb.thumbnail((220, 300))
        thumbs.append((i, thumb.copy()))

    cols = 5
    rows = math.ceil(len(thumbs) / cols)
    sheet = Image.new("RGB", (cols * 260, rows * 340), "white")
    draw = ImageDraw.Draw(sheet)
    for idx, (num, thumb) in enumerate(thumbs):
        x = (idx % cols) * 260 + 20
        y = (idx // cols) * 340 + 20
        sheet.paste(thumb, (x, y))
        draw.text((x, y + thumb.height + 4), str(num), fill=(0, 0, 0))
    sheet.save(OUT / "contact-sheet.png")
    print(OUT / "contact-sheet.png")


if __name__ == "__main__":
    main()
