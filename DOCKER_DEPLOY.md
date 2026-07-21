# Docker Compose Deployment (Split Domain)

This guide deploys the quiz app using Docker Compose on a single server, with separate subdomains for the app and the Socket.IO server.

## Domains

- **App**: `https://quiz.pokhrelmilan.com.np`
- **Socket server**: `https://socket.pokhrelmilan.com.np`

## Architecture

```
                    ┌─────────────────┐
    quiz.pokhrel... │   Nginx (443)   │ socket.pokhrel...
           ┌────────┴────────┐        ┘
           │                 │
           ▼                 ▼
    ┌──────────┐      ┌────────────┐
    │ Next.js  │      │ Socket.IO  │
    │ app:3000 │      │ socket:4000│
    └────┬─────┘      └─────┬──────┘
         │                  │
         └────────┬─────────┘
                  ▼
         ┌──────────────┐
         │  PostgreSQL  │
         │  postgres    │
         └──────────────┘
```

## Requirements

- Server: 2 vCPUs, 4 GB RAM (or more)
- Docker + Docker Compose
- DNS A records pointing to the server:
  - `quiz.pokhrelmilan.com.np` → server IP
  - `socket.pokhrelmilan.com.np` → server IP

## Step 1: Provision the server

### On Azure

Create a VM with at least 2 vCPUs and 4 GB RAM:

```bash
az group create --name quiz-prod --location southeastasia
az vm create \
  --resource-group quiz-prod \
  --name quiz-server \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username quizapp \
  --ssh-key-values ~/.ssh/id_rsa.pub \
  --public-ip-sku Standard
```

> **Note**: Standard_B2s has 2 vCPUs and 4 GB RAM. If you want more power, use Standard_B2ms or Standard_D2s_v5.

### Open ports

```bash
az vm open-port --resource-group quiz-prod --name quiz-server --port 80
az vm open-port --resource-group quiz-prod --name quiz-server --port 443
```

## Step 2: Install Docker on the server

SSH into the server:

```bash
ssh quizapp@<server-ip>
```

Install Docker:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER
newgrp docker
```

## Step 3: Clone the repo

```bash
sudo mkdir -p /opt/quizapp
sudo chown $USER:$USER /opt/quizapp
cd /opt/quizapp
git clone <your-repo-url> .
```

## Step 4: Configure environment

```bash
cp .env.production.example .env
nano .env
```

Fill in:

```env
DATABASE_URL="postgresql://quizuser:quizpass@postgres:5432/quizdb?schema=public"
SESSION_SECRET="your-random-secret"
HOST_PASSWORD="your-secure-password"

NEXT_PUBLIC_SOCKET_URL="https://socket.pokhrelmilan.com.np"
NEXT_PUBLIC_SOCKET_PATH="/socket.io"
SOCKET_EMIT_URL="http://socket:4000/emit"

ALLOWED_ORIGIN="https://quiz.pokhrelmilan.com.np"

POSTGRES_USER="quizuser"
POSTGRES_PASSWORD="quizpass"
POSTGRES_DB="quizdb"

NODE_ENV="production"
```

## Step 5: Get SSL certificates

Make sure your DNS A records are propagated, then run:

```bash
./init-letsencrypt.sh
```

This requests certificates for both subdomains.

If you want to test without hitting rate limits, set `staging=1` in `init-letsencrypt.sh` first.

## Step 6: Start the app

```bash
# Push database schema
docker compose -f docker-compose.prod.yml --profile migrate run --rm migrate

# Start everything
docker compose -f docker-compose.prod.yml up -d
```

Optional: seed the database:

```bash
docker compose -f docker-compose.prod.yml exec app npm run db:seed
```

## Step 7: Verify

- Open `https://quiz.pokhrelmilan.com.np`
- Host login: `/host`
- Team join: `/team`
- Socket should connect from `https://socket.pokhrelmilan.com.np`

## Useful commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f app

# Restart a service
docker compose -f docker-compose.prod.yml restart app

# Update after code changes
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml --profile migrate run --rm migrate
docker compose -f docker-compose.prod.yml up -d

# Stop everything
docker compose -f docker-compose.prod.yml down
```

## Local testing

For local testing with the same architecture:

```bash
# Add to /etc/hosts
sudo sh -c 'echo "127.0.0.1 quiz.local socket.local" >> /etc/hosts'

# Start local stack
docker compose up -d

# Push schema
docker compose --profile migrate run --rm migrate
```

Then open:
- http://quiz.local
- Socket at http://socket.local

## Troubleshooting

### Socket.IO fails to connect

Check browser console for the exact URL. It should be:

```
https://socket.pokhrelmilan.com.np/socket.io/
```

Verify Nginx routing:

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -T
```

### Database connection fails

Check that the `migrate` step ran successfully:

```bash
docker compose -f docker-compose.prod.yml logs migrate
```

### Let's Encrypt fails

- DNS A records must point to the server before running `init-letsencrypt.sh`
- Port 80 must be open
- Try staging mode first

### Out of memory

With 4 GB RAM you should be fine. If not, add swap:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```
