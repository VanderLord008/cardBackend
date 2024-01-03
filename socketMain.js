const cors = require("cors");
const uuid = require("uuid");
const express = require("express");
const app = express();
app.use(cors());
app.use(express.json());
app.use(function (req, res, next) {
  const allowedOrigins = ['http://localhost:5000', 'https://cardbackend.onrender.com','https://tubular-moonbeam-71e070.netlify.app/'];
      const origin = req.headers.origin;
      if (allowedOrigins.includes(origin)) {
           res.setHeader('Access-Control-Allow-Origin', origin);
      }
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
      res.header("Access-Control-Allow-credentials", true);
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, UPDATE");
      next();
});
const PORT = 9000;
const expressServer = app.listen(PORT);

const socketio = require("socket.io");
const io = socketio(expressServer, {
  cors: {
    origin: "*",
    credentials: true,
  },
});
module.exports = { app, io };
//hashmaps
const games = {};
const players = {};
const colors = ["red", "blue", "yellow", "green"];
//randomiser
const shuffle = (array) => {
  return array.sort(() => Math.random() - 0.5);
};
/////////
///////////
////////////
////////
////////
///////////
/////////
//////////

io.on("connect", (socket) => {
  //this event runs on join
  console.log("player has connected");
  players[socket.id] = socket.id;
  socket.emit("welcome", socket.id);

  socket.on("createGame", (data) => {
    console.log(data);
    const clientId = data.data.socketId;
    console.log(clientId);
    const gameId = uuid.v1();
    games[gameId] = {
      id: gameId,
      cards: [],
      clients: [],
      firstShuffleFinished: false,
      currentHand: [],
      previousHands: [],
      score: {},
      teamA: [],
      teamB: [],
      playerTurn: "",
      turupBids: [],
      turup: "",
      targetForTeamA: 7,
      targetForTeamB: 7,
    };
    for (let i = 0; i < 52; i++) {
      games[gameId].cards.push(i);
    }
    //console.log("all games are - ");
    //console.log(games);
    const payload = {
      game: games[gameId],
    };
    socket.emit("createGameResponse", { payload });
  });

  socket.on("joinGame", (data) => {
    const gameID = data.data.gameId;
    const clientId = data.data.playerId;
    const game = games[gameID];
    console.log("this game is - ");
    console.log(game);
    game.clients.push({
      clientId: clientId,
      color: colors[game.clients.length],
    });
    //join a team
    if (game.teamA.length < 2) {
      game.teamA.push(clientId);
    } else {
      game.teamB.push(clientId);
    }
    //set the player turn
    game.playerTurn = game.clients[0];
    //create the payload
    const payload = {
      game: game,
    };
    game.clients.forEach((cl) => {
      io.to(cl.clientId).emit("joinGameResponse", { payload });
    });
  });
  socket.on("firstShuffle", (data) => {
    const game = games[data.data.gameId];
    const shuffledArray = shuffle(game.cards);
    games[data.data.gameId].cards = shuffledArray;
    game.cards = shuffledArray;
    game.firstShuffleFinished = true;
    console.log("game");
    console.log(game);
    //set the turn to whoever started the game
    game.playerTurn = game.teamA[0];
    let i = 0;
    game.clients.forEach((cl) => {
      game.score[cl.clientId] = 0;
      //creating an array for ith player of 5 cards
      console.log("game for " + i + " player");
      console.log(game);
      const gameForPlayer = Object.assign({}, game);
      const playerCards = [];
      for (let j = i * 5; j < i * 5 + 5; j++) {
        playerCards.push(game.cards[j]);
      }
      i = i + 1;
      gameForPlayer.cards = playerCards;
      const payload = {
        gameId: data.data.gameId,
        game: gameForPlayer,
      };
      console.log("payload");
      console.log(payload);
      io.to(cl.clientId).emit("firstShuffleResponse", { payload });
    });
  });
  socket.on("startGame", (data) => {
    console.log(data);
    const game = games[data.data.gameId];
    let i = 0;
    let l = 0;
    game.clients.forEach((cl) => {
      //creating an array for ith player of 7 cards
      console.log("game for " + i + " player");
      console.log(game);
      const gameForPlayer = Object.assign({}, game);
      const playerCards = [];
      for (let k = l * 5; k < l * 5 + 5; k++) {
        playerCards.push(game.cards[k]);
      }
      l = l + 1;
      for (let j = i * 8 + 20; j < i * 8 + 28; j++) {
        playerCards.push(game.cards[j]);
      }
      i = i + 1;
      gameForPlayer.cards = playerCards;
      const payload = {
        gameId: data.data.gameId,
        game: gameForPlayer,
      };
      console.log("payload");
      console.log(payload);
      io.to(cl.clientId).emit("startGameResponse", { payload });
    });
  });
  socket.on("turupBid", (data) => {
    console.log(data);
    const game = games[data.data.gameId];
    console.log("game");
    console.log(game);
    const wantedTurup = data.data.selectedTurup;
    game.turupBids.push({
      clientId: data.data.playerId,
      wantedTurup,
      handsToWin: data.data.handsToWin,
    });
    if (game.turupBids.length === 4) {
      //find out who won
      let mosthands = 0;
      for (let i = 0; i < 4; i++) {
        if (game.turupBids[i].handsToWin > mosthands) {
          mosthands = game.turupBids[i].handsToWin;
        }
      }
      console.log("mosthands");
      console.log(mosthands);
      if (mosthands === 7) {
        console.log("7 ran");
        //then the turup goes to the creater
        for (let i = 0; i < 4; i++) {
          if (game.turupBids[i].clientId === game.teamA[0]) {
            console.log("this ran for");
            console.log(i);
            console.log(game.turupBids[i]);
            game.targetForTeamA = 7;
            game.targetForTeamB = 7;
            game.turup = game.turupBids[i].wantedTurup;
            break;
          }
        }
      } else {
        console.log("more ran");
        for (let i = 0; i < 4; i++) {
          if (game.turupBids[i].handsToWin === mosthands) {
            game.turup = game.turupBids[i].wantedTurup;
            if (
              game.turupBids[i].clientId === game.teamA[0] ||
              game.turupBids[i].clientId === game.teamA[1]
            ) {
              game.targetForTeamA = mosthands;
              game.targetForTeamB = 14 - mosthands;
            } else {
              game.targetForTeamB = mosthands;
              game.targetForTeamA = 14 - mosthands;
            }
          }
        }
      }
      //now that turup has been set we can update the values in the game
      const cardTypes = ["chidi", "eent", "paan", "hukum"];
      if (game.turup === cardTypes[0]) {
        for (let i = 0; i < 52; i++) {
          if (game.cards[i] >= 0 && game.cards[i] < 13) {
            game.cards[i] = game.cards[i] + 1000;
          }
        }
      } else if (game.turup === cardTypes[1]) {
        for (let i = 0; i < 52; i++) {
          if (game.cards[i] >= 13 && game.cards[i] < 26) {
            game.cards[i] = game.cards[i] + 1000;
          }
        }
      } else if (game.turup === cardTypes[2]) {
        for (let i = 0; i < 52; i++) {
          if (game.cards[i] >= 26 && game.cards[i] < 39) {
            game.cards[i] = game.cards[i] + 1000;
          }
        }
      } else if (game.turup === cardTypes[3]) {
        for (let i = 0; i < 52; i++) {
          if (game.cards[i] >= 39 && game.cards[i] < 52) {
            game.cards[i] = game.cards[i] + 1000;
          }
        }
      }
      game.clients.forEach((cl) => {
        const payload = {
          gameId: data.data.gameId,
          game,
          clientId: cl.clientId,
        };
        io.to(cl.clientId).emit("turupBidResponse", { payload });
      });
    }
  });
  socket.on("playCard", (data) => {
    console.log(data);
    //add this to the current hand
    const game = games[data.data.gameId];
    console.log("game");
    console.log(game);
    game.currentHand.push({
      card: data.data.cardPlayed,
      playedBy: data.data.playerId,
    });

    //set the turn to the next player

    // team A = [  A ,B ]
    //             |\/|
    //             |/\|
    //             |  \
    // team B = [  C , D ]

    //find which player it is
    if (data.data.playerId === game.teamA[0]) {
      game.playerTurn = game.teamB[0];
    }
    if (data.data.playerId === game.teamA[1]) {
      game.playerTurn = game.teamB[1];
    }
    if (data.data.playerId === game.teamB[0]) {
      game.playerTurn = game.teamA[1];
    }
    if (data.data.playerId === game.teamB[1]) {
      game.playerTurn = game.teamA[0];
    }

    //if this is the first card then that means its important for this hand
    //so increase its value by 100
    if (game.currentHand.length === 1) {
      console.log("1 ran");
      const cardPlayed = data.data.cardPlayed;
      console.log(cardPlayed);
      if (cardPlayed >= 0 && cardPlayed < 13) {
        for (let i = 0; i < 52; i++) {
          if (game.cards[i] >= 0 && game.cards[i] < 13) {
            game.cards[i] = game.cards[i] + 100;
          }
        }
      } else if (cardPlayed >= 13 && cardPlayed < 26) {
        for (let i = 0; i < 52; i++) {
          if (game.cards[i] >= 13 && game.cards[i] < 26) {
            game.cards[i] = game.cards[i] + 100;
          }
        }
      } else if (cardPlayed >= 26 && cardPlayed < 39) {
        for (let i = 0; i < 52; i++) {
          if (game.cards[i] >= 26 && game.cards[i] < 39) {
            game.cards[i] = game.cards[i] + 100;
          }
        }
      } else if (cardPlayed >= 39 && cardPlayed < 52) {
        for (let i = 0; i < 52; i++) {
          if (game.cards[i] >= 39 && game.cards[i] < 52) {
            game.cards[i] = game.cards[i] + 100;
          }
        }
      } else if (cardPlayed >= 1000 && cardPlayed < 1052) {
        for (let i = 0; i < 52; i++) {
          if (game.cards[i] >= 1000 && game.cards[i] < 1052) {
            game.cards[i] = game.cards[i] + 100;
          }
        }
      }
      //update this in the current hand too
      game.currentHand[0].card = game.currentHand[0].card + 100;
    }

    //if this is the fourth card then decide who won
    if (game.currentHand.length === 4) {
      const sortedHand = Object.assign({}, game.currentHand);

      // Convert the object to an array of objects
      const sortedHandArray = Object.values(sortedHand);

      // Sort the array based on the 'card' property
      sortedHandArray.sort((a, b) => b.card - a.card);
      console.log("sortedHandArray");
      console.log(sortedHandArray);
      const winningPlayer = sortedHandArray[0].playedBy;
      game.score[winningPlayer]++;
      //before discarding current hand make sure to remove 100 from the cards that are same as the first card of this hand
      const cardPlayed = game.currentHand[0].card;
      console.log(cardPlayed);
      if (cardPlayed >= 100 && cardPlayed < 152) {
        console.log("52 ran");
        for (let i = 0; i < 52; i++) {
          if (game.cards[i] >= 100 && game.cards[i] < 152) {
            game.cards[i] = game.cards[i] - 100;
          }
        }
      } else if (cardPlayed >= 1100 && cardPlayed < 1152) {
        console.log("53 ran");
        for (let i = 0; i < 52; i++) {
          if (game.cards[i] >= 1100 && game.cards[i] < 1152) {
            game.cards[i] = game.cards[i] - 100;
          }
        }
      }
      game.currentHand = [];
      game.previousHands.push(sortedHandArray);
      //set the turn to this player
      game.playerTurn = winningPlayer;
    }
    //remove that card from the playable cards
    //for now lets just make it negetive
    console.log("hello there");
    console.log(data.data.cardPlayed);
    console.log(game);
    if (data.data.cardPlayed < 100) {
      for (let i = 0; i < 52; i++) {
        if (
          game.cards[i] === data.data.cardPlayed + 100 ||
          game.cards[i] === data.data.cardPlayed - 100 ||
          game.cards[i] === data.data.cardPlayed
        ) {
          console.log("mw eN");
          game.cards[i] = game.cards[i] * -1;
        }
      }
    } else if (data.data.cardPlayed > 100) {
      for (let i = 0; i < 52; i++) {
        if (
          game.cards[i] === data.data.cardPlayed + 100 ||
          game.cards[i] === data.data.cardPlayed - 100 ||
          game.cards[i] === data.data.cardPlayed
        ) {
          console.log("mw eN");
          game.cards[i] = game.cards[i] * -1;
        }
      }
    } else {
      for (let i = 0; i < 52; i++) {
        if (game.cards[i] === data.data.cardPlayed) {
          console.log("mw eV");
          game.cards[i] = game.cards[i] * -1;
        }
      }
    }

    let i = 0;
    let l = 0;
    game.clients.forEach((cl) => {
      //creating an array for ith player
      const gameForPlayer = Object.assign({}, game);
      const playerCards = [];
      for (let k = l * 5; k < l * 5 + 5; k++) {
        playerCards.push(game.cards[k]);
      }
      l = l + 1;
      for (let j = i * 8 + 20; j < i * 8 + 28; j++) {
        playerCards.push(game.cards[j]);
      }
      i = i + 1;
      gameForPlayer.cards = playerCards;
      const payload = {
        gameId: data.data.gameId,
        game: gameForPlayer,
        playerId: cl.clientId,
      };
      console.log("payload");
      console.log(payload);
      io.to(cl.clientId).emit("playCardResponse", { payload });
    });
  });
});
