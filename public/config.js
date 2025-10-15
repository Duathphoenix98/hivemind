// Configuration for different deployment environments
const CONFIG = {
  // WebSocket signaling server URL
  // For local development, use ws://localhost:3000
  // For production, deploy server.js to a platform that supports WebSockets
  getSignalingUrl: () => {
    // Check if running locally
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'ws://localhost:3000';
    }

    // For Netlify deployment, you can:
    // 1. Use a free WebSocket service (recommended for demo)
    // 2. Deploy server.js to Heroku/Railway/Render and use that URL
    // 3. Use WebRTC without a signaling server (mesh network)

    // Option: Use environment variable for custom signaling server
    if (window.SIGNALING_SERVER) {
      return window.SIGNALING_SERVER;
    }

    // Default: Try to connect to same host with WSS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
};
