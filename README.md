# Site do MeuTrote

Site de apresentação do **MeuTrote**, o app gratuito da comunidade do Parque do Trote (Vila Guilherme, São Paulo).

- HTML, CSS e JS puros, sem build, sem cookies e sem nada de terceiros (as fontes ficam no próprio site).
- Publicado pelo GitHub Pages a partir da branch `main`.
- O botão "Baixar a versão de teste" aponta para `…/api/v1/public/app/android/download`, que sempre redireciona para o APK mais recente.
- A faixa de cima mostra se o parque está aberto (servidor do app; se ele demorar, usa o horário oficial 5h30–22h).

## Fotos

- `pista`, `coruja`, `passaro`, `ceu`, `lago`: fotos do Esdras.
- `estabulos`, `pergola`, `pista-antiga`, `casa`: Wikimedia Commons, CC BY-SA (créditos em `ferramentas/fotos.json` e no rodapé).
  Para trocar a lista: edite `ferramentas/fotos.json` e rode o workflow **Baixar fotos do Wikimedia** em Actions.

## Fontes

Archivo e Atkinson Hyperlegible, ambas sob a SIL Open Font License (licenças em `fonts/`).

## Painel de administração (`/painel/`)

Painel web para a administração do parque (só contas ADMIN). Código em `painel-src/` (React + TypeScript + Vite);
o build sai em `painel/`, que é o que o GitHub Pages publica.

```bash
cd painel-src
npm ci
npm run build   # confere os tipos e gera ../painel
```

Segurança:
- entrada sempre em duas etapas: senha e depois chave de acesso (rosto, digital ou PIN do computador) ou código do autenticador;
- token de acesso de 15 min só na memória; renovação na aba (some ao fechar), sessão de no máximo 8 h e 30 min parada encerra;
- sessões podem ser vistas e encerradas pelo próprio painel; toda entrada e alteração vai para o histórico;
- política de segurança da página só deixa falar com o servidor do app; o painel não abre dentro de outro site; `noindex`.

As chaves de acesso ficam presas ao endereço `trueblocker.github.io`. Ao mudar para um domínio próprio, troque
`APP_WEBAUTHN_RP_ID`/`APP_WEBAUTHN_ORIGINS` no servidor e cadastre as chaves de novo.
