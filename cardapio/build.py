#!/usr/bin/env python3
"""Gera cardapio.html (ficheiro único) a partir de template.html e ./imagens.

As fotos são reduzidas para no máx. 800px de largura, convertidas para WebP e
embutidas em base64 por inteiro (para a vista ampliada); os cartões mostram
uma zona 4:3 de cada uma. Requer Pillow (pip install pillow).

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
FULL_QUALITY = 66
# corta a marca de água no fundo da foto (fração da altura)
TRIM_BOTTOM = {"burger-classico.jpeg": 0.07}

# chave -> (ficheiro, centro vertical da zona 4:3 mostrada no cartão; 0 = topo, 1 = fundo).
PHOTOS = {
    "burger-bacon": ("burger-bacon.jpeg", 0.50),
    "burger-classico": ("burger-classico.jpeg", 0.71),
    "hotdog": ("hotdog.jpeg", 0.52),
    "pizza": ("pizza.jpeg", 0.50),
    "picole-chocolate": ("picole-chocolate.jpeg", 0.36),
    "picole-trio": ("picole-trio.jpeg", 0.56),
    # recorte extra do picolé de cima (amendoim + caramelo) da foto do trio
    "picole-amendoim": ("picole-trio.jpeg", None),
}


def encode(img: Image.Image, quality: int) -> str:
    if img.width > MAX_W:
        img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "WEBP", quality=quality, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def load_photos() -> dict:
    """Devolve {"files": {ficheiro: data-uri}, "items": {chave: {...}}}.

    Cada foto é embutida uma só vez e por inteiro (para a vista ampliada). O
    cartão mostra-a em 4:3 com object-position; o picolé de amendoim usa um
    recorte próprio porque é um detalhe da foto do trio.
    """
    files, items = {}, {}
    for key, (name, cy) in PHOTOS.items():
        path = IMG_DIR / name
        if not path.exists():
            print(f"  aviso: {name} não encontrado — usa-se ilustração")
            continue
        img = Image.open(path).convert("RGB")
        if name in TRIM_BOTTOM:
            img = img.crop((0, 0, img.width, round(img.height * (1 - TRIM_BOTTOM[name]))))
        if name not in files:
            files[name] = encode(img, FULL_QUALITY)
            print(f"  {name}: {len(files[name]) // 1024} KB")
        item = {"file": name}
        if cy is None:
            # picolé de cima da foto do trio (zona com amendoim e caramelo)
            w = img.width
            box_w = round(w * 0.72)
            box_h = round(box_w * 3 / 4)
            x0 = round(w * 0.08)
            y0 = round(img.height * 0.10)
            item["src"] = encode(img.crop((x0, y0, x0 + box_w, y0 + box_h)), QUALITY)
            print(f"  {key} (recorte): {len(item['src']) // 1024} KB")
        else:
            w, h = img.size
            ch = w * 3 / 4
            top = min(max(h * cy - ch / 2, 0), h - ch)
            item["pos"] = f"50% {100 * top / (h - ch):.1f}%" if h > ch else "50% 50%"
        items[key] = item
    return {"files": files, "items": items}


def main() -> None:
    photos = load_photos()
    html = (ROOT / "template.html").read_text(encoding="utf-8")
    html = html.replace("/*__PHOTOS__*/{files: {}, items: {}}", json.dumps(photos, separators=(",", ":")))
    out = ROOT / "cardapio.html"
    out.write_text(html, encoding="utf-8")
    print(f"cardapio.html: {out.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
