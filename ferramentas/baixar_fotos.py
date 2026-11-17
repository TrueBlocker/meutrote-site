"""
Baixa as fotos do Parque do Trote do Wikimedia Commons (licença livre, com crédito) e dá um tratamento leve,
de foto de verdade: um pouco mais de contraste e calor, nada de filtro. Roda no GitHub Actions
(workflow "Baixar fotos do Wikimedia"); o resultado vai para img/fotos/ e é commitado.

As fotos editadas continuam sob a mesma licença CC BY-SA da original (o crédito fica no rodapé do site).
"""
import io
import json
import pathlib
import sys
import urllib.parse
import urllib.request

import numpy as np
from PIL import Image, ImageEnhance, ImageOps

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "img" / "fotos"
UA = "MeuTroteSite/1.0 (https://github.com/TrueBlocker/meutrote-site; projeto de extensao)"
LARGURA = 1600


def baixar(arquivo: str) -> Image.Image:
    nome = urllib.parse.quote(arquivo.replace(" ", "_"))
    url = f"https://commons.wikimedia.org/wiki/Special:FilePath/{nome}?width={LARGURA}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return Image.open(io.BytesIO(r.read()))


def tratar(im: Image.Image) -> Image.Image:
    im = ImageOps.exif_transpose(im).convert("RGB")
    if im.width > LARGURA:
        im = im.resize((LARGURA, round(im.height * LARGURA / im.width)), Image.LANCZOS)
    im = ImageEnhance.Contrast(im).enhance(1.06)
    im = ImageEnhance.Color(im).enhance(1.04)
    a = np.asarray(im).astype(np.float32)
    a[..., 0] *= 1.02  # dia nublado de 2016 fica menos azulado
    a[..., 2] *= 0.98
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def main() -> int:
    fotos = json.loads((RAIZ / "ferramentas" / "fotos.json").read_text(encoding="utf-8"))
    SAIDA.mkdir(parents=True, exist_ok=True)
    for f in fotos:
        im = tratar(baixar(f["arquivo"]))
        destino = SAIDA / f"{f['id']}.jpg"
        im.save(destino, quality=80, optimize=True, progressive=True)
        print(f"{destino.name}: {im.width}x{im.height}, {destino.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
