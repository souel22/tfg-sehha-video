const express = require('express');
const app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);



const port = process.env.PORT || 8080;

// 
app.use(express.static(__dirname + '/public'));

http.listen(port, () => {
    console.log('listening on *:' + port);
});

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('join-room', (room) => {
        console.log('create or join to room: ' + room);
        console.log('socket id: ' + socket.id);

        const myRoom = io.sockets.adapter.rooms[room] || { length: 0 };
        console.log("My room: ",myRoom);
        const numClients = myRoom.length;
        console.log(room + ' has ' + numClients + ' clients');

        if (numClients === 0) {
            socket.join(room);
            socket.emit('created', room);
        } else if (numClients === 1) {
            socket.join(room);
            socket.emit('joined', room);
        } else {
            socket.emit('full', room);
        }
    })


    socket.on('ready', (appointment) => {
        socket.broadcast.to(appointment).emit('ready');
    });

    socket.on('candidate', (event) => {
        socket.broadcast.to(event.room).emit('candidate', event.candidate);
    });

    socket.on('offer', (event) => {
        socket.broadcast.to(event.room).emit('offer', event.sdp);
    });

    socket.on('answer', (event) => {
        socket.broadcast.to(event.room).emit('answer', event.sdp);
    });
});