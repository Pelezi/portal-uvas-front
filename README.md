# Gerenciador de Orçamento - Front-end

Uma aplicação web moderna de gerenciamento de orçamento inspirada no Google Sheets, construída com **React**, **Next.js 15**, **TypeScript**, **Tailwind CSS** e **Turbopack**.

## Funcionalidades

- 📊 **Gerenciador de Transações** - Operações CRUD para transações com filtragem avançada
- 🏷️ **Gerenciador de Categorias** - Layout de dois painéis para gerenciar categorias e subcategorias
- 📈 **Planilha de Orçamento** - Grade editável estilo Google Sheets para orçamentos mensais
- 📉 **Revisão Anual** - Dashboard abrangente com gráficos e métricas de desempenho
- 👥 **Gerenciamento de Grupos** - Crie e gerencie orçamentos compartilhados com equipes
- 🔐 **Autenticação JWT** - Autenticação segura baseada em tokens
- 🎨 **Interface Moderna** - Design limpo e responsivo inspirado no Google Sheets
- ⚡ **Desenvolvimento Rápido** - Powered by Turbopack para HMR ultra-rápido
- 🌙 **Modo Escuro** - Suporte completo ao modo escuro

## Stack Tecnológico

- **Framework**: Next.js 15 (App Router)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS 4
- **Gerenciamento de Estado**: Zustand + React Query
- **Gráficos**: Recharts
- **Ícones**: Lucide React
- **Notificações UI**: React Hot Toast

## Começando

### Pré-requisitos

- Node.js 18+ e npm
- API Backend rodando em `http://localhost:8080/api/v1` (configurável)

### Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd money-manager-front
```

2. Instale as dependências:
```bash
npm install
```

3. Crie o arquivo de ambiente:
```bash
cp .env.example .env.local
```

4. Atualize o `.env.local` com o endpoint da sua API:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
```

5. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador para ver o resultado.

## Estrutura do Projeto

```
src/
├── app/                    # Páginas do Next.js App Router
│   ├── (app)/            # Rotas protegidas da aplicação
│   │   ├── transactions/ # Gerenciamento de transações
│   │   ├── categories/   # Gerenciamento de categorias e subcategorias
│   │   ├── budget/       # Planilha de orçamento
│   │   ├── annual-review/# Dashboard anual
│   │   ├── groups/       # Gerenciamento de grupos e orçamentos compartilhados
│   │   ├── notifications/# Notificações do usuário
│   │   ├── invitations/  # Convites para grupos
│   │   ├── profile/      # Perfil do usuário
│   │   └── settings/     # Configurações do usuário
│   ├── auth/             # Páginas de autenticação
│   └── globals.css       # Estilos globais
├── components/            # Componentes React reutilizáveis
├── contexts/             # Contextos React (Auth, Theme)
├── lib/                  # Utilitários e stores
├── services/             # Camada de serviços da API
└── types/                # Definições de tipos TypeScript
```

## Endpoints da API

A aplicação espera os seguintes endpoints da API:

- `POST /api/v1/users/login` - Autenticação de usuário
- `GET/POST/PUT/DELETE /api/v1/categories` - Gerenciamento de categorias
- `GET/POST/PUT/DELETE /api/v1/subcategories` - Gerenciamento de subcategorias
- `GET/POST/PUT/DELETE /api/v1/expenses` - Gerenciamento de orçamento/despesas
- `GET /api/v1/expenses/comparison` - Comparação orçamento vs real
- `GET/POST/PUT/DELETE /api/v1/transactions` - Gerenciamento de transações
- `GET /api/v1/transactions/aggregated` - Dados agregados de transações

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento com Turbopack
- `npm run build` - Faz o build para produção
- `npm start` - Inicia o servidor de produção
- `npm run lint` - Executa o ESLint

## Funcionalidades em Detalhes

### Gerenciador de Transações
- Visualize todas as transações com filtragem por período, tipo e subcategoria
- Edição inline e ordenação
- Criar, editar e excluir transações
- Tipos de transação codificados por cores (renda/despesa)

### Gerenciador de Categorias
- Interface de dois painéis com categorias à esquerda e subcategorias à direita
- Abas separadas para despesas e rendas
- Criação e gerenciamento fácil de categorias hierárquicas

### Planilha de Orçamento
- Grade editável inspirada no Google Sheets
- Linhas representam categorias/subcategorias
- Colunas representam meses (Jan-Dez)
- Indicadores de cor para status do orçamento (verde=dentro, amarelo=perto do limite, vermelho=acima)
- Clique para editar células individuais com salvamento automático
- Comparação em tempo real: orçado vs. real

### Revisão Anual
- Cards resumindo renda total, despesas e economia líquida
- Gráfico de linha para tendências mensais
- Gráfico de pizza para distribuição por categoria
- Gráfico de barras para comparação renda vs. despesa
- Tabela de desempenho mostrando orçado vs. real por categoria

### Gerenciamento de Grupos
- Crie grupos para compartilhar orçamentos com equipes
- Sistema de convites e notificações
- Gerenciamento de membros e permissões
- Funções personalizadas com controle granular de acesso

## Saiba Mais

Para aprender mais sobre as tecnologias usadas:

- [Documentação Next.js](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zustand](https://github.com/pmndrs/zustand)
- [React Query](https://tanstack.com/query/latest)
- [Recharts](https://recharts.org/)

## Licença

This project is licensed under the MIT License.
