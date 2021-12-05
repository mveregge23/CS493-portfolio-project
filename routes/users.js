// routes/users.js

var express = require("express");
var secured = require("../lib/middleware/secured");
var router = express.Router();

const { Datastore } = require("@google-cloud/datastore");
const checkAccepts = require("../lib/middleware/checkAccepts");

const datastore = new Datastore({
  projectId: "portfolio-vereggem",
  keyFilename: "portfolio-vereggem-a88ab2e206d3.json",
});

const USER = "USER";

function fromDatastore(item) {
  item.id = item[Datastore.KEY].id;
  return item;
}

/* GET user profile. */
router.get("/user", secured(), function (req, res, next) {
  const { _raw, _json, ...userProfile } = req.user;
  res.render("user", {
    userProfile: JSON.stringify(userProfile, null, 2),
    title: "Profile page",
  });
});

router.get("/users", function (req, res) {
  const q = datastore.createQuery(USER);
  datastore.runQuery(q).then((results) => {
    results[0] = results[0].map(fromDatastore);
    res.status(200).json(results[0]);
  });
});

router.post("/users", function (req, res) {
  res.status(405).json({ Error: "Method not supported" });
});

router.delete("/users", function (req, res) {
  res.status(405).json({ Error: "Method not supported" });
});

router.put("/users", function (req, res) {
  res.status(405).json({ Error: "Method not supported" });
});

module.exports = router;
