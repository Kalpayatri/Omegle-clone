const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

// schema and model
const messageSchema = new mongoose.Schema({
  room: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

const rooms = {};

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('join random room', () => {
    let room = null;
    for (let key in rooms) {
      if (rooms[key] < 2) {
        room = key;
        break;
      }
    }
    if (!room) {
      room = `room-${Math.random().toString(36).substr(2, 9)}`;
      rooms[room] = 0;
    }
    rooms[room]++;
    socket.join(room);
    socket.emit('join room', room);
    console.log(`User ${socket.id} joined room: ${room}`);
  });

  socket.on('chat message', async (data) => {
    const { room, message } = data;
    const newMessage = new Message({ room, message });
    try {
      await newMessage.save();
      io.to(room).emit('chat message', message);
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('error', 'Failed to save message');
    }
  });

  socket.on('disconnect', () => {
    for (let room in rooms) {
      if (rooms[room] > 0 && io.sockets.adapter.rooms.get(room)?.has(socket.id)) {
        rooms[room]--;
        if (rooms[room] === 0) {
          delete rooms[room];
        }
        break;
      }
    }
    console.log('user disconnected');
  });
});

server.listen(3000, () => {
  console.log('listening on 3000');
});
