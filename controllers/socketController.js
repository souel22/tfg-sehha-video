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

    // Validate that the user is a specialist or a user
    if ((userRole === 'user' && appointment.user.toString() === userId) ||
        (userRole === 'specialist' && appointment.specialist.toString() === userId)) {
      
      if (numClients === 0) {
        socket.join(roomName);
        message.type = "create-room";
        socket.broadcast.to(roomName).emit('message', message);
        console.log("Room created");

        // Room creation event
        appointment.events.push({ event: 'create-room', timestamp: new Date() });
        await appointment.save();
      } else if (numClients === 1) {
        socket.join(roomName);
        message.type = "join-room";
        socket.broadcast.to(roomName).emit('message', message);
        console.log("Room joined");

        // room joining event
        appointment.events.push({ event: 'join-room', timestamp: new Date() });
        await appointment.save();

        // Change the appointment to active
        appointment.status = 'active';
        await appointment.save();
      } else {
        console.log("Room full");
      }
    } else {
      console.log('User not authorized to join this room');
    }
  } catch (error) {
    console.log('Token'+ message.token+' verification failed:', error.message);
  }
};

const handleRtcMessage = (socket, message) => {
  try {
    const decodedToken = verifyToken(message.token);
    const userId = decodedToken.id;
    const userRole = decodedToken.role;

    // Ensure the user has access to the room
    const roomName = message.room;
    const appointment = Appointment.findOne({ appointmentId: roomName });
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

    // Ensure the user has access to the room
    const roomName = message.room;
    const appointment = await Appointment.findOne({ appointmentId: roomName });
    if (appointment && (
        (userRole === 'user' && appointment.user.toString() === userId) ||
        (userRole === 'specialist' && appointment.specialist.toString() === userId)
    )) {
      if (socket.rooms.has(message.room)) {
        socket.to(message.room).emit('message', message);
        socket.leave(message.room);

        // Register the disconnection and update state 
        appointment.events.push({ event: 'bye', timestamp: new Date() });
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

module.exports = {
  handleReadyMessage,
  handleRtcMessage,
  handleByeMessage
};
