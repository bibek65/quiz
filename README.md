# Next.js Quiz App

Modern real-time multiplayer quiz application built with Next.js 14 App Router, Server Actions, PostgreSQL, and Socket.IO.

## Features

- **Next.js 14 App Router** — Server Components by default
- **Server Actions** — backend logic integrated with the frontend
- **Iron Session** — secure session management
- **Prisma ORM** — type-safe database access
- **PostgreSQL** — reliable data persistence
- **Socket.IO** — real-time updates for teams and spectators
- **TailwindCSS** — dark gradient UI

## Quick Start

### Local development

```bash
# Start the full stack (app, socket, postgres, nginx)
docker compose up -d

# Push database schema
docker compose --profile migrate run --rm migrate

# Open http://quiz.local (add quiz.local and socket.local to /etc/hosts)
```

### Usage

1. **Host Mode**: Go to `/host`, login with the password from `HOST_PASSWORD`
2. **Create Quiz**: Add teams, domains, and questions
3. **Team Mode**: Go to `/team`, enter the Quiz ID
4. **Join Team**: Select team and enter player name
5. **Play**: Host starts rounds, teams answer questions

## Project Structure

```
nextjs-quiz/
├── src/
│   ├── app/              # App Router pages
│   ├── components/       # React components
│   ├── hooks/            # Client hooks
│   └── lib/              # Server actions, DB, session
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Sample quiz data
├── scripts/              # Deployment helper scripts
├── server.js             # Integrated Next.js + Socket.IO server
├── socket-server.js      # Standalone Socket.IO server
├── Dockerfile            # Next.js app container
├── Dockerfile.socket     # Socket.IO server container
├── nginx.conf            # Production Nginx config (subdomains)
├── nginx.local.conf      # Local Nginx config
├── docker-compose.yml    # Local Docker stack
├── docker-compose.prod.yml # Production Docker stack
├── docker-compose.azure.yml # Azure Docker stack
├── init-letsencrypt.sh   # SSL certificate setup
├── AZURE_DEPLOY.md       # Azure VM deployment guide
├── DOCKER_DEPLOY.md      # Docker Compose split-domain guide
└── .github/workflows/    # GitHub Actions
```

## Environment Variables

### Local development

```env
DATABASE_URL="postgresql://quizuser:quizpass@localhost:5432/quizdb?schema=public"
SESSION_SECRET="your-secret-key-min-32-chars"
HOST_PASSWORD="admin123"

NEXT_PUBLIC_SOCKET_URL="http://socket.local"
NEXT_PUBLIC_SOCKET_PATH="/socket.io"
SOCKET_EMIT_URL="http://socket:4000/emit"
```

### Production

See `.env.production.example` for the full production template.

## Deployment

### Docker Compose (recommended)

Full instructions are in [`DOCKER_DEPLOY.md`](DOCKER_DEPLOY.md).

- App: `https://quiz.pokhrelmilan.com.np`
- Socket: `https://socket.pokhrelmilan.com.np`
- Server: 2 vCPUs, 4 GB RAM

```bash
# 1. Configure .env
cp .env.production.example .env

# 2. Get SSL certificates
./init-letsencrypt.sh

# 3. Push database schema
docker compose -f docker-compose.prod.yml --profile migrate run --rm migrate

# 4. Start everything
docker compose -f docker-compose.prod.yml up -d
```

### Azure VM

Full instructions are in [`AZURE_DEPLOY.md`](AZURE_DEPLOY.md).

Quick overview:

1. Provision an Azure VM and Azure Database for PostgreSQL Flexible Server
2. Use `cloud-init.yaml` as the VM custom data
3. SSH into the VM, copy the app, and run `./azure-vm-setup.sh`
4. Push the database schema with `npx prisma db push`
5. Configure Nginx and SSL with `certbot`

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Prisma
- PostgreSQL
- TailwindCSS
- Iron Session
- Socket.IO
- Docker
- Nginx

## Scripts

| Script | Purpose |
|--------|---------|
| `azure-vm-setup.sh` | One-time Azure VM setup |
| `init-letsencrypt.sh` | Set up Let's Encrypt SSL certificates |
| `scripts/update-app.sh` | Update the app after code changes |
| `scripts/setup-swap.sh` | Add swap on low-RAM VMs |

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start Next.js only
npm run db:push      # Push Prisma schema
npm run db:seed      # Seed sample quiz
npm run db:reset     # Reset DB and seed
node server.js       # Run integrated production server
node socket-server.js # Run standalone socket server
```

## CI/CD

A GitHub Actions workflow is provided in `.github/workflows/deploy.yml`. Configure these secrets:

- `AZURE_VM_HOST` — VM public IP or domain
- `AZURE_VM_USER` — SSH username (e.g., `quizapp`)
- `AZURE_VM_SSH_KEY` — private SSH key

---

Built with ❤️ using Next.js Server Actions
