const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('public'));

const server = app.listen(PORT, () => {
  console.log(`🐝 Hivemind server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket signaling ready`);
});

// WebSocket server for signaling
const wss = new WebSocket.Server({ server });

const peers = new Map(); // peerId -> { ws: WebSocket, lastPing: timestamp }

// Heartbeat interval to keep connections alive
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 60000; // 60 seconds

wss.on('connection', (ws) => {
  let peerId = null;
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
    if (peerId && peers.has(peerId)) {
      peers.get(peerId).lastPing = Date.now();
    }
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'register':
          peerId = data.peerId;
          peers.set(peerId, { ws, lastPing: Date.now() });
          console.log(`✅ Peer registered: ${peerId} (Total: ${peers.size})`);

          // Send list of existing peers
          const peerList = Array.from(peers.keys()).filter(id => id !== peerId);
          ws.send(JSON.stringify({ type: 'peers', peers: peerList }));

          // Notify other peers
          broadcast({ type: 'peer-joined', peerId }, peerId);
          break;

        case 'signal':
          // Forward signaling messages between peers
          const targetPeer = peers.get(data.targetPeerId);
          if (targetPeer && targetPeer.ws.readyState === WebSocket.OPEN) {
            targetPeer.ws.send(JSON.stringify({
              type: 'signal',
              fromPeerId: peerId,
              signal: data.signal
            }));
          }
          break;

        case 'ping':
          // Client ping
          ws.send(JSON.stringify({ type: 'pong' }));
          if (peerId && peers.has(peerId)) {
            peers.get(peerId).lastPing = Date.now();
          }
          break;

        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (err) {
      console.error('Error handling message:', err);
    }
  });

  ws.on('close', () => {
    if (peerId) {
      peers.delete(peerId);
      console.log(`❌ Peer disconnected: ${peerId} (Total: ${peers.size})`);
      broadcast({ type: 'peer-left', peerId }, peerId);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

// Heartbeat to keep connections alive
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

function broadcast(message, excludePeerId = null) {
  const messageStr = JSON.stringify(message);
  peers.forEach((peer, peerId) => {
    if (peerId !== excludePeerId && peer.ws.readyState === WebSocket.OPEN) {
      peer.ws.send(messageStr);
    }
  });
}

// Cleanup on server shutdown
wss.on('close', () => {
  clearInterval(heartbeat);
});
