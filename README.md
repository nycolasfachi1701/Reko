# Reko — plataforma de vídeos da Nstech

**Reko** é a plataforma interna de vídeos da Nstech. Todo usuário entra com **e-mail e senha**; o que muda é o papel: **espectador** (assiste ao feed), **gestor** (publica e analisa o desempenho) e **administrador** (cria contas, além do que o gestor faz). Contas são criadas pelo administrador em *Gestão → Usuários*. Construída fase a fase a partir de `SPEC.md`.

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

O seed cria um admin e dois espectadores para testes locais:

- **Admin —** e-mail `nycolas.fachi@nstech.com.br`, senha `admin1234`
- **Espectadores —** `ana@nstech.com.br` / `bruno@nstech.com.br`, senha `viewer1234`

Somente dev — troque em produção.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | `prisma generate` + build de produção |
| `npm run lint` | ESLint (config Next) |
| `npm test` | Testes de unidade (Vitest) |
| `npm run test:e2e` | Testes E2E (Playwright) — rode `npm run build` antes |
| `npm run db:migrate` | Aplica migrations em dev |
| `npm run db:seed` | Popula dados de exemplo |
| `npm run db:reset` | Reseta o banco e re-semeia |
| `npm run db:aggregate` | Agrega a retenção (job diário; roda via cron em prod) |
| `npm run db:studio` | Prisma Studio (inspeção do banco) |

### Testes E2E

O Playwright roda contra o build de produção (determinístico). Na primeira vez, instale o navegador:

```bash
npx playwright install chromium
```

Depois, a cada execução:

```bash
npm run build
npm run test:e2e
```

Dois fluxos: (a) espectador faz login, abre o vídeo e a visualização é registrada; (b) gestor faz login, publica um vídeo e confere o bloco Visualizações.

## Design

Tokens de marca centralizados em `src/app/globals.css` — trocar a paleta é editar um único bloco. A cor da marca (`--brand`, laranja Nstech `#ff6600`) é **acento**, nunca plano de fundo. Tema escuro é o principal; tema claro disponível via `[data-theme="light"]`.

## Autenticação

Todo acesso é por **e-mail + senha** (Argon2id). A sessão vive num cookie httpOnly assinado; no banco guardamos só o hash do token de sessão. O login tem rate limit (5 tentativas / 15 min por e-mail) e resposta genérica para não revelar quais e-mails existem. Papéis têm TTL de sessão distinto: espectador mais longo, gestor/admin mais curto (ver `VIEWER_SESSION_TTL_DAYS` / `MANAGER_SESSION_TTL_HOURS`).

Contas só são criadas pelo administrador (não há auto-cadastro). Um gate de UX no middleware barra rotas `/manage` sem cookie válido; a autorização definitiva (papel + sessão no banco) é feita por `requireRole()` nas páginas e actions.

## Estrutura

```
prisma/          schema.prisma + seed.ts
src/
  app/           App Router (layout, page, globals.css)
  lib/           db (Prisma client), utils
```
