import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import AgoraRTC from 'agora-rtc-sdk-ng';
import './App.css';

const socket = io('https://backend-omegle-production.up.railway.app', {
  transports: ['websocket', 'polling'], // Ensure compatibility
  withCredentials: true, // Send cookies
});
const APP_ID = '93861d0efa7f43e59c0a9f3fce4935bf'; 
const TOKEN = '007eJxTYLgosY/brnAPC0tT8PzZj7790WgWUna7ybI0awO/Fo9NY4MCg6WxhZlhikFqWqJ5molxqqllskGiZZpxWnKqiaWxaVKab++ctIZARobjnP1MjAwQCOKzMJSkFpcwMAAAoiodaQ=='; // Replace with your new Agora token

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

function App() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [room, setRoom] = useState('');
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [localTracks, setLocalTracks] = useState([]);
  const messagesEndRef = useRef(null);
  const videoRef = useRef(null);
  const [videoEnabled, setVideoEnabled] = useState(true);

  useEffect(() => {
    socket.on('chat message', (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    socket.on('join room', async (room) => {
      setRoom(room);
      setJoinedRoom(true);
      setMessages([]);

      const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      setLocalTracks([microphoneTrack, cameraTrack]);
      await client.join(APP_ID, 'test', TOKEN); 
      await client.publish([microphoneTrack, cameraTrack]);
    });

    return () => {
      socket.off('chat message');
      socket.off('join room');
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const initAgora = async () => {
      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'video') {
          const remoteVideoTrack = user.videoTrack;
          const remoteContainer = document.createElement('div');
          remoteContainer.id = user.uid.toString();
          remoteContainer.style.width = '100%';
          remoteContainer.style.height = '100%';
          videoRef.current.append(remoteContainer);
          remoteVideoTrack.play(remoteContainer);
        }
      });

      client.on('user-unpublished', (user) => {
        document.getElementById(user.uid.toString()).remove();
      });
    };

    initAgora();

    return () => {
      client.removeAllListeners();
    };
  }, []);

  const handleJoinRoom = (e) => {
    e.preventDefault();
    socket.emit('join random room');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message && joinedRoom) {
      socket.emit('chat message', { room, message });
      setMessage('');
    }
  };

  const toggleVideo = async () => {
    if (localTracks[1]) {
      if (videoEnabled) {
        await localTracks[1].setEnabled(false);
      } else {
        await localTracks[1].setEnabled(true);
      }
      setVideoEnabled(!videoEnabled);
    }
  };

  return (
    <div className="App">
      {!joinedRoom ? (
        <form id="joinRoomForm" onSubmit={handleJoinRoom}>
          <button type="submit">Join Me</button>
        </form>
      ) : (
        <>
          <ul id="messages">
            {messages.map((msg, index) => (
              <li key={index}>{msg}</li>
            ))}
            <div ref={messagesEndRef} />
          </ul>
          <div id="videoContainer" ref={videoRef} style={{ width: '100%', height: '300px', position: 'relative' }}>
            <div id="localVideo" style={{ width: '100%', height: '100%', position: 'absolute' }} />
          </div>
          <form id="form" onSubmit={handleSubmit}>
            <input
              id="input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message"
              autoComplete="off"
            />
            <button type="submit">Send</button>
          </form>
          <button onClick={toggleVideo}>
            {videoEnabled ? 'Turn Off Video' : 'Turn On Video'}
          </button>
        </>
      )}
    </div>
  );
}

export default App;
