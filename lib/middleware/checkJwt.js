const jwt = require("express-jwt");
const jwksRsa = require("jwks-rsa");

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: "https://dev-lpo2bm73.us.auth0.com/.well-known/jwks.json",
  }),

  issuer: "https://dev-lpo2bm73.us.auth0.com/",
  algorithms: ["RS256"],
});

module.exports = checkJwt;
