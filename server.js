require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: { origin: 'http://localhost:3001' }
});
const PORT = process.env.PORT || 8080;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('message', (message) => {
    console.log('Received message type:', message.type);

    const messageType = message.type;

    switch (messageType) {
      case 'ready':
        const roomName = message.room;
        const room = io.sockets.adapter.rooms.get(roomName) || new Set();
        const numClients = room.size;

        console.log(`Users in the room (${roomName}):`, numClients);
        console.log("Room", room);
        console.log("Message Room", roomName);

        if (numClients === 0) {
          socket.join(roomName);
          message.type = "create-room";
          socket.broadcast.to(roomName).emit('message', message);
          console.log("Room created");

          const updatedRoom = io.sockets.adapter.rooms.get(roomName);
          console.log("Room", updatedRoom);
          console.log("Number of clients", updatedRoom.size);
        } else if (numClients === 1) {
          socket.join(roomName);
          message.type = "join-room";
          socket.broadcast.to(roomName).emit('message', message);
          console.log("Room joined");

          const updatedRoom = io.sockets.adapter.rooms.get(roomName);
          console.log("Room", updatedRoom);
          console.log("Number of clients", updatedRoom.size);
        } else if (numClients >= 2) {
          console.log("Room full");
          const updatedRoom = io.sockets.adapter.rooms.get(roomName);
          console.log("Room", updatedRoom);
          console.log("Number of clients", updatedRoom.size);
        }
        break;
      case "offer":
      case "answer":
      case "candidate":
        console.log("Message type forwarded:", message.type);
        console.log("Room:", message.room);
        if (socket.rooms.has(message.room)) {
          socket.to(message.room).emit('message', message);
        }
        break;
      case "bye":
        console.log("Handling bye for room:", message.room);
        if (socket.rooms.has(message.room)) {
          socket.to(message.room).emit('message', message);
          socket.leave(message.room);
        }
        break;
      default:
        console.log('Unhandled message type:', messageType);
        break;
    }
  });

  socket.on('disconnect', () => {
    console.log("Client disconnected:", socket.id);
  });
});

function error(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Internal Server Error');
}

app.use(error);

server.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
