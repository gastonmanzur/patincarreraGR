# Deployment Guide for Hostinger VPS

This project can be deployed on an Ubuntu VPS (e.g. Hostinger) with the domain `patincarrera.net`.

## 1. Prepare the Server
1. Update packages and install dependencies:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y nginx nodejs npm
   sudo npm install -g pm2
   ```
2. Clone the repository on the server:
   ```bash
   git clone https://github.com/USER/patincarreraGR.git
   cd patincarreraGR
   ```

## 2. Backend Configuration
1. Create the environment file:
   ```bash
   cd backend-auth
   cp .env.example .env
   # edit .env with real values (Mongo URI, JWT secret, email creds, etc.)
   npm install
   pm2 start server.js --name patincarrera-backend
   pm2 save
   cd ..
   ```

## 3. Frontend Build
1. Build the React app:
   ```bash
   cd frontend-auth
   cp .env.example .env
   npm install
   npm run build
   sudo mkdir -p /var/www/patincarrera/frontend/dist
   # Copy the *contents* of the Vite build so the document root has an index.html
   # directly inside it. Leaving the files nested inside an extra `dist/`
   # directory causes Nginx/Hostinger to respond with "403 Forbidden" because
   # there is no index at the root level.
   sudo rsync -a dist/ /var/www/patincarrera/frontend/dist/
   cd ..
   ```

## 4. Nginx
1. Copy the provided configuration:
   ```bash
   sudo cp deployment/nginx.conf /etc/nginx/sites-available/patincarrera
   sudo ln -s /etc/nginx/sites-available/patincarrera /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```
2. Point the domain DNS records for `patincarrera.net` and `www.patincarrera.net` to the server IP `72.60.62.242`.

## 5. Optional HTTPS
Use [Certbot](https://certbot.eff.org/) to obtain a Let's Encrypt certificate:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d patincarrera.net -d www.patincarrera.net
```

## Notes
- Update environment variables as needed for production.
- PM2 will keep the backend running and revive it on reboot (`pm2 startup`).
