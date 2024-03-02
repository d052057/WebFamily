const PROXY_CONFIG = [
  {
    context: [
      "/Account",
      "/Admin",
    ],
    target: "https://localhost:7184",
    secure: false
  }
]

module.exports = PROXY_CONFIG;
