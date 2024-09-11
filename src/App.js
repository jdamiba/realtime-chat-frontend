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
        case "private_message":
          setPrivateTabs((prevTabs) => {
            const otherUser =
              data.message.sender === username
                ? data.message.recipient
                : data.message.sender;
            const updatedMessages = prevTabs[otherUser]?.messages || [];
            return {
              ...prevTabs,
              [otherUser]: {
                ...prevTabs[otherUser],
                messages: [...updatedMessages, data.message],
              },
            };
          });
          break;
        case "private_history":
          setPrivateTabs((prevTabs) => ({
            ...prevTabs,
            [data.otherUser]: {
              ...prevTabs[data.otherUser],
              messages: data.history,
            },
          }));
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
  }, [username]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages, privateTabs, activeTab]);

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
      if (activeTab === "main") {
        socketRef.current.send(
          JSON.stringify({ type: "chat_message", text: input })
        );
      } else {
        socketRef.current.send(
          JSON.stringify({
            type: "private_message",
            text: input,
            recipient: activeTab,
          })
        );
      }
      setInput("");
    }
  };

  const openPrivateChat = (user) => {
    if (user !== username) {
      setActiveTab(user);
      if (!privateTabs[user]) {
        setPrivateTabs((prevTabs) => ({
          ...prevTabs,
          [user]: { messages: [] },
        }));
        socketRef.current.send(
          JSON.stringify({ type: "get_private_history", otherUser: user })
        );
      }
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
        <h3>Online Users</h3>
        <ul className="user-list">
          {users.map((user, index) => (
            <li
              key={index}
              className="user-item"
              onClick={() => openPrivateChat(user)}
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
    </div>
  );
}

export default App;
