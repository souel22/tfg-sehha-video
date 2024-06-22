const Appointment = require('../models/appointmentModel');
const { verifyToken } = require('../utils/jwt');

const handleReadyMessage = async (io, socket, message) => {
  const roomName = message.room;
  const room = io.sockets.adapter.rooms.get(roomName) || new Set();
  const numClients = room.size;

  console.log(`Users in the room (${roomName}):`, numClients);

  const appointment = await Appointment.findOne({ appointmentId: roomName });
  if (!appointment) {
    console.log('Invalid appointment ID:', roomName);
    return;
  }

  try {
    const decodedToken = verifyToken(message.token);
    const userId = decodedToken.id;
    const userRole = decodedToken.role;

    if ((userRole === 'user' && appointment.user.toString() === userId) ||
        (userRole === 'specialist' && appointment.specialist.toString() === userId)) {
      
      // Check if a client of the same role is already connected
      if ((userRole === 'user' && appointment.userConnected) ||
          (userRole === 'specialist' && appointment.specialistConnected)) {
        console.log(`A client of role ${userRole} is already connected.`);
        return;
      }

      if (numClients === 0) {
        socket.join(roomName);
        message.type = "create-room";
        socket.broadcast.to(roomName).emit('message', message);
        console.log("Room created");

        appointment.events.push({ event: 'create-room', timestamp: new Date() });
        if (userRole === 'user') {
          appointment.userConnected = true;
          appointment.userSocketId = socket.id;
        } else {
          appointment.specialistConnected = true;
          appointment.specialistSocketId = socket.id;
        }
        await appointment.save();
      } else if (numClients === 1) {
        socket.join(roomName);
        message.type = "join-room";
        socket.broadcast.to(roomName).emit('message', message);
        console.log("Room joined");

        appointment.events.push({ event: 'join-room', timestamp: new Date() });
        if (userRole === 'user') {
          appointment.userConnected = true;
          appointment.userSocketId = socket.id;
        } else {
          appointment.specialistConnected = true;
          appointment.specialistSocketId = socket.id;
        }

        appointment.status = 'active';
        await appointment.save();
      } else {
        console.log("Room full");
      }
    } else {
      console.log('User not authorized to join this room');
    }
  } catch (error) {
    console.log('Token verification failed:', error.message);
  }
};

const handleRtcMessage = async (socket, message) => {
  try {
    const decodedToken = verifyToken(message.token);
    const userId = decodedToken.id;
    const userRole = decodedToken.role;

    const roomName = message.room;
    const appointment = await Appointment.findOne({ appointmentId: roomName });
    if (appointment && (
        (userRole === 'user' && appointment.user.toString() === userId) ||
        (userRole === 'specialist' && appointment.specialist.toString() === userId)
    )) {
      if (socket.rooms.has(message.room)) {
        socket.to(message.room).emit('message', message);
      }
    } else {
      console.log('User not authorized to send message to this room');
    }
  } catch (error) {
    console.log('Token verification failed:', error.message);
  }
};

const handleByeMessage = async (socket, message) => {
  try {
    const decodedToken = verifyToken(message.token);
    const userId = decodedToken.id;
    const userRole = decodedToken.role;

    const roomName = message.room;
    const appointment = await Appointment.findOne({ appointmentId: roomName });
    if (appointment && (
        (userRole === 'user' && appointment.user.toString() === userId) ||
        (userRole === 'specialist' && appointment.specialist.toString() === userId)
    )) {
      if (socket.rooms.has(message.room)) {
        socket.to(message.room).emit('message', message);
        socket.leave(message.room);

        appointment.events.push({ event: 'bye', timestamp: new Date() });
        if (userRole === 'user') {
          appointment.userConnected = false;
          appointment.userSocketId = null;
        } else {
          appointment.specialistConnected = false;
          appointment.specialistSocketId = null;
        }
        appointment.status = 'completed';
        await appointment.save();
      }
    } else {
      console.log('User not authorized to leave this room');
    }
  } catch (error) {
    console.log('Token verification failed:', error.message);
  }
};

const handleDisconnect = async (socket) => {
  const appointment = await Appointment.findOne({ $or: [{ userSocketId: socket.id }, { specialistSocketId: socket.id }] });
  if (appointment) {
    if (appointment.userSocketId === socket.id) {
      appointment.userConnected = false;
      appointment.userSocketId = null;
    } else if (appointment.specialistSocketId === socket.id) {
      appointment.specialistConnected = false;
      appointment.specialistSocketId = null;
    }

    await appointment.save();
    console.log(`Client disconnected: ${socket.id}`);
  }
};

module.exports = {
  handleReadyMessage,
  handleRtcMessage,
  handleByeMessage,
  handleDisconnect
};
