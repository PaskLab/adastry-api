module.exports = {
  apps: [
    {
      name: 'api.pasklab.com',
      script: 'node dist/src/main.js',
      // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
      instances: 1,
      autorestart: true,
      watch: true,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
      },
      env_dev: {
        NODE_ENV: 'development',
      },
      error_file: 'error.log',
      time: true, //prefix logs with standard formated timestamp
    },
  ],
};
