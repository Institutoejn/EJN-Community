# EJN Social - Rede Gamificada

Uma rede social corporativa gamificada desenvolvida para o Instituto Escola Jovens de Negócios.

## 🚀 Setup do Projeto

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar Supabase
1. Crie um novo projeto em [supabase.com](https://supabase.com)
2. Copie o arquivo `.env.example` para `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com suas credenciais do projeto Supabase.
4. Vá até o **SQL Editor** no painel do Supabase e execute o conteúdo do arquivo `database/schema.sql` para criar as tabelas e políticas de segurança.

### 3. Rodar localmente
```bash
npm run dev
```

### 4. Build para produção
```bash
npm run build
```

## 📊 Estrutura do Banco de Dados

O banco de dados utiliza PostgreSQL via Supabase com as seguintes tabelas principais:

- **users**: Perfis estendidos (vinculados ao `auth.users`), contendo XP, nível, badges e dados sociais.
- **posts**: Feed de notícias com suporte a imagens e fixação.
- **comments**: Interações nos posts.
- **likes**: Tabela de relacionamento para curtidas.
- **missions**: Sistema de gamificação com missões diárias e conquistas.
- **rewards**: Catálogo de loja para troca de EJN Coins.
- **follows**: Sistema de seguidores/seguindo.
- **settings**: Configurações globais da plataforma (regras de XP, nome, etc).

## 🎨 Design System

O projeto utiliza **Tailwind CSS** com uma paleta customizada inspirada no design Apple ("Glassmorphism", sombras suaves) e nas cores da marca EJN (Ouro, Verde Petróleo).

- **Font**: Poppins
- **Icons**: Lucide React
- **Estilo**: Clean, Minimalista, Foco em Conteúdo
