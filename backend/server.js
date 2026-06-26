const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = 3001;

// --- TENNIS STATE ---
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PADDLE_WIDTH = 20;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 15;

let tennisPlayers = {};
let tennisInterval;
let tennisState = {
  player1: { y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 },
  player2: { y: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 },
  ball: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, vx: 5, vy: 5 },
  status: 'waiting'
};

function resetTennisBall() {
  tennisState.ball = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, vx: 5 * (Math.random() > 0.5 ? 1 : -1), vy: 5 * (Math.random() > 0.5 ? 1 : -1) };
}

function tennisLoop() {
  if (tennisState.status !== 'playing') return;
  tennisState.ball.x += tennisState.ball.vx;
  tennisState.ball.y += tennisState.ball.vy;
  if (tennisState.ball.y <= 0 || tennisState.ball.y + BALL_SIZE >= GAME_HEIGHT) tennisState.ball.vy *= -1;
  
  if (tennisState.ball.x <= PADDLE_WIDTH && tennisState.ball.y + BALL_SIZE >= tennisState.player1.y && tennisState.ball.y <= tennisState.player1.y + PADDLE_HEIGHT) {
    tennisState.ball.vx *= -1; tennisState.ball.x = PADDLE_WIDTH; tennisState.ball.vx += (tennisState.ball.vx > 0 ? 0.5 : -0.5);
  }
  if (tennisState.ball.x + BALL_SIZE >= GAME_WIDTH - PADDLE_WIDTH && tennisState.ball.y + BALL_SIZE >= tennisState.player2.y && tennisState.ball.y <= tennisState.player2.y + PADDLE_HEIGHT) {
    tennisState.ball.vx *= -1; tennisState.ball.x = GAME_WIDTH - PADDLE_WIDTH - BALL_SIZE; tennisState.ball.vx += (tennisState.ball.vx > 0 ? 0.5 : -0.5);
  }
  if (tennisState.ball.x < 0) { tennisState.player2.score++; resetTennisBall(); } 
  else if (tennisState.ball.x > GAME_WIDTH) { tennisState.player1.score++; resetTennisBall(); }
  io.to('tennis').emit('gameState', tennisState);
}

// --- OTHELLO STATE ---
let othelloPlayers = {}; 
let othelloState = { board: Array(8).fill(null).map(()=>Array(8).fill(null)), turn: 'black', status: 'waiting' };

const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
function isValidOthello(r, c, color) {
  if (othelloState.board[r][c] !== null) return false;
  let opponent = color === 'black' ? 'white' : 'black';
  let valid = false;
  for (let [dr, dc] of DIRS) {
    let nr = r + dr, nc = c + dc;
    let foundOpponent = false;
    while(nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && othelloState.board[nr][nc] === opponent) {
      foundOpponent = true;
      nr += dr; nc += dc;
    }
    if (foundOpponent && nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && othelloState.board[nr][nc] === color) {
      valid = true; break;
    }
  }
  return valid;
}
function flipOthello(r, c, color) {
  let opponent = color === 'black' ? 'white' : 'black';
  othelloState.board[r][c] = color;
  for (let [dr, dc] of DIRS) {
    let nr = r + dr, nc = c + dc;
    let flips = [];
    while(nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && othelloState.board[nr][nc] === opponent) {
      flips.push([nr, nc]);
      nr += dr; nc += dc;
    }
    if (flips.length > 0 && nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && othelloState.board[nr][nc] === color) {
      for (let [fr, fc] of flips) { othelloState.board[fr][fc] = color; }
    }
  }
}
function checkOthelloEnd() {
  let blackCount = 0, whiteCount = 0, empty = 0;
  let blackValid = false, whiteValid = false;
  for(let r=0; r<8; r++) {
    for(let c=0; c<8; c++) {
      if(othelloState.board[r][c]==='black') blackCount++;
      else if(othelloState.board[r][c]==='white') whiteCount++;
      else empty++;
      if(othelloState.board[r][c]===null) {
        if(isValidOthello(r, c, 'black')) blackValid = true;
        if(isValidOthello(r, c, 'white')) whiteValid = true;
      }
    }
  }
  if (empty === 0 || (!blackValid && !whiteValid)) {
    othelloState.status = 'finished';
    othelloState.winner = blackCount > whiteCount ? 'black' : (whiteCount > blackCount ? 'white' : 'draw');
  } else if (othelloState.turn === 'black' && !blackValid) {
    othelloState.turn = 'white';
  } else if (othelloState.turn === 'white' && !whiteValid) {
    othelloState.turn = 'black';
  }
}

// --- QUIZ STATE ---
let quizPlayers = {}; 
let quizState = { status: 'waiting', results: [] };

// --- SHOOTER STATE ---
let shooterPlayers = {};
let shooterState = { 
  status: 'waiting', 
  players: {}, // id -> { x, y, z, aimX, aimY, aimZ, score, color }
  targets: [] // { id, x, y, z, vx, vy, vz }
};
let shooterInterval;

function spawnShooterTarget() {
  return {
    id: Math.random().toString(36).substr(2, 9),
    x: (Math.random() - 0.5) * 20,
    y: (Math.random() - 0.5) * 10,
    z: -10 - Math.random() * 20,
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2,
    vz: (Math.random() - 0.5) * 0.2
  };
}

function shooterLoop() {
  if (shooterState.status !== 'playing') return;
  
  // Move targets
  for (let t of shooterState.targets) {
    t.x += t.vx;
    t.y += t.vy;
    t.z += t.vz;
    // Bounce
    if (t.x > 15 || t.x < -15) t.vx *= -1;
    if (t.y > 10 || t.y < -10) t.vy *= -1;
    if (t.z > -5 || t.z < -40) t.vz *= -1;
  }
  
  // Randomly add new targets up to 10
  if (shooterState.targets.length < 10 && Math.random() < 0.05) {
    shooterState.targets.push(spawnShooterTarget());
  }

  io.to('shooter').emit('shooterState', shooterState);
}

// --- LOBBY STATE ---
let lobbyUsers = {};
let chatMessages = [];

io.on('connection', (socket) => {
  // --- LOBBY ---
  socket.on('joinLobby', (data) => {
    socket.join('lobby');
    lobbyUsers[socket.id] = {
      name: data?.name || `User_${socket.id.substring(0,4)}`,
      color: `hsl(${Math.floor(Math.random() * 360)}, 100%, 70%)`,
      x: -100, y: -100
    };
    socket.emit('lobbyInit', { messages: chatMessages, users: lobbyUsers, me: socket.id });
    io.to('lobby').emit('lobbyUserJoined', { id: socket.id, user: lobbyUsers[socket.id] });
  });
  socket.on('lobbyMouseMove', ({ x, y }) => {
    if (lobbyUsers[socket.id]) {
      lobbyUsers[socket.id].x = x;
      lobbyUsers[socket.id].y = y;
      socket.volatile.broadcast.to('lobby').emit('lobbyCursor', { id: socket.id, x, y });
    }
  });
  socket.on('sendChatMessage', (text) => {
    if (lobbyUsers[socket.id] && text) {
      const msg = {
        id: Date.now() + Math.random(),
        user: lobbyUsers[socket.id].name,
        color: lobbyUsers[socket.id].color,
        text: text,
        time: new Date().toLocaleTimeString()
      };
      chatMessages.push(msg);
      if (chatMessages.length > 50) chatMessages.shift();
      io.to('lobby').emit('chatMessage', msg);
    }
  });

  // --- TENNIS ---
  socket.on('joinTennis', () => {
    socket.join('tennis');
    if (Object.keys(tennisPlayers).length === 0) {
      tennisPlayers[socket.id] = 'player1'; socket.emit('assignedRole', 'player1');
    } else if (Object.keys(tennisPlayers).length === 1) {
      tennisPlayers[socket.id] = 'player2'; socket.emit('assignedRole', 'player2');
      tennisState.status = 'playing'; resetTennisBall(); tennisState.player1.score = 0; tennisState.player2.score = 0;
      io.to('tennis').emit('gameStart');
      if (tennisInterval) clearInterval(tennisInterval);
      tennisInterval = setInterval(tennisLoop, 1000 / 60);
    } else {
      socket.emit('assignedRole', 'spectator');
    }
  });
  socket.on('tennisMove', (data) => {
    const role = tennisPlayers[socket.id];
    if (role === 'player1') tennisState.player1.y = Math.max(0, Math.min(GAME_HEIGHT - PADDLE_HEIGHT, data.y));
    else if (role === 'player2') tennisState.player2.y = Math.max(0, Math.min(GAME_HEIGHT - PADDLE_HEIGHT, data.y));
  });

  // --- OTHELLO ---
  socket.on('joinOthello', () => {
    socket.join('othello');
    if (Object.keys(othelloPlayers).length === 0) {
      othelloPlayers[socket.id] = 'black'; socket.emit('assignedRole', 'black');
    } else if (Object.keys(othelloPlayers).length === 1) {
      othelloPlayers[socket.id] = 'white'; socket.emit('assignedRole', 'white');
      othelloState.status = 'playing';
      othelloState.board = Array(8).fill(null).map(()=>Array(8).fill(null));
      othelloState.board[3][3] = 'white'; othelloState.board[3][4] = 'black';
      othelloState.board[4][3] = 'black'; othelloState.board[4][4] = 'white';
      othelloState.turn = 'black';
      io.to('othello').emit('othelloState', othelloState);
    } else {
      socket.emit('assignedRole', 'spectator');
    }
    io.to('othello').emit('othelloState', othelloState);
  });
  socket.on('othelloMove', ({ r, c }) => {
    let role = othelloPlayers[socket.id];
    if (othelloState.status !== 'playing' || othelloState.turn !== role) return;
    if (isValidOthello(r, c, role)) {
      flipOthello(r, c, role);
      othelloState.turn = role === 'black' ? 'white' : 'black';
      checkOthelloEnd();
      io.to('othello').emit('othelloState', othelloState);
    }
  });

  // --- QUIZ ---
  socket.on('joinQuiz', () => {
    socket.join('quiz');
    let pCount = Object.keys(quizPlayers).length;
    if (pCount < 2) {
      let role = pCount === 0 ? 'player1' : 'player2';
      quizPlayers[socket.id] = { role, score: 0, time: 0, done: false };
      socket.emit('assignedRole', role);
      if (pCount === 1) { 
        quizState.status = 'playing';
        quizState.results = [];
        io.to('quiz').emit('quizStart');
      }
    } else {
      socket.emit('assignedRole', 'spectator');
    }
    io.to('quiz').emit('quizState', quizState);
  });
  socket.on('quizFinish', ({ score, time }) => {
    if (quizPlayers[socket.id]) {
      quizPlayers[socket.id].score = score;
      quizPlayers[socket.id].time = time;
      quizPlayers[socket.id].done = true;
      let allDone = true;
      let results = [];
      for(let id in quizPlayers) {
        if (!quizPlayers[id].done) allDone = false;
        results.push(quizPlayers[id]);
      }
      if (allDone) {
        quizState.status = 'finished';
        results.sort((a,b) => b.score - a.score || a.time - b.time);
        quizState.results = results;
        io.to('quiz').emit('quizState', quizState);
        for(let id in quizPlayers) quizPlayers[id].done = false;
      }
    }
  });

  // --- SHOOTER ---
  socket.on('joinShooter', () => {
    socket.join('shooter');
    let pCount = Object.keys(shooterPlayers).length;
    if (pCount < 2) {
      let color = pCount === 0 ? '#00f3ff' : '#ff00ff';
      let x = pCount === 0 ? -3 : 3;
      shooterPlayers[socket.id] = { role: 'player', color, score: 0 };
      shooterState.players[socket.id] = { x, y: 0, z: 10, aimX: 0, aimY: 0, aimZ: -20, score: 0, color };
      socket.emit('assignedRole', 'player');
      
      if (Object.keys(shooterPlayers).length === 2) {
        shooterState.status = 'playing';
        for (let i = 0; i < 5; i++) shooterState.targets.push(spawnShooterTarget());
        if (shooterInterval) clearInterval(shooterInterval);
        shooterInterval = setInterval(shooterLoop, 1000 / 30);
      }
    } else {
      socket.emit('assignedRole', 'spectator');
    }
    io.to('shooter').emit('shooterState', shooterState);
  });

  socket.on('shooterAim', ({ aimX, aimY, aimZ }) => {
    if (shooterState.players[socket.id]) {
      shooterState.players[socket.id].aimX = aimX;
      shooterState.players[socket.id].aimY = aimY;
      shooterState.players[socket.id].aimZ = aimZ;
      // We broadcast the state at 30fps anyway, but volatile aim update can be done here.
    }
  });

  socket.on('shooterHit', ({ targetId }) => {
    if (shooterState.players[socket.id]) {
      const tIndex = shooterState.targets.findIndex(t => t.id === targetId);
      if (tIndex !== -1) {
        shooterState.targets.splice(tIndex, 1);
        shooterState.players[socket.id].score++;
        io.to('shooter').emit('shooterHitEvent', { id: socket.id, targetId });
      }
    }
  });

  socket.on('disconnect', () => {
    if (lobbyUsers[socket.id]) {
      delete lobbyUsers[socket.id];
      io.to('lobby').emit('lobbyUserLeft', socket.id);
    }
    if (tennisPlayers[socket.id]) {
      delete tennisPlayers[socket.id];
      tennisState.status = 'waiting';
      if (tennisInterval) clearInterval(tennisInterval);
      io.to('tennis').emit('playerDisconnected');
    }
    if (othelloPlayers[socket.id]) {
      delete othelloPlayers[socket.id];
      othelloState.status = 'waiting';
      io.to('othello').emit('playerDisconnected');
    }
    if (quizPlayers[socket.id]) {
      delete quizPlayers[socket.id];
      quizState.status = 'waiting';
      io.to('quiz').emit('playerDisconnected');
    }
    if (shooterPlayers[socket.id]) {
      delete shooterPlayers[socket.id];
      delete shooterState.players[socket.id];
      shooterState.status = 'waiting';
      shooterState.targets = [];
      if (shooterInterval) clearInterval(shooterInterval);
      io.to('shooter').emit('shooterState', shooterState);
      io.to('shooter').emit('playerDisconnected');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
