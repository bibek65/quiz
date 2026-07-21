# Deploy to Azure (Student Free Tier)

This guide deploys the quiz app to an Azure VM using the **B1s free tier**, optionally backed by **Azure Database for PostgreSQL Flexible Server free tier**.

## Architecture

- **Azure VM B1s** (1 vCPU, 1 GB RAM) — runs the Next.js app + Socket.IO server + Nginx
- **Azure Database for PostgreSQL Flexible Server** (free tier) — database
  - Alternatively, you can run PostgreSQL directly on the VM, but the 1 GB RAM makes that tight.

## What changed in the app

- `src/lib/actions.ts` — `emitUpdate` now uses `SOCKET_EMIT_URL` instead of hardcoded `localhost:4000`
- `src/lib/session.ts` — session cookie is `secure: true` only in production
- `src/hooks/useSocket.ts` — supports `NEXT_PUBLIC_SOCKET_PATH` for flexible Socket.IO paths
- `server.js` — now exposes an internal `POST /emit` endpoint so Server Actions can push to the same process
- `socket-server.js` — supports `PORT` and `ALLOWED_ORIGIN` env vars

## Step 1: Create Azure resources

### 1.1 Create the PostgreSQL database

1. Go to **Azure Portal** → **Create a resource** → **Azure Database for PostgreSQL Flexible Server**
2. Choose the **Free tier** (1 vCore, 1 GB RAM, 100 GB storage)
3. Set admin username and password
4. Note the connection string: `postgresql://<user>:<pass>@<server>.postgres.database.azure.com:5432/quizdb?sslmode=require`

### 1.2 Create the VM

1. **Azure Portal** → **Virtual machines** → **Create** → **Azure virtual machine**
2. **Subscription**: your student subscription
3. **Image**: Ubuntu Server 22.04 LTS
4. **Size**: **Standard_B1s** (free for 750 hours/month)
5. **Authentication**: SSH public key
6. **Inbound ports**: Allow HTTP (80) and HTTPS (443)
   - Also allow SSH (22) so you can manage the VM
7. **Advanced** → **Custom data**: paste the contents of `cloud-init.yaml`
   - Replace `YOUR_SSH_PUBLIC_KEY` with your actual public key
8. Create the VM

## Step 2: Deploy the app

### 2.1 SSH into the VM

```bash
ssh quizapp@YOUR_VM_IP
# or
ssh -i ~/.ssh/your_key azureuser@YOUR_VM_IP
```

### 2.2 Copy the app to the VM

From your local machine:

```bash
# Clone the repo onto the VM
scp -r . quizapp@YOUR_VM_IP:/opt/quizapp

# Or push to GitHub and clone it on the VM
```

### 2.3 Configure environment

On the VM:

```bash
cd /opt/quizapp
cp .env.example .env
nano .env
```

Set your real values:

```env
DATABASE_URL="postgresql://quizuser:quizpass@YOUR_DB_SERVER.postgres.database.azure.com:5432/quizdb?sslmode=require"
SESSION_SECRET="your-random-secret-min-32-chars"
HOST_PASSWORD="your-secure-host-password"
NEXT_PUBLIC_SOCKET_URL="http://YOUR_VM_IP"
NEXT_PUBLIC_SOCKET_PATH="/api/socket"
SOCKET_EMIT_URL="http://localhost:3000/emit"
ALLOWED_ORIGIN=""
```

For a domain:

```env
NEXT_PUBLIC_SOCKET_URL="https://quiz.yourdomain.com"
```

### 2.4 Run setup

```bash
chmod +x azure-vm-setup.sh
./azure-vm-setup.sh
```

This installs Node.js, PM2, Nginx, builds the app, and starts it.

### 2.5 Push database schema

```bash
cd /opt/quizapp
npx prisma db push
```

Optional: seed the database:

```bash
npm run db:seed
```

## Step 3: Configure SSL (optional but recommended)

### If you have a domain

1. Point your domain's A record to the VM's public IP
2. Update `.env`:

```env
NEXT_PUBLIC_SOCKET_URL="https://quiz.yourdomain.com"
ALLOWED_ORIGIN="https://quiz.yourdomain.com"
```

3. Update Nginx:

```bash
sudo nano /etc/nginx/sites-available/quizapp
# Replace server_name with your domain
sudo certbot --nginx -d quiz.yourdomain.com
sudo systemctl restart nginx
pm2 restart quiz-app
```

### If you don't have a domain

You can access the app via `http://YOUR_VM_IP`. Socket.IO will work over plain HTTP. For a free domain, get one from [DuckDNS](https://www.duckdns.org/) or [Freenom](https://freenom.com).

## Step 4: Verify

1. Open `http://YOUR_VM_IP` or `https://quiz.yourdomain.com`
2. Go to `/host`
3. Log in with the password from `HOST_PASSWORD`
4. Create a quiz, then join as a team from another device

## Commands you'll need later

```bash
# Restart app
pm2 restart quiz-app

# View logs
pm2 logs quiz-app

# Check status
pm2 status

# Update after code changes
cd /opt/quizapp
git pull
npm install
npm run build
npx prisma db push
pm2 restart quiz-app

# Renew SSL
sudo certbot renew
```

## Free tier limits

- **Azure VM B1s**: 750 hours/month (roughly always-on for one VM)
- **Azure Database for PostgreSQL**: free tier for 12 months, 100 GB storage
- **Student pack**: usually $100 credit for 12 months

## Troubleshooting

### App doesn't load

```bash
pm2 logs quiz-app
sudo systemctl status nginx
sudo nginx -t
```

### Database connection fails

- Check that the Azure Postgres firewall allows connections from the VM
- Verify `DATABASE_URL` uses the correct server name and `sslmode=require`

### Socket.IO doesn't connect

- Check browser console
- Verify `NEXT_PUBLIC_SOCKET_URL` and `NEXT_PUBLIC_SOCKET_PATH` are correct
- On the VM, check that port 3000 is running: `curl http://localhost:3000/emit` should fail with a 400 error (which means the endpoint is there)

### Out of memory

The B1s has only 1 GB RAM. If the app crashes:

- Use `pm2 logs quiz-app` to check
- Add swap:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```
