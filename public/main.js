const socket = io();
const connectedUsers = []; // Array to store connected usernames

// Get all DOM elements
const imageInput = document.getElementById("image-input");
const selectImageBtn = document.getElementById("select-image-btn");
const imagePreviewContainer = document.getElementById("image-preview-container");
const imagePreview = document.getElementById("image-preview");
const cancelImageBtn = document.getElementById("cancel-image-btn");
const sendImageBtn = document.getElementById("send-image-btn");
const clientTotal = document.getElementById("clients-total");
const messageContainer = document.getElementById("message-container");
const nameInput = document.getElementById("name-input");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const joined = document.getElementById("feedback");
const app = document.querySelector(".app");
const userList = document.querySelector("#users");
const emojiPicker = document.getElementById("emojiPicker");
const toggleEmojiPicker = document.getElementById("toggleEmojiPicker");

// Emoji picker functionality
async function loadEmojis() {
    try {
        const response = await fetch(`https://emoji-api.com/emojis?access_key=9c8d30b3754c5ba056e6096331377ac02430c680`);
        const data = await response.json();

        if (data.length > 0) {
            populateEmojiPicker(data);
        } else {
            console.error("No emojis found!");
        }
    } catch (error) {
        console.error("Error fetching emojis:", error);
    }
}

function populateEmojiPicker(emojis) {
    emojiPicker.innerHTML = "";
    emojis.forEach(emoji => {
        const emojiButton = document.createElement("button");
        emojiButton.classList.add("emoji-btn");
        emojiButton.innerText = emoji.character;
        emojiPicker.appendChild(emojiButton);
    });

    emojiPicker.addEventListener("click", (event) => {
        if (event.target.tagName === "BUTTON") {
            event.preventDefault();
            messageInput.value += event.target.innerText;
            emojiPicker.style.display = "none";
            messageInput.focus(); 
        }
    });
}

toggleEmojiPicker.addEventListener("click", (e) => {
    e.preventDefault();
    emojiPicker.style.display = emojiPicker.style.display === "none" ? "block" : "none";
    if (emojiPicker.style.display === "block") {
        messageInput.focus(); 
    }
});

document.addEventListener("DOMContentLoaded", loadEmojis);

app.querySelector(".join-screen #join-user").addEventListener("click", function () {
    let username = app.querySelector(".join-screen #username").value.trim();
    if (username.length === 0) {
        alert("Please enter a username to join the chat.");
        return;
    }

    nameInput.value = username;
    socket.emit("user-joined", username);
    app.querySelector(".join-screen").classList.remove("active");
    app.querySelector(".chat-screen").classList.add("active");
});


socket.on("user-list-updated", (users) => {
    connectedUsers.length = 0;
    userList.innerHTML = "";
    
    users.forEach(user => {
        if (!connectedUsers.includes(user)) {
            connectedUsers.push(user);
            const userElement = document.createElement('li');
            userElement.classList.add('user-names');
            userElement.innerHTML = `<p class="uname">${user}</p>`;
            userList.appendChild(userElement);
        }
    });
});

socket.on("clients-total", (data) => {
    clientTotal.innerText = `Total Clients: ${data}`;
});

// Message handling
messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage();
});

function sendMessage() {
    let message = messageInput.value.trim();
    if (message === "") return;

    const data = {
        name: nameInput.value,
        message: message,
        dateTime: new Date(),
    };

    socket.emit("message", data);
    messageInput.value = "";
    addMessageToUI(true, data);
    scrollToBottom();
}

socket.on("chat-message", (data) => {
    addMessageToUI(false, data);
    scrollToBottom();
});

socket.on("user-joined", (name) => {
    joined.innerText = `${name} joined the chat`;
    scrollToBottom();
});

socket.on("user-left", (name) => {
    joined.innerText = `${name} left the chat`;
    removeUserFromList(name);
    scrollToBottom();
});

function addUserToList(name) {
    if (!connectedUsers.includes(name)) {
        connectedUsers.push(name);
        const online = document.createElement("li");
        online.classList.add("user-names");
        online.innerHTML = `<p class="uname">${name}</p>`;
        userList.appendChild(online);
    }
}

function removeUserFromList(name) {
    const index = connectedUsers.indexOf(name);
    if (index !== -1) {
        connectedUsers.splice(index, 1);
    }
    
    const users = document.querySelectorAll(".user-names");
    users.forEach(user => {
        if (user.querySelector(".uname").textContent === name) {
            user.remove();
        }
    });
}

function addMessageToUI(isOwnMessage, data) {
    const element = document.createElement("li");
    element.classList.add(isOwnMessage ? "message-right" : "message-left");
    
    element.innerHTML = `
        <p class="message">${data.message}
        <span>${data.name} · ${moment(data.dateTime).fromNow()}</span></p>
    `;
    
    messageContainer.appendChild(element);
}

function scrollToBottom() {
    messageContainer.scrollTo({
        top: messageContainer.scrollHeight,
        behavior: "smooth",
    });
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; 
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

selectImageBtn.addEventListener("click", (e) => {
    e.preventDefault();
    imageInput.click();
    console.log("Image button clicked"); // Debug log
});

imageInput.addEventListener("change", function(e) {
    if (!this.files || !this.files[0]) return;
    
    const file = this.files[0];
    console.log("File selected:", file.name, file.size); 

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        alert('Please select a valid image (JPEG, PNG, GIF, or WebP)');
        this.value = '';
        return;
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
        alert(`Image too large! Maximum ${MAX_IMAGE_SIZE/1024/1024}MB allowed`);
        this.value = '';
        return;
    }

    
    const reader = new FileReader();
    reader.onload = function(event) {
        imagePreview.src = event.target.result;
        imagePreviewContainer.style.display = "block";
        messageInput.disabled = true;
        console.log("Image preview created"); // Debug log
    };
    reader.readAsDataURL(file);
});

cancelImageBtn.addEventListener("click", (e) => {
    e.preventDefault();
    resetImageInput();
    console.log("Image cancelled"); // Debug log
});

sendImageBtn.addEventListener("click", (e) => {
    e.preventDefault();
    
    if (!imageInput.files || !imageInput.files[0]) return;
    
    const file = imageInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(event) {
        const imageData = {
            name: nameInput.value,
            image: event.target.result,
            dateTime: new Date()
        };
        
        console.log("Sending image:", file.name); // Debug log
        socket.emit("image-message", imageData);
        addImageMessageToUI(true, imageData);
        scrollToBottom();
        resetImageInput();
    };
    
    reader.readAsDataURL(file);
});

function resetImageInput() {
    imageInput.value = "";
    imagePreview.src = "#";
    imagePreviewContainer.style.display = "none";
    messageInput.disabled = false;
    messageInput.focus();
    console.log("Image input reset"); // Debug log
}

socket.on("image-message-received", (data) => {
    console.log("Image received from", data.name); // Debug log
    addImageMessageToUI(false, data);
    scrollToBottom();
});

function addImageMessageToUI(isOwnMessage, data) {
    const element = document.createElement("li");
    element.classList.add(isOwnMessage ? "message-right" : "message-left");
    
    element.innerHTML = `
        <p class="message">
            <span>${data.name} · ${moment(data.dateTime).fromNow()}</span>
        </p>
        <img src="${data.image}" class="message-image" alt="Sent image">
    `;
    
    messageContainer.appendChild(element);
}

function scrollToBottom() {
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

socket.on("error", (error) => {
    console.error("Socket error:", error);
    alert("Something went wrong. Please try again.");
});