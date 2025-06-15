module.exports = {
  apps: [
    {
      name: 'uniqlo-tracker',
      script: 'index.js',
      args: '--initial-run',
      cwd: '/app',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
