# Nurya — Table and Bar

Site de apresentação do **Nurya**, um protótipo de casa/bar com culinária do Oriente Médio, em Curitiba. *"Nurya"* pode ser interpretado como "a que traz luz".

##  Este é um protótipo

Este repositório contém uma **demonstração visual** do site — não é a versão final nem um produto pronto para produção. Foi construído para apresentar o conceito e a direção criativa da marca em reunião, e segue em desenvolvimento: textos, fotos, cardápio, sistema de reserva e outros detalhes ainda vão evoluir.

## O que tem no site

- **Hero com sequência animada** — uma sequência de 156 quadros de vídeo controlada pela rolagem da página, mostrando o preparo de um dos pratos
- **A Casa** — manifesto/filosofia da marca
- **Ambiente** — clima do espaço físico
- **Equipe** — chef, subchef, bartender e diretor criativo por trás da casa
- **Cardápio** — cards de pratos que expandem em tela cheia ao clicar, com detalhes de cada prato
- **Reserva** — chamada final para reservar mesa

## Tecnologia

HTML, CSS e JavaScript puro — sem frameworks, sem dependências de build. Todas as fotos vêm embutidas direto no HTML (base64), e a fonte da marca (Anglerhand) é carregada localmente pela pasta `fonts/`. A sequência de imagens do hero fica na pasta `frames/`.

## Como rodar localmente

Não precisa de instalação nenhuma — é só abrir o `index.html` num navegador. Para testar como fica num celular na mesma rede, rode um servidor local simples a partir desta pasta:

```
python3 -m http.server 8000
```

E acesse pelo IP do computador no navegador do celular (ex: `http://192.168.1.23:8000`).

## Estrutura

```
index.html      → estrutura e conteúdo do site
styles.css      → estilos e animações
script.js       → sequência animada, cards do cardápio, efeitos de rolagem
fonts/          → fonte Anglerhand (marca)
frames/         → 156 quadros da sequência animada do hero
```

---

*Protótipo em desenvolvimento — 2025/2026.*
