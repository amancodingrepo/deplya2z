# Production Deployment Guide

This guide covers deploying the Store & Warehouse backend API to production.

---

## Pre-Deployment Checklist

### Security
- [ ] Generate strong `JWT_SECRET` (min 32 random characters)
- [ ] Change all default passwords
- [ ] Set `NODE_ENV=production`
- [ ] Configure `CORS_ORIGIN` to your frontend domain
- [ ] Enable HTTPS/SSL
- [ ] Set `BCRYPT_ROUNDS=12` or higher
- [ ] Review and set appropriate rate limits

### Database
- [ ] PostgreSQL database created (Neon recommended)
- [ ] Database URL configured in environment
- [ ] Migrations run successfully
- [ ] Seed data loaded (or production data imported)
- [ ] Database backups configured
- [ ] Connection pooling configured (max 10 connections)

### Infrastructure
- [ ] Redis instance set up for Bull queue
- [ ] Monitoring and alerting configured
- [ ] Log aggregation set up
- [ ] Health check endpoints accessible
- [ ] Error tracking configured (e.g., Sentry)

---

## Option 1: Railway Deployment

Railway provides simple deployment with built-in PostgreSQL and Redis.

### Steps

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Initialize project
railway init

# 4. Add PostgreSQL plugin
railway add postgresql

# 5. Add Redis plugin
railway add redis

# 6. Deploy
railway up

# 7. Set environment variables
railway variables set JWT_SECRET=your-secret-here
railway variables set CORS_ORIGIN=https://your-frontend.com
railway variables set NODE_ENV=production
railway variables set BCRYPT_ROUNDS=12

# 8. Run migrations (one-time)
railway run psql $DATABASE_URL < src/database/migrations/001_initial_schema.sql
railway run psql $DATABASE_URL < src/database/migrations/002_seed_data.sql

# 9. View logs
railway logs
```

### Railway Environment Variables

Railway auto-configures:
- `DATABASE_URL` (from PostgreSQL plugin)
- `REDIS_URL` (from Redis plugin)

You must set:
- `JWT_SECRET`
- `CORS_ORIGIN`
- `NODE_ENV`

---

## Option 2: Render Deployment

Render offers free PostgreSQL and easy deployment.

### Steps

1. **Create Web Service**
   - Go to render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Name: `store-warehouse-api`
   - Branch: `main`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

2. **Add PostgreSQL Database**
   - Click "New +" → "PostgreSQL"
   - Name: `store-warehouse-db`
   - Plan: Free or paid
   - Copy the internal database URL

3. **Add Redis**
   - Click "New +" → "Redis"
   - Name: `store-warehouse-redis`
   - Copy the internal Redis URL

4. **Configure Environment Variables**
   In web service dashboard → Environment:
   ```
   DATABASE_URL=<internal-postgres-url>
   REDIS_HOST=<redis-hostname>
   REDIS_PORT=6379
   JWT_SECRET=<your-secret>
   CORS_ORIGIN=https://your-frontend.com
   NODE_ENV=production
   BCRYPT_ROUNDS=12
   LOG_LEVEL=warn
   ```

5. **Run Migrations**
   - Connect to database via Render dashboard
   - Run SQL files manually or use Render Shell

---

## Option 3: Hostinger + Neon

Deploy on Hostinger VPS with Neon PostgreSQL and external Redis.

### Steps

#### 1. Set Up Neon Database

```bash
# 1. Create database at neon.tech
# 2. Copy connection string
# Format: postgresql://user:pass@host.neon.tech/dbname?sslmode=require

# 3. Run migrations locally pointing to Neon
psql "postgresql://user:pass@host.neon.tech/dbname?sslmode=require" < src/database/migrations/001_initial_schema.sql
psql "postgresql://user:pass@host.neon.tech/dbname?sslmode=require" < src/database/migrations/002_seed_data.sql
```

#### 2. Set Up Redis (Upstash or Redis Cloud)

```bash
# Option A: Upstash Redis (Free tier available)
# 1. Create Redis instance at upstash.com
# 2. Copy host and port

# Option B: Redis Cloud
# 1. Create instance at redis.com
# 2. Copy connection details
```

#### 3. Deploy to Hostinger VPS

```bash
# 1. SSH into Hostinger VPS
ssh user@your-hostinger-ip

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PM2
sudo npm install -g pm2

# 4. Clone repository
git clone https://github.com/your-repo/backend.git
cd backend

# 5. Install dependencies
npm install

# 6. Build
npm run build

# 7. Create .env file
cat > .env << EOF
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname?sslmode=require
REDIS_HOST=your-redis-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
JWT_SECRET=your-32-char-secret
CORS_ORIGIN=https://your-frontend.com
BCRYPT_ROUNDS=12
LOG_LEVEL=warn
EOF

# 8. Start with PM2
pm2 start dist/server.js --name store-warehouse-api

# 9. Save PM2 config
pm2 save
pm2 startup

# 10. Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/api
```

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install SSL certificate
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

#### 4. Set Up Auto-Deployment (Optional)

```bash
# Create deployment script
cat > deploy.sh << 'EOF'
#!/bin/bash
cd /path/to/backend
git pull origin main
npm install
npm run build
pm2 restart store-warehouse-api
EOF

chmod +x deploy.sh

# Add to GitHub webhook or run manually
```

---

## Option 4: Docker Deployment

Deploy using Docker on any VPS (DigitalOcean, AWS EC2, etc.)

### Steps

```bash
# 1. SSH into server
ssh user@your-server-ip

# 2. Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Clone repository
git clone https://github.com/your-repo/backend.git
cd backend

# 4. Create production .env file
nano .env
# Add all production environment variables

# 5. Build and start
docker-compose -f docker-compose.prod.yml up -d

# 6. View logs
docker-compose logs -f api

# 7. Run migrations
docker-compose exec api sh -c "psql \$DATABASE_URL < /app/src/database/migrations/001_initial_schema.sql"
```

---

## Post-Deployment

### 1. Verify Deployment

```bash
# Health check
curl https://api.yourdomain.com/health

# Database check
curl https://api.yourdomain.com/ready

# Test login
curl -X POST https://api.yourdomain.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@storewarehouse.com","password":"NEW_PASSWORD"}'
```

### 2. Set Up Monitoring

**Option A: Railway/Render Built-in**
- Use platform dashboards

**Option B: External Monitoring**
```bash
# Install Datadog agent (example)
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=<your-key> DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# Or use other tools:
# - New Relic
# - Sentry (error tracking)
# - LogRocket
# - Prometheus + Grafana
```

### 3. Set Up Alerts

Configure alerts for:
- API response time > 2 seconds (p95)
- Error rate > 5%
- Database connections > 8 (out of 10 max)
- CPU usage > 80%
- Memory usage > 80%
- Disk space < 20%

### 4. Database Backups

**Neon:**
- Automatic daily backups included

**Self-hosted PostgreSQL:**
```bash
# Daily backup script
cat > /usr/local/bin/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL | gzip > /backups/store_warehouse_$DATE.sql.gz
# Keep only last 30 days
find /backups -name "store_warehouse_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-db.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-db.sh
```

### 5. Log Rotation

```bash
# Configure PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## Scaling Considerations

### Horizontal Scaling

- Deploy multiple API instances behind load balancer
- Use sticky sessions or Redis for session storage
- Ensure database connection pool limits account for all instances

### Database Scaling

- Enable Neon autoscaling
- Add read replicas for heavy read workloads
- Consider connection pooling with PgBouncer

### Queue Scaling

- Add more Bull worker processes
- Use separate Redis instances for cache vs queue
- Monitor queue job lag

---

## Rollback Procedure

### Railway/Render
- Use platform's rollback feature in dashboard

### Manual Deployment
```bash
# 1. SSH into server
ssh user@your-server-ip

# 2. Navigate to app directory
cd /path/to/backend

# 3. Checkout previous commit
git log --oneline
git checkout <previous-commit-hash>

# 4. Rebuild and restart
npm install
npm run build
pm2 restart store-warehouse-api

# Or with Docker
docker-compose down
git checkout <previous-commit-hash>
docker-compose up -d
```

---

## Troubleshooting

### API not responding
```bash
# Check if process is running
pm2 status
# Or
docker ps

# Check logs
pm2 logs store-warehouse-api
# Or
docker-compose logs api

# Check port
netstat -tulpn | grep 8080
```

### Database connection issues
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool
# Add logging in app and monitor active connections
```

### Redis connection issues
```bash
# Test Redis
redis-cli -h <host> -p <port> -a <password> ping

# Check Redis info
redis-cli -h <host> -p <port> -a <password> info
```

---

## Security Hardening

1. **Firewall Rules**
```bash
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

2. **Fail2Ban** (prevent brute force)
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

3. **Auto Security Updates**
```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

4. **Database Security**
- Use SSL/TLS for database connections
- Whitelist IPs in firewall
- Regular password rotation
- Enable audit logging

---

## Support

For deployment issues:
- Check logs first
- Review environment variables
- Verify database connectivity
- Check Redis connectivity
- Review Nginx/proxy configuration

Contact your team lead for production access credentials.
