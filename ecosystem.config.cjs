const path = require('path');

module.exports = {
  apps: [
    {
      name: 'minja-cloud',
      cwd: path.resolve(__dirname, 'server'),
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
