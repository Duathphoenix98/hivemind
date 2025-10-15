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

const peers = new Map(); // peerId -> WebSocket

wss.on('connection', (ws) => {
  let peerId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'register':
          peerId = data.peerId;
          peers.set(peerId, ws);
          console.log(`✅ Peer registered: ${peerId} (Total: ${peers.size})`);

          // Send list of existing peers
          const peerList = Array.from(peers.keys()).filter(id => id !== peerId);
          ws.send(JSON.stringify({ type: 'peers', peers: peerList }));

          // Notify other peers
          broadcast({ type: 'peer-joined', peerId }, peerId);
          break;

        case 'signal':
          // Forward signaling messages between peers
          const targetWs = peers.get(data.targetPeerId);
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(JSON.stringify({
              type: 'signal',
              fromPeerId: peerId,
              signal: data.signal
            }));
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

function broadcast(message, excludePeerId = null) {
  const messageStr = JSON.stringify(message);
  peers.forEach((ws, peerId) => {
    if (peerId !== excludePeerId && ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}
