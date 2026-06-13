/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("node:path");

module.exports = {
  apps: [
    {
      name: "school-app",
      cwd: __dirname,
      script: path.join(__dirname, "node_modules", "next", "dist", "bin", "next"),
      args: "start --hostname 127.0.0.1 --port 3001",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "1G",
      watch: false,
      env: {
        NODE_ENV: "production",
        HOSTNAME: "127.0.0.1",
        PORT: "3001",
        APP_URL: "https://school-iraq.com",
      },
    },
  ],
};
