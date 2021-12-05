// routes/players.js

const express = require("express");
const router = express.Router();

const { Datastore } = require("@google-cloud/datastore");
const checkAccepts = require("../lib/middleware/checkAccepts");
const checkJwt = require("../lib/middleware/checkJwt");
const checkErrors = require("../lib/middleware/checkErrors");

const datastore = new Datastore({
  projectId: "portfolio-vereggem",
  keyFilename: "portfolio-vereggem-a88ab2e206d3.json",
});

const PLAYER = "PLAYER";
const TEAM = "TEAM";

function fromDatastore(item) {
  item.id = item[Datastore.KEY].id;
  return item;
}

/* Player Model Functions */

function post_player(name, position, number, owner) {
  const key = datastore.key(PLAYER);
  const player = {
    name,
    position,
    number,
    team: null,
    owner,
  };
  return datastore.save({ key: key, data: player }).then(() => {
    const player_key = datastore.key([PLAYER, parseInt(key.id, 10)]);
    return datastore.get(player_key).then((player) => {
      return player.map(fromDatastore)[0];
    });
  });
}

function get_player(player_id, owner) {
  const key = datastore.key([PLAYER, parseInt(player_id, 10)]);
  return datastore.get(key).then((player) => {
    if (player[0] === null || player[0] === undefined) {
      // 404
      return -1;
    } else if (player[0].owner !== owner) {
      // 403
      return -2;
    } else {
      // 200
      return player.map(fromDatastore)[0];
    }
  });
}

function get_players(req) {
  const q = datastore
    .createQuery(PLAYER)
    .filter("owner", "=", req.user.sub)
    .limit(5);
  let players = {};
  if (req.query.cursor) {
    q.start(req.query.cursor);
  }
  return datastore.runQuery(q).then((results) => {
    players.items = results[0].map(fromDatastore);
    if (results[1].moreResults !== Datastore.NO_MORE_RESULTS) {
      players.next =
        req.protocol +
        "://" +
        req.get("host") +
        req.originalUrl.split("?").shift() +
        "?cursor=" +
        results[1].endCursor;
    }
    return players;
  });
}

function delete_player(player_id, owner) {
  const player_key = datastore.key([PLAYER, parseInt(player_id, 10)]);
  return datastore.get(player_key).then((result) => {
    if (result[0] === null || result[0] === undefined) {
      //404
      return -1;
    } else if (result[0].owner !== owner) {
      //403
      return -2;
    } else {
      if (result[0].team !== null) {
        const team_key = datastore.key([TEAM, parseInt(result[0].team, 10)]);
        return datastore.get(team_key).then((team) => {
          team[0].players = team[0].players
            .filter((el) => {
              return el !== player_id;
            })
            .then(() => {
              return datastore
                .update({ key: team_key, data: team[0] })
                .then(() => {
                  return datastore.delete(player_key).then(() => {
                    return 0;
                  });
                });
            });
        });
      } else {
        return datastore.delete(player_key).then(() => {
          return 0;
        });
      }
    }
  });
}

function update_player(player_id, name, position, number, owner) {
  const key = datastore.key([PLAYER, parseInt(player_id, 10)]);

  return datastore.get(key).then((player) => {
    if (player[0] === null || player[0] === undefined) {
      //404
      return -1;
    } else if (player[0].owner !== owner) {
      //403
      return -2;
    } else {
      const updated_player = {
        name: name,
        position: position,
        number: number,
        owner: owner,
        team: player[0].team,
      };
      return datastore.update({ key, data: updated_player }).then(() => {
        return 0;
      });
    }
  });
}

function patch_player(player_id, name, position, number, owner) {
  const player_key = datastore.key([PLAYER, parseInt(player_id, 10)]);
  return datastore.get(player_key).then((player) => {
    if (player[0] === null || player[0] === undefined) {
      //404
      return -1;
    } else if (player[0].owner !== owner) {
      //403
      return -2;
    } else {
      const patched_player = {
        name: name ? name : player[0].name,
        position: position ? position : player[0].position,
        number: number ? number : player[0].number,
        owner: player[0].owner,
        team: player[0].team,
      };
      return datastore
        .update({ key: player_key, data: patched_player })
        .then(() => {
          return 0;
        });
    }
  });
}

/* Player Routes */

router.post(
  "/players",
  [checkAccepts(), checkJwt, checkErrors()],
  function (req, res) {
    if (!req.body.name || !req.body.position || !req.body.number) {
      res.status(400).json({
        Error:
          "The request object is missing at least one of the required attributes",
      });
    } else {
      post_player(
        req.body.name,
        req.body.position,
        req.body.number,
        req.user.sub
      ).then((player) => {
        player.self =
          req.protocol +
          "://" +
          req.get("host") +
          req.originalUrl +
          "/" +
          player.id;
        res.status(201).json(player);
      });
    }
  }
);

router.get(
  "/players/:player_id",
  [checkAccepts(), checkJwt, checkErrors()],
  function (req, res) {
    get_player(req.params.player_id, req.user.sub).then((player) => {
      if (player === -1) {
        res.status(404).json({ Error: "No player with this player_id exists" });
      } else if (player === -2) {
        res.status(403).json({
          Error: "The player with this player_id does not belong to the user",
        });
      } else {
        player.self = req.protocol + "://" + req.get("host") + req.originalUrl;
        res.status(200).json(player);
      }
    });
  }
);

router.get(
  "/players",
  [checkAccepts(), checkJwt, checkErrors()],
  function (req, res) {
    get_players(req).then((players) => {
      players.items.forEach((player) => {
        player.self =
          req.protocol +
          "://" +
          req.get("host") +
          req.originalUrl +
          "/" +
          player.id;
      });
      res.status(200).json(players);
    });
  }
);

router.put("/players", function (req, res) {
  res.status(405).json({ Error: "Method not supported" });
});

router.delete("/players", function (req, res) {
  res.status(405).json({ Error: "Method not supported" });
});

router.delete(
  "/players/:player_id",
  [checkAccepts(), checkJwt, checkErrors()],
  function (req, res) {
    delete_player(req.params.player_id, req.user.sub).then((result) => {
      switch (result) {
        case 0:
          res.status(204).send();
          break;
        case -1:
          res
            .status(404)
            .json({ Error: "No player with this player_id exists" });
          break;
        case -2:
          res.status(403).json({
            Error: "The player with this player_id does not belong to the user",
          });
      }
    });
  }
);

router.put(
  "/players/:player_id",
  [checkAccepts(), checkJwt, checkErrors()],
  function (req, res) {
    if (!req.body.name || !req.body.position || !req.body.number) {
      res.status(400).json({
        Error:
          "The request object is missing at least one of the required attributes",
      });
    } else {
      update_player(
        req.params.player_id,
        req.body.name,
        req.body.position,
        req.body.number,
        req.user.sub
      ).then((result) => {
        switch (result) {
          case 0:
            res
              .header(
                "location",
                req.protocol + "://" + req.get("host") + req.originalUrl
              )
              .status(303)
              .send();
            break;
          case -1:
            res
              .status(404)
              .json({ Error: "No player with this player_id exists" });
            break;
          case -2:
            res.status(403).json({
              Error:
                "The player with this player_id does not belong to the user",
            });
        }
      });
    }
  }
);

router.patch(
  "/players/:player_id",
  [checkAccepts(), checkJwt, checkErrors()],
  function (req, res) {
    if (!req.body.name && !req.body.position && !req.body.number) {
      res.status(400).json({
        Error: "The request object is missing all of the possible attributes",
      });
    } else {
      patch_player(
        req.params.player_id,
        req.body.name,
        req.body.position,
        req.body.number,
        req.user.sub
      ).then((result) => {
        switch (result) {
          case 0:
            res
              .header(
                "location",
                req.protocol + "://" + req.get("host") + req.originalUrl
              )
              .status(303)
              .send();
            break;
          case -1:
            res
              .status(404)
              .json({ Error: "No player with this player_id exists" });
            break;
          case -2:
            res.status(403).json({
              Error:
                "The player with this player_id does not belong to the user",
            });
        }
      });
    }
  }
);

module.exports = router;
