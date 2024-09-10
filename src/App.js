import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const getAvatarUrl = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=random`;

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [isUsernameSet, setIsUsernameSet] = useState(false);
  const [users, setUsers] = useState([]);
  const messageListRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = new WebSocket("ws://localhost:3001");

    socketRef.current.onopen = () => {
      console.log("Connected to server");
    };

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "chat_message":
          setMessages((prevMessages) => [...prevMessages, data.message]);
          break;
        case "user_list":
          setUsers(data.users);
          break;
        case "chat_history":
          setMessages(data.messages);
          break;
        default:
          console.log("Unknown message type:", data.type);
      }
    };

    socketRef.current.onclose = () => {
      console.log("Disconnected from server");
    };

    return () => {
      socketRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const setUsernameFn = (e) => {
    e.preventDefault();
    if (username) {
      socketRef.current.send(
        JSON.stringify({ type: "set_username", username })
      );
      setIsUsernameSet(true);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (input && isUsernameSet) {
      socketRef.current.send(
        JSON.stringify({ type: "chat_message", text: input })
      );
      setInput("");
    }
  };

  if (!isUsernameSet) {
    return (
      <div className="App login-screen">
        <form onSubmit={setUsernameFn} className="login-form">
          <h2>Enter the Chat Room</h2>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            className="username-input"
          />
          <button type="submit" className="submit-btn">
            Join Chat
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="App chat-screen">
      <div className="sidebar">
        <h3>Online Users</h3>
        <ul className="user-list">
          {users.map((user, index) => (
            <li key={index} className="user-item">
              <img src={getAvatarUrl(user)} alt={user} className="avatar" />
              <span>{user}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="chat-area">
        <div className="chat-header">
          <h2>Welcome, {username}!</h2>
        </div>
        <div className="message-list" ref={messageListRef}>
          {messages.map((msg, index) => (
            <div key={index} className="message">
              <img
                src={getAvatarUrl(msg.username)}
                alt={msg.username}
                className="avatar"
              />
              <div className="message-content">
                <div className="message-header">
                  <span className="username">{msg.username}</span>
                  <span className="timestamp">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="message-text">{msg.text}</p>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} className="message-form">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="message-input"
          />
          <button type="submit" className="send-btn">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
