require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./utils/logger');
const socketController = require('./controllers/socketController');
const setupRabbitMQConsumer = require('./controllers/rabbitmqController');

const app = express();

// Middlewares
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(logger);

const db = process.env.MONGO_URI.replace( "<password>",
  process.env.DB_PASSWORD
);

// Connect to MongoDB
mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Configure RabbitMQ consumers
setupRabbitMQConsumer().then(() => {
  console.log('RabbitMQ consumer setup complete');
}).catch(err => {
  console.error('Error setting up RabbitMQ consumer:', err);
});

// Create http server and configure socket.io
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: process.env.CORS_ORIGIN }
});

// Handle socket.io messages
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('message', (message) => {
    console.log('Received message type:', message.type);

    const messageType = message.type;

    switch (messageType) {
      case 'ready':
        socketController.handleReadyMessage(io, socket, message);
        break;
      case 'offer':
      case 'answer':
      case 'candidate':
        socketController.handleRtcMessage(socket, message);
        break;
      case 'bye':
        socketController.handleByeMessage(socket, message);
        break;
      default:
        console.log('Unhandled message type:', messageType);
        break;
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    socketController.handleDisconnect(socket);
  });
});

// Error handling middleware 
app.use(errorHandler);

// Start server
server.listen(process.env.PORT, () => {
  console.log('Listening on port', process.env.PORT);
});
