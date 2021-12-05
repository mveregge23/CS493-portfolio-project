const express = require("express");
const { Datastore } = require("@google-cloud/datastore");
const session = require("express-session");
const crypto = require("crypto");
const path = require("path");

const app = express();
app.use(express.json());
app.set("view engine", "pug");
app.set("views", "./views");

app.use(express.static(path.join(__dirname, "public")));

const sess = {
  secret: crypto.randomBytes(16).toString("hex"),
  cookie: {},
  resave: false,
  saveUnitialized: true,
};

if (app.get("env") === "production") {
  sess.cookie.secure = true;
}

app.use(session(sess));
app.set("trust proxy", 1);

// Load Passport
const passport = require("passport");
const Auth0Strategy = require("passport-auth0");

// Configure Passport to use Auth0
const strategy = new Auth0Strategy(
  {
    domain: "dev-lpo2bm73.us.auth0.com",
    clientID: "k8aDPSEP2Whi6yi9YPV6U336WOeLJ1pF",
    clientSecret:
      "Jhey4vfRFmJWBS98zgRYLgPYor7be5bS9n2zCjPVUeDBAITyMTefbv-hRw9f6iL1",
    callbackURL: "http://localhost:8080/callback",
  },
  function (accessToken, refreshToken, extraParams, profile, done) {
    // accessToken is the token to call Auth0 API (not needed in the most cases)
    // extraParams.id_token has the JSON Web Token
    // profile has all the information from the user
    return done(null, profile, extraParams);
  }
);

passport.use(strategy);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

// configure authorization routes
const userInViews = require("./lib/middleware/userInViews");
const authRouter = require("./routes/auth");
const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const playersRouter = require("./routes/players");
const teamsRouter = require("./routes/teams");

app.use(userInViews());
app.use("/", authRouter);
app.use("/", indexRouter);
app.use("/", usersRouter);
app.use("/", playersRouter);
app.use("/", teamsRouter);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
