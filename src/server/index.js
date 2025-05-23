const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const connectDB = require('./database/init');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// 连接数据库
connectDB();

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log('新玩家连接:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('玩家断开连接:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});