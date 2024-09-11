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
  const [activeTab, setActiveTab] = useState("main");
  const [privateTabs, setPrivateTabs] = useState({});
  const messageListRef = useRef(null);
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const usernameRef = useRef("");

  useEffect(() => {
    socketRef.current = new WebSocket(
      "wss://realtime-chat-backend-09v8.onrender.com"
    );

    socketRef.current.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };

    socketRef.current.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    socketRef.current.onmessage = (event) => {
      console.log("Received message from server:", event.data);
      try {
        const data = JSON.parse(event.data);
        console.log("Parsed message:", data);

        switch (data.type) {
          case "chat_message":
            console.log("Updating messages with:", data.message);
            setMessages((prevMessages) => [...prevMessages, data.message]);
            break;
          case "user_list":
            console.log("Updating user list:", data.users);
            setUsers(data.users);
            break;
          case "chat_history":
            console.log("Setting chat history:", data.messages);
            setMessages(data.messages);
            break;
          case "private_message":
            console.log("Received private message:", data.message);
            setPrivateTabs((prevTabs) => {
              const otherUser =
                data.message.sender === username
                  ? data.message.recipient
                  : data.message.sender;

              // Always update the tab, regardless of whether it's our message or not
              return {
                ...prevTabs,
                [otherUser]: {
                  messages: [
                    ...(prevTabs[otherUser]?.messages || []),
                    data.message,
                  ],
                },
              };
            });
            break;
          default:
            console.log("Unknown message type:", data.type);
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    };

    // ... rest of the WebSocket event handlers

    return () => {
      socketRef.current.close();
    };
  }, [username]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages, privateTabs, activeTab]);

  const setUsernameFn = (e) => {
    e.preventDefault();
    if (username.trim() && socketRef.current.readyState === WebSocket.OPEN) {
      const trimmedUsername = username.trim();
      console.log("Sending username:", trimmedUsername);
      socketRef.current.send(
        JSON.stringify({ type: "set_username", username: trimmedUsername })
      );
      setUsername(trimmedUsername);
      usernameRef.current = trimmedUsername;
      setIsUsernameSet(true);
    } else {
      console.log("WebSocket not ready or username empty");
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (input && isUsernameSet) {
      if (activeTab === "main") {
        socketRef.current.send(
          JSON.stringify({ type: "chat_message", text: input })
        );
      } else {
        const privateMessage = {
          type: "private_message",
          text: input,
          recipient: activeTab,
        };
        socketRef.current.send(JSON.stringify(privateMessage));

        // Remove the immediate UI update
      }
      setInput("");
    }
  };

  const openPrivateChat = (user) => {
    if (user !== username) {
      setActiveTab(user);
      setPrivateTabs((prevTabs) => {
        if (!prevTabs[user]) {
          return {
            ...prevTabs,
            [user]: { messages: [] },
          };
        }
        return prevTabs;
      });
      socketRef.current.send(
        JSON.stringify({ type: "get_private_history", otherUser: user })
      );
    }
  };

  const closePrivateChat = (user) => {
    setPrivateTabs((prevTabs) => {
      const newTabs = { ...prevTabs };
      delete newTabs[user];
      return newTabs;
    });
    if (activeTab === user) {
      setActiveTab("main");
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
        <h3>Online Users ({users.length})</h3>
        <ul className="user-list">
          {users.map((user, index) => (
            <li
              key={index}
              className="user-item"
              onClick={() => user !== username && openPrivateChat(user)}
            >
              <img src={getAvatarUrl(user)} alt={user} className="avatar" />
              <span>{user}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="chat-area">
        <div className="chat-tabs">
          <button
            className={`tab ${activeTab === "main" ? "active" : ""}`}
            onClick={() => setActiveTab("main")}
          >
            Main Chat
          </button>
          {Object.keys(privateTabs).map((user) => (
            <button
              key={user}
              className={`tab ${activeTab === user ? "active" : ""}`}
              onClick={() => setActiveTab(user)}
            >
              {user}
              <span
                className="close-tab"
                onClick={(e) => {
                  e.stopPropagation();
                  closePrivateChat(user);
                }}
              >
                ×
              </span>
            </button>
          ))}
        </div>
        <div className="chat-header">
          <h2>
            {activeTab === "main" ? "Main Chat" : `Chat with ${activeTab}`}
          </h2>
        </div>
        <div className="message-list" ref={messageListRef}>
          {activeTab === "main"
            ? messages.map((msg, index) => (
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
              ))
            : privateTabs[activeTab]?.messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message ${
                    msg.sender === username ? "sent" : "received"
                  }`}
                >
                  <img
                    src={getAvatarUrl(msg.sender)}
                    alt={msg.sender}
                    className="avatar"
                  />
                  <div className="message-content">
                    <div className="message-header">
                      <span className="username">{msg.sender}</span>
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
            placeholder={`Type a message to ${
              activeTab === "main" ? "everyone" : activeTab
            }...`}
            className="message-input"
          />
          <button type="submit" className="send-btn">
            Send
          </button>
        </form>
      </div>
      <div className="connection-status">
        Connection status: {isConnected ? "Connected" : "Disconnected"}
      </div>
    </div>
  );
}

export default App;
