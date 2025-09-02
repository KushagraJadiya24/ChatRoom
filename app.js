const express = require("express");
const path = require("path");
const app = express();
const PORT = 4000;

// Add this for handling larger payloads (images)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const server = app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

const io = require("socket.io")(server, {
  maxHttpBufferSize: 10e6, // 10MB
});

app.use(express.static(path.join(__dirname, "public")));

const connectedUsers = new Map();
const socketsConnected = new Set();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  socketsConnected.add(socket.id);

  socket.on("user-joined", (username) => {
    connectedUsers.set(socket.id, username);
    console.log(`${username} joined the chat`);
    broadcastUserList();
    socket.broadcast.emit("user-joined", username);
    io.emit("clients-total", socketsConnected.size);
  });

  socket.on("image-message", (data) => {
    try {
      console.log(
        `Image received from ${data.name} (${Math.round(
          data.image.length / 1024
        )}KB)`
      );

      // Basic validation
      if (!data.image || data.image.length > 10 * 1024 * 1024) {
        // 10MB sanity check
        throw new Error("Invalid image data");
      }

      // Broadcast to all other clients
      socket.broadcast.emit("image-message-received", {
        name: data.name,
        image: data.image,
        dateTime: new Date(),
      });
    } catch (error) {
      console.error("Error handling image:", error);
      socket.emit("image-error", "Failed to send image");
    }
  });

  socket.on("message", (data) => {
    console.log("Message received:", data);
    socket.broadcast.emit("chat-message", data);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    socketsConnected.delete(socket.id);
    const username = connectedUsers.get(socket.id);

    if (username) {
      connectedUsers.delete(socket.id);
      socket.broadcast.emit("user-left", username);
      broadcastUserList();
    }

    io.emit("clients-total", socketsConnected.size);
  });
});

function broadcastUserList() {
  const userList = Array.from(connectedUsers.values());
  io.emit("user-list-updated", userList);
}
