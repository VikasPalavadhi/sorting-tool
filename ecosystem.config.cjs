module.exports = {
  apps: [
    {
      name: 'card-sorting-backend',
      script: './server/dist/index.js',
      cwd: '/var/www/sortit',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    }
  ]
};
