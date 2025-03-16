document.addEventListener("DOMContentLoaded", function () {
    let talkButton = document.getElementById("talkButton");
    let userInput = document.getElementById("user-input");
    let chatBox = document.getElementById("chat-box");

    if (talkButton) {
        talkButton.addEventListener("click", startListening);
    } else {
        console.error("Button with ID 'talkButton' not found!");
    }

    if (userInput) {
        userInput.addEventListener("keypress", function (event) {
            if (event.key === "Enter") {
                sendMessage();
            }
        });
    }
});

// Function to start listening to voice input
function startListening() {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Your browser doesn't support speech recognition. Try using Chrome.");
        return;
    }

    // Stop any ongoing speech before starting to listen
    window.speechSynthesis.cancel();

    let recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let listeningIndicator = document.createElement("div");
    listeningIndicator.classList.add("listening-indicator");
    listeningIndicator.textContent = "🎤 Listening...";
    document.getElementById("chat-box").appendChild(listeningIndicator);

    recognition.onresult = function (event) {
        let transcript = event.results[0][0].transcript.toLowerCase();
        console.log("You said:", transcript);

        listeningIndicator.remove();
        appendMessage("user-message", transcript);

        fetchAIResponse(transcript);
    };

    recognition.onerror = function (event) {
        console.error("Speech recognition error:", event.error);
        alert("Error: " + event.error);
        listeningIndicator.remove();
    };

    recognition.onstart = function () {
        console.log("Speech recognition started.");
    };

    recognition.onend = function () {
        console.log("Speech recognition ended.");
    };

    recognition.start();
    console.log("Listening...");
}

// Function to send message manually (Text input)
function sendMessage() {
    let userMessage = document.getElementById("user-input").value.trim();
    if (userMessage === "") return;

    // Stop any ongoing speech before sending a new message
    window.speechSynthesis.cancel();

    appendMessage("user-message", userMessage);
    document.getElementById("user-input").value = "";

    fetchAIResponse(userMessage);
}

// Function to fetch AI response from Flask backend
async function fetchAIResponse(userInput) {
    const API_URL = "http://127.0.0.1:5000/chat";
    try {
        appendTypingIndicator();
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userInput })
        });
        const result = await response.json();
        removeTypingIndicator();

        let aiResponse = result.response || "I'm not sure how to respond.";  
        appendMessage("bot-message", aiResponse);
        speak(aiResponse);
    } catch (error) {
        console.error("Fetch error:", error);
        removeTypingIndicator();
        speak("There was an error getting a response.");
    }
}

// Function to append messages to chat
function appendMessage(className, message) {
    let chatBox = document.getElementById("chat-box");
    let messageDiv = document.createElement("div");
    messageDiv.classList.add(className, "fade-in");
    messageDiv.textContent = message;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Function to append a typing indicator
function appendTypingIndicator() {
    let chatBox = document.getElementById("chat-box");
    let typingIndicator = document.createElement("div");
    typingIndicator.classList.add("typing-indicator");
    typingIndicator.innerHTML = "AI is typing <span>.</span><span>.</span><span>.</span>";
    typingIndicator.id = "typingIndicator";
    chatBox.appendChild(typingIndicator);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Function to remove typing indicator
function removeTypingIndicator() {
    let typingIndicator = document.getElementById("typingIndicator");
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Function to convert text to speech
function speak(text) {
    let synth = window.speechSynthesis;

    // Stop any ongoing speech
    synth.cancel();

    let utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    synth.speak(utterance);
}