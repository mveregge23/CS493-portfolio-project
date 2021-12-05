// routes/teams.js

const express = require("express");
const router = express.Router();

const { Datastore } = require("@google-cloud/datastore");
const checkAccepts = require("../lib/middleware/checkAccepts");
const checkJwt = require("../lib/middleware/checkJwt");
const checkErrors = require("../lib/middleware/checkErrors");
const { application } = require("express");

const datastore = new Datastore({
  projectId: "portfolio-vereggem",
  keyFilename: "portfolio-vereggem-a88ab2e206d3.json",
});

const TEAM = "TEAM";
const PLAYER = "PLAYER";

function fromDatastore(item) {
  item.id = item[Datastore.KEY].id;
  return item;
}

/* Team Model Functions */

function post_team(name, wins, losses) {
  const key = datastore.key(TEAM);
  const new_team = { name, wins, losses, players: [] };
  return datastore.save({ key, data: new_team }).then(() => {
    const team_key = datastore.key([TEAM, parseInt(key.id, 10)]);
    return datastore.get(team_key).then((team) => {
      return team.map(fromDatastore)[0];
    });
  });
}

function view_team(team_id) {
  const team_key = datastore.key([TEAM, parseInt(team_id, 10)]);
  return datastore.get(team_key).then((team) => {
    if (team[0] === null || team[0] === undefined) {
      return -1;
    } else {
      return team.map(fromDatastore)[0];
    }
  });
}

function view_teams(req) {
  const q = datastore.createQuery(TEAM).limit(5);
  let teams = {};
  if (req.query.cursor) {
    q.start(req.query.cursor);
  }
  return datastore.runQuery(q).then((results) => {
    teams.items = results[0].map(fromDatastore);
    if (results[1].moreResults !== Datastore.NO_MORE_RESULTS) {
      teams.next =
        req.protocol +
        "://" +
        req.get("host") +
        req.originalUrl.split("?").shift() +
        "?cursor=" +
        results[1].endCursor;
    }
    return teams;
  });
}

function delete_team(team_id) {
  const team_key = datastore.key([TEAM, parseInt(team_id, 10)]);
  return datastore.get(team_key).then((team) => {
    if (team[0] === null || team[0] === undefined) {
      return -1;
    } else if (team[0].players.length > 0) {
      let players = [];
      team[0].players.forEach((player) => {
        players.push(datastore.key([PLAYER, parseInt(player, 10)]));
      });
      return remove_team_from_players(players).then(() => {
        return datastore.delete(team_key).then(() => {
          return 0;
        });
      });
    } else {
      return datastore.delete(team_key).then(() => {
        return 0;
      });
    }
  });
}

function remove_team_from_players(players) {
  return datastore.get(players).then((results) => {
    updated_players = [];
    results[0].forEach((player) => {
      console.log(player);
      player.team = null;
      updated_players.push({
        key: datastore.key([PLAYER, parseInt(player[Datastore.KEY].id, 10)]),
        data: player,
      });
    });
    return datastore.update(updated_players).then(() => {
      return;
    });
  });
}

function add_player_to_team(team_id, player_id) {
  const team_key = datastore.key([TEAM, parseInt(team_id, 10)]);
  return datastore.get(team_key).then((team) => {
    if (team[0] === null || team[0] === undefined) {
      return -1;
    } else {
      const player_key = datastore.key([PLAYER, parseInt(player_id, 10)]);
      return datastore.get(player_key).then((player) => {
        if (player[0] === null || player[0] === undefined) {
          return -1;
        } else if (player[0].team !== null) {
          return -2;
        } else {
          team[0].players.push(player_id);
          player[0].team = team_id;
          const updated_team = {
            key: team_key,
            data: team[0],
          };
          const updated_player = {
            key: player_key,
            data: player[0],
          };
          return datastore.update([updated_team, updated_player]).then(() => {
            return 0;
          });
        }
      });
    }
  });
}

function remove_player_from_team(team_id, player_id) {
  const team_key = datastore.key([TEAM, parseInt(team_id, 10)]);
  return datastore.get(team_key).then((team) => {
    if (team[0] === undefined || team[0] === null) {
      return -1;
    } else {
      const player_key = datastore.key([PLAYER, parseInt(player_id, 10)]);
      return datastore.get(player_key).then((player) => {
        if (player[0] === undefined || player[0] === null) {
          return -1;
        } else {
          if (!team[0].players.includes(player_id)) {
            return -2;
          } else {
            team[0].players = team[0].players.filter((el) => {
              return el !== player_id;
            });
            player[0].team = null;
            const updated_team = {
              key: datastore.key([TEAM, parseInt(team_id, 10)]),
              data: team[0],
            };
            const updated_player = {
              key: datastore.key([PLAYER, parseInt(player_id, 10)]),
              data: player[0],
            };
            datastore.update([updated_team, updated_player]).then(() => {
              return 0;
            });
          }
        }
      });
    }
  });
}

function update_team(team_id, name, wins, losses) {
  const team_key = datastore.key([TEAM, parseInt(team_id, 10)]);
  return datastore.get(team_key).then((team) => {
    if (team[0] === null || team[0] === undefined) {
      //404
      return -1;
    } else {
      const updated_team = {
        name: name,
        wins: wins,
        losses: losses,
        players: team[0].players,
      };
      return datastore
        .update({ key: team_key, data: updated_team })
        .then(() => {
          return 0;
        });
    }
  });
}

function patch_team(team_id, name, wins, losses) {
  const team_key = datastore.key([TEAM, parseInt(team_id, 10)]);
  return datastore.get(team_key).then((team) => {
    if (team[0] === null || team[0] === undefined) {
      //404
      return -1;
    } else {
      const patched_team = {
        name: name ? name : team[0].name,
        wins: wins ? wins : team[0].wins,
        losses: losses ? losses : team[0].losses,
        players: team[0].players,
      };
      return datastore
        .update({ key: team_key, data: patched_team })
        .then(() => {
          return 0;
        });
    }
  });
}

/* Team Route Functions */

router.post("/teams", [checkAccepts()], function (req, res) {
  if (
    !req.body.name ||
    req.body.wins === undefined ||
    req.body.losses === undefined
  ) {
    res.status(400).json({
      Error:
        "The request object is missing at least one of the required attributes",
    });
  } else {
    post_team(req.body.name, req.body.wins, req.body.losses).then((team) => {
      team.self =
        req.protocol +
        "://" +
        req.get("host") +
        req.originalUrl +
        "/" +
        team.id;
      res.status(201).json(team);
    });
  }
});

router.put("/teams", function (req, res) {
  res.status(405).json({ Error: "Method not supported" });
});

router.delete("/teams", function (req, res) {
  res.status(405).json({ Error: "Method not supported" });
});

router.get("/teams/:team_id", [checkAccepts()], function (req, res) {
  view_team(req.params.team_id).then((result) => {
    if (result === -1) {
      res.status(404).json({ Error: "No team with this team_id exists" });
    } else {
      result.self = req.protocol + "://" + req.get("host") + req.originalUrl;
      res.status(200).json(result);
    }
  });
});

router.get("/teams", [checkAccepts()], function (req, res) {
  view_teams(req).then((teams) => {
    teams.items.forEach((team) => {
      team.self =
        req.protocol +
        "://" +
        req.get("host") +
        req.originalUrl +
        "/" +
        team.id;
    });
    res.status(200).json(teams);
  });
});

router.put("/teams/:team_id", function (req, res) {
  if (
    !req.body.name ||
    req.body.wins === undefined ||
    req.body.losses === undefined
  ) {
    res.status(400).json({
      Error: "The request object is at least one of the required attributes",
    });
  } else {
    update_team(
      req.params.team_id,
      req.body.name,
      req.body.wins,
      req.body.losses
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
          res.status(404).json({ Error: "No team with this team_id exists" });
      }
    });
  }
});

router.delete("/teams/:team_id", [checkAccepts()], function (req, res) {
  delete_team(req.params.team_id).then((result) => {
    if (result === -1) {
      res.status(404).json({ Error: "No team with this team_id exists" });
    } else {
      res.status(204).send();
    }
  });
});

router.put(
  "/teams/:team_id/players/:player_id",
  [checkAccepts()],
  function (req, res) {
    add_player_to_team(req.params.team_id, req.params.player_id).then(
      (result) => {
        if (result === -1) {
          res.status(404).json({
            Error:
              "No team with this team_id or no player with this player_id exists",
          });
        } else if (result === -2) {
          res
            .status(403)
            .json({ Error: "The player is already assigned to another team" });
        } else {
          res.status(204).send();
        }
      }
    );
  }
);

router.delete(
  "/teams/:team_id/players/:player_id",
  [checkAccepts()],
  function (req, res) {
    remove_player_from_team(req.params.team_id, req.params.player_id).then(
      (result) => {
        if (result === -1) {
          res.status(404).json({
            Error:
              "No team with this team_id or player with this player_id exists",
          });
        } else if (result === -2) {
          res
            .status(403)
            .json({ Error: "The player is not assigned to this team" });
        } else {
          res.status(204).send();
        }
      }
    );
  }
);

router.patch("/teams/:team_id", function (req, res) {
  if (
    !req.body.name &&
    req.body.wins === undefined &&
    req.body.losses === undefined
  ) {
    res.status(400).json({
      Error: "The request object is missing all of the possible attributes",
    });
  } else {
    patch_team(
      req.params.team_id,
      req.body.name,
      req.body.wins,
      req.body.losses
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
          res.status(404).json({ Error: "No team with this team_id exists" });
      }
    });
  }
});

module.exports = router;
