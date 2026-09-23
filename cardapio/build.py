#!/usr/bin/env python3
"""Gera cardapio.html (ficheiro único) a partir de template.html e ./imagens.

As fotos são recortadas em 4:3, reduzidas para no máx. 800px de largura,
convertidas para WebP e embutidas em base64. Requer Pillow (pip install pillow).

Uso: python3 build.py
"""
import base64
import io
import json
import pathlib

from PIL import Image

ROOT = pathlib.Path(__file__).parent
IMG_DIR = ROOT / "imagens"
MAX_W = 800
QUALITY = 68

# chave -> (ficheiro, centro vertical do recorte 4:3; 0 = topo, 1 = fundo).
# O recorte usa a largura total da foto e a altura correspondente a 4:3.
PHOTOS = {
    "burger-bacon": ("burger-bacon.jpeg", 0.50),
    "burger-classico": ("burger-classico.jpeg", 0.66),
    "hotdog": ("hotdog.jpeg", 0.50),
    "pizza": ("pizza.jpeg", 0.50),
    "picole-chocolate": ("picole-chocolate.jpeg", 0.36),
    "picole-trio": ("picole-trio.jpeg", 0.56),
    # recorte extra do picolé de cima (amendoim + caramelo) da foto do trio
    "picole-amendoim": ("picole-trio.jpeg", None),
}


def encode(img: Image.Image) -> str:
    if img.width > MAX_W:
        img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "WEBP", quality=QUALITY, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def crop_43(img: Image.Image, cy: float) -> Image.Image:
    w, h = img.size
    ch = round(w * 3 / 4)
    top = min(max(round(h * cy - ch / 2), 0), h - ch)
    return img.crop((0, top, w, top + ch))


def load_photos() -> dict:
    out = {}
    for key, (name, cy) in PHOTOS.items():
        path = IMG_DIR / name
        if not path.exists():
            print(f"  aviso: {name} não encontrado — usa-se ilustração")
            continue
        img = Image.open(path).convert("RGB")
        if cy is None:
            # picolé de cima da foto do trio (zona com amendoim e caramelo)
            w = img.width
            box_w = round(w * 0.72)
            box_h = round(box_w * 3 / 4)
            x0 = round(w * 0.08)
            y0 = round(img.height * 0.10)
            img = img.crop((x0, y0, x0 + box_w, y0 + box_h))
        else:
            img = crop_43(img, cy)
        out[key] = encode(img)
        print(f"  {key}: {len(out[key]) // 1024} KB")
    return out


def main() -> None:
    photos = load_photos()
    html = (ROOT / "template.html").read_text(encoding="utf-8")
    html = html.replace("/*__PHOTOS__*/{}", json.dumps(photos, separators=(",", ":")))
    out = ROOT / "cardapio.html"
    out.write_text(html, encoding="utf-8")
    print(f"cardapio.html: {out.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
