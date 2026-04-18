module.exports = {
  apps: [
    {
      name: 'store-warehouse-backend',
      script: './dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '800M',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
