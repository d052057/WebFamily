const PROXY_CONFIG = [
  {
    context: [
      "/api",
      "/Account",
      "/admin",
    ],
    target: "https://localhost:7184",
    secure: false
  }
  //,
  //{
  //  "/api": {
  //    target: "https:/localhost:7184",
	 //   secure: false
  //  }
  //}
]

module.exports = PROXY_CONFIG;
