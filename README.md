# Plataforma de Vídeos — Nstech

Plataforma interna de vídeos com dois papéis: **espectador** (entra por link, assiste, comenta, reage) e **gestor** (faz login, publica, analisa desempenho). Construída fase a fase a partir de `SPEC.md`.

## Stack

Next.js (App Router) + TypeScript strict · Tailwind CSS com tokens em CSS custom properties · PostgreSQL + Prisma · Vitest + Playwright.

## Setup (dev)

Pré-requisitos: Node.js LTS e PostgreSQL rodando localmente.

```bash
npm install
cp .env.example .env   # e ajuste DATABASE_URL / segredos
npm run db:migrate     # aplica as migrations
npm run db:seed        # popula 1 admin + 2 espectadores + 3 vídeos
npm run dev            # http://localhost:3000
```

### Credenciais de desenvolvimento

O seed cria um admin para testes locais:

- **E-mail:** `nycolas.fachi@nstech.com.br`
- **Senha:** `admin1234` (somente dev — troque em produção)

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | `prisma generate` + build de produção |
| `npm run lint` | ESLint (config Next) |
| `npm test` | Testes de unidade (Vitest) |
| `npm run db:migrate` | Aplica migrations em dev |
| `npm run db:seed` | Popula dados de exemplo |
| `npm run db:reset` | Reseta o banco e re-semeia |
| `npm run db:studio` | Prisma Studio (inspeção do banco) |

## Design

Tokens de marca centralizados em `src/app/globals.css` — trocar a paleta é editar um único bloco. A cor da marca (`--brand`, laranja Nstech `#ff6600`) é **acento**, nunca plano de fundo. Tema escuro é o principal; tema claro disponível via `[data-theme="light"]`.

## ⚠️ Aviso de segurança — acesso do espectador por link

O espectador entra por um **link sem senha** (`/enter/<token>`). É conveniente e frágil ao mesmo tempo: **quem tiver o link, entra**. Mitigações já embutidas: token de uso único, com expiração (TTL padrão 7 dias), armazenado só como hash SHA-256, com rate limit e redirecionamento 302 para tirar o token da barra de endereço.

Se a plataforma passar a hospedar conteúdo sensível, migrar para **link mágico enviado por e-mail** — aí o e-mail passa a ser o segundo fator.

## Estrutura

```
prisma/          schema.prisma + seed.ts
src/
  app/           App Router (layout, page, globals.css)
  lib/           db (Prisma client), utils
```
