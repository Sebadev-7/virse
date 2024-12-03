const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://virse.vercel.app", "http://localhost:5173"], // Permitir solicitudes solo desde estos orígenes
    methods: ["GET", "POST"], // Permitir métodos GET y POST
  },
});

let rooms = {}; // Para almacenar las salas y sus hosts

app.use(cors({
  origin: ["https://virse.vercel.app", "http://localhost:5173"], // Permitir solicitudes solo desde estos orígenes
  methods: ["GET", "POST"], // Permitir métodos GET y POST
}));
app.use(express.json());

// Evento de conexión de Socket.IO
io.on("connection", (socket) => {
  console.log("Nuevo cliente conectado:", socket.id);

  // Crear sala y asignar como host
  socket.on("create_room", (_, callback) => {
    const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    rooms[roomCode] = { host: socket.id };
    socket.join(roomCode);
    callback(roomCode);
  });

  // Unirse a una sala
  socket.on("join_room", (roomCode, callback) => {
    if (rooms[roomCode]) {
      socket.join(roomCode);
      callback({ success: true });
    } else {
      callback({ success: false, message: "Sala no encontrada" });
    }
  });

  // Sincronizar video
  socket.on("play_video", ({ roomCode, videoUrl }) => {
    if (rooms[roomCode]?.host === socket.id) {
      io.to(roomCode).emit("play_video", videoUrl);
    }
  });

  // Pausar video
  socket.on("pause_video", ({ roomCode }) => {
    if (rooms[roomCode]?.host === socket.id) {
      io.to(roomCode).emit("pause_video");
    }
  });

  // Retroceder video 10 segundos
  socket.on("rewind_video", ({ roomCode }) => {
    if (rooms[roomCode]?.host === socket.id) {
      io.to(roomCode).emit("rewind_video");
    }
  });

  // Adelantar video 10 segundos
  socket.on("fast_forward_video", ({ roomCode }) => {
    if (rooms[roomCode]?.host === socket.id) {
      io.to(roomCode).emit("fast_forward_video");
    }
  });

  // Desconexión
  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
    // Eliminar la sala si el host se desconecta
    for (const roomCode in rooms) {
      if (rooms[roomCode].host === socket.id) {
        delete rooms[roomCode];
        io.to(roomCode).emit("room_closed");
      }
    }
  });
});

// Escuchar en el puerto proporcionado por Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
