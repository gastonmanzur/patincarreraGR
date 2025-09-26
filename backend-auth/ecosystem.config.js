module.exports = {
  apps: [
    {
      name: 'patin-api',
      script: 'server.js',
      cwd: '/home/deploy/apps/patincarreraGR/backend-auth',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      watch: false,
      time: true,
      error_file: '/home/deploy/.pm2/logs/patin-api-error.log',
      out_file: '/home/deploy/.pm2/logs/patin-api-out.log'
    }
  ]
};
