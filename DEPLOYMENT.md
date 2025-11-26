# Deployment Guide for Hostinger VPS

This project can be deployed on an Ubuntu VPS (e.g. Hostinger) with the domain `patincarrera.net`.

## 1. Prepare the Server
1. Update packages and install dependencies:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y nginx nodejs npm
   sudo npm install -g pm2
   ```
2. Clone the repository on the server and switch to the active branch:
   ```bash
   git clone https://github.com/USER/patincarreraGR.git
   cd patincarreraGR
   git checkout work
   ```

## 2. Backend Configuration
1. Create the environment file:
   ```bash
   cd backend-auth
   cp .env.example .env
   # edit .env with real values (Mongo URI, JWT secret, email creds, etc.)
   # UPLOADS_DIR defaults to backend-auth/uploads. If you have legacy
   # assets in another directory you can list them in
   # UPLOADS_FALLBACK_DIRS=/ruta/vieja/uploads
   # PUBLIC_UPLOADS_PATH defaults to /uploads and must match the path that
   # Nginx exposes in its static file location. Leave it untouched unless you
   # intentionally expose the assets under a different public prefix.
   # NODE_ENV=production (present in the example file) ensures the backend
   # uses http://patincarrera.net as the default domain for redirects & CORS.
   npm install
   # PM2 is now configured via backend-auth/ecosystem.config.js so we can
   # keep the runtime options under version control. The file assumes the
   # project lives in /home/deploy/apps/patincarreraGR; adjust `cwd`,
   # log paths or environment variables if your setup differs.
   pm2 startOrReload ecosystem.config.js --update-env
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
   # If you placed the frontend bundle in a different directory, edit the
   # server block and update the `root` directive accordingly before
   # restarting Nginx. Ensure the `alias` directive for `/uploads/` matches
   # the absolute path of the backend `uploads` directory (defaults to
   # /var/www/patincarrera/backend/uploads/ when following this guide).
   sudo nano /etc/nginx/sites-available/patincarrera
   sudo nginx -t
   sudo systemctl restart nginx
   ```
2. Point the domain DNS records for `patincarrera.net` and `www.patincarrera.net` to the server IP `72.60.62.242`.
3. Once HTTPS certificates are issued you can uncomment the redirect in the
   provided config so every visitor is forced to use `https://`.

## 5. Optional HTTPS
Use [Certbot](https://certbot.eff.org/) to obtain a Let's Encrypt certificate:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d patincarrera.net -d www.patincarrera.net
```

## Notes
- Update environment variables as needed for production.
- PM2 will keep the backend running and revive it on reboot (`pm2 startup`).
- For future releases you can deploy everything in one step from the project
  root:

  ```bash
  ./deploy.sh
  ```

  The script performs `git pull --rebase`, installs production dependencies for
  the backend and frontend, rebuilds the Vite bundle and reloads PM2 using the
  tracked ecosystem configuration.
