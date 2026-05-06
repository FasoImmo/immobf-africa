# Déploiement VPS (AWS Lightsail / Scaleway / Hetzner)

Option B du README — ~30 USD/mois, adapté aux équipes qui veulent tout auto-héberger.

## 1. VPS cible

| Provider                | Offre                 | Coût        | Specs                                 |
|-------------------------|-----------------------|-------------|---------------------------------------|
| AWS Lightsail (Paris)   | $20 Linux             | ~20 USD/mo  | 4 GB RAM, 2 vCPU, 80 GB SSD           |
| Scaleway (Paris)        | DEV1-M                | ~15 EUR/mo  | 4 GB RAM, 3 vCPU, 40 GB               |
| Hetzner Cloud (Helsinki)| CPX21                 | ~9 EUR/mo   | 4 GB RAM, 3 vCPU, 80 GB               |

## 2. Préparation

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install git curl ufw nginx certbot python3-certbot-nginx postgresql postgresql-contrib redis-server
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt -y install nodejs
sudo npm i -g pm2

# Installer PostGIS
sudo apt -y install postgresql-14-postgis-3
sudo -u postgres psql -c "CREATE DATABASE immobf;"
sudo -u postgres psql -c "CREATE USER immobf WITH PASSWORD 'strongpass';"
sudo -u postgres psql -c "GRANT ALL ON DATABASE immobf TO immobf;"
sudo -u postgres psql -d immobf -c "CREATE EXTENSION postgis;"
```

## 3. Déploiement backend

```bash
cd /opt
sudo git clone https://github.com/<your-org>/immobf-africa.git
sudo chown -R $USER:$USER immobf-africa
cd immobf-africa/backend
cp .env.example .env
vim .env    # renseigner DATABASE_URL, JWT_SECRET, clés providers
npm ci
npm run migrate
npm run seed
pm2 start src/server.js --name immobf-api
pm2 save && pm2 startup systemd
```

## 4. Déploiement frontend

```bash
cd /opt/immobf-africa/frontend-web
cp .env.example .env.local
echo "NEXT_PUBLIC_API_URL=https://api.immobf.africa" >> .env.local
npm ci
npm run build
pm2 start "npm start" --name immobf-web --cwd /opt/immobf-africa/frontend-web
pm2 save
```

## 5. Nginx reverse proxy

`/etc/nginx/sites-available/immobf.africa` :

```nginx
server {
  listen 80;
  server_name immobf.africa www.immobf.africa;
  location / { proxy_pass http://127.0.0.1:3000; include /etc/nginx/proxy_params; }
}

server {
  listen 80;
  server_name api.immobf.africa;
  location / { proxy_pass http://127.0.0.1:4000; include /etc/nginx/proxy_params; }
  location /api/v1/payments/webhooks/ {
    proxy_pass http://127.0.0.1:4000;
    client_max_body_size 2m;
    proxy_read_timeout 30s;
    include /etc/nginx/proxy_params;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/immobf.africa /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d immobf.africa -d www.immobf.africa -d api.immobf.africa
```

## 6. Sauvegardes

```bash
# Dump quotidien postgres vers Backblaze B2 (~0.005 USD/GB)
cat > /etc/cron.daily/backup-immobf <<'EOF'
#!/bin/bash
ts=$(date +%F)
pg_dump -U immobf -Fc immobf > /var/backups/immobf-$ts.dump
rclone copy /var/backups/immobf-$ts.dump b2:immobf-backups/
find /var/backups -name 'immobf-*.dump' -mtime +7 -delete
EOF
chmod +x /etc/cron.daily/backup-immobf
```

## 7. Supervision

- `pm2 monit` pour le runtime.
- Envoyer logs vers Better Stack (gratuit < 1 GB/mois) : `pm2 install pm2-logrotate` + tail via `vector`.
- Uptime externe : UptimeRobot (gratuit 50 moniteurs).

## 8. Mises à jour

```bash
cd /opt/immobf-africa
git pull
cd backend && npm ci && npm run migrate
cd ../frontend-web && npm ci && npm run build
pm2 reload immobf-api && pm2 reload immobf-web
```

## 9. Hardening minimal

- Fail2ban pour SSH.
- `ufw limit ssh`.
- Clé SSH uniquement (`PasswordAuthentication no`).
- Désactiver root SSH.
- Rotation des secrets JWT tous les 90 j (ancienne signature tolérée 24 h).
- Firewall base de données : n'ouvrir 5432 qu'au localhost.
