module.exports = function () {
  return function checkAccepts(req, res, next) {
    if (!req.accepts("application/json")) {
      res.status(406).json({
        Error: "Must accept application/json for response body format",
      });
    } else {
      next();
    }
  };
};
