# Brasa & Gelo — cardápio digital (demonstração)

`cardapio.html` é um ficheiro único (HTML + CSS + JS + fotos em base64, ~320 KB)
que funciona sozinho: basta abri-lo ou publicá-lo num alojamento estático.

## Atualizar fotos, textos ou preços

- Fotos: substitui os ficheiros em `imagens/` (mesmos nomes). Se juntares
  `imagens/hotdog.jpeg`, a ilustração do hot dog é trocada pela foto.
- Textos, preços e número de WhatsApp: edita `template.html` (constantes
  `MENU` e `WHATSAPP`).
- Depois gera de novo: `pip install pillow && python3 build.py`
