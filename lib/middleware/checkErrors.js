module.exports = function () {
  return function checkErrors(err, req, res, next) {
    if (err.name === "UnauthorizedError") {
      res.status(401).send("Missing or invalid JWT");
    } else {
      next();
    }
  };
};
