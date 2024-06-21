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
      
      if ((userRole === 'user' && appointment.userConnected) || 
          (userRole === 'specialist' && appointment.specialistConnected)) {
        console.log(`${userRole} already connected`);
        return;
      }

      if (numClients === 0 || numClients === 1) {
        socket.join(roomName);

        if (userRole === 'user') {
          appointment.userConnected = true;
        } else if (userRole === 'specialist') {
          appointment.specialistConnected = true;
        }

        await appointment.save();

        message.type = numClients === 0 ? "create-room" : "join-room";
        socket.broadcast.to(roomName).emit('message', message);
        console.log(numClients === 0 ? "Room created" : "Room joined");

        appointment.events.push({ event: message.type, timestamp: new Date() });
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

        if (userRole === 'user') {
          appointment.userConnected = false;
        } else if (userRole === 'specialist') {
          appointment.specialistConnected = false;
        }

        appointment.events.push({ event: 'bye', timestamp: new Date() });
        appointment.status = appointment.userConnected || appointment.specialistConnected ? 'active' : 'completed';
        await appointment.save();
      }
    } else {
      console.log('User not authorized to leave this room');
    }
  } catch (error) {
    console.log('Token verification failed:', error.message);
  }
};

module.exports = {
  handleReadyMessage,
  handleRtcMessage,
  handleByeMessage
};
