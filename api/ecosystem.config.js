module.exports = {
  apps: [
    {
      name: "DostElectricapi",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      watch: true,
      ignore_watch: ["node_modules"],
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
