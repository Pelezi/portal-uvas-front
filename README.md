# Videira Caruaru — Frontend

Este diretório contém o frontend da aplicação "Videira Caruaru" (Next.js + React + Tailwind). Fornece a interface para gerenciar células, membros, relatórios de presença e usuários.

## Sumário

- [Requisitos](#requisitos)
- [Rodando localmente](#rodando-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Integração com o backend](#integração-com-o-backend)
- [Notificações (Toaster)](#notificações-toaster)
- [Contribuição rápida](#contribuição-rápida)

## Requisitos

- Node.js 18+ e npm

## Rodando localmente

1. Instale dependências:

```powershell
cd videira-caruaru-front
npm install
```

2. Inicie o servidor de desenvolvimento:

```powershell
npm run dev
```

Acesse: `http://localhost:3000`

Para build/produção:

```powershell
npm run build
npm run start
```

## Variáveis de ambiente

Crie um arquivo `.env.local` (ou similar) na raiz do frontend com a URL do backend:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

Observação: o `apiClient` do frontend pode também definir a URL base diretamente em `src/lib/apiClient.ts`.

## Estrutura do projeto

- `src/app/` — rotas/pages (Next.js App Router). Rotas notáveis: `auth`, `(app)/report`, `(app)/users`, `(app)/celulas`, `(app)/members`.
- `src/components/` — componentes reutilizáveis (Sidebar, Dashboard, Providers, etc.).
- `src/services/` — serviços que fazem chamadas HTTP ao backend (`userService`, `celulasService`, `membersService`, `reportsService`).
- `src/lib/` — utilitários (ex.: `apiClient.ts`, `store.ts`, timezone helpers).

## Integração com o backend

- A aplicação consome a API do backend (ver `NEXT_PUBLIC_API_BASE_URL`).
- Endpoints usados (resumo):
	- `GET /celulas`, `GET /celulas/:id` — células
	- `GET /members?celulaId=...` — membros por célula
	- `POST /reports` — criar relatório de presença
	- `GET/POST/PUT/DELETE /users` — gerenciamento de usuários

Confira `src/services` para a lista completa e assinatura das chamadas.

## Notificações (Toaster)

O projeto usa `react-hot-toast` para mensagens. Garanta que exista um `<Toaster />` montado no root (por exemplo em `src/app/layout.tsx` ou em `src/app/(app)/Providers.tsx`). Exemplo mínimo:

```tsx
import { Toaster } from 'react-hot-toast';

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html>
			<body>
				{children}
				<Toaster position="top-right" />
			</body>
		</html>
	);
}
```

## Contribuição rápida

- Para editar chamadas à API: `src/services/*`.
- Para adicionar componentes: `src/components/`.
- Para estilos, siga as classes Tailwind já existentes.

Se desejar, posso adicionar automaticamente o `<Toaster />` ao layout ou incluir exemplos de testes end-to-end.
├── services/             # Camada de serviços da API
