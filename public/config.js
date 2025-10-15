// Configuration for different deployment environments
const CONFIG = {
  // WebSocket signaling server URL
  // IMPORTANT: Set this to your deployed signaling server URL
  // Example: 'wss://hivemind-signaling.railway.app' or 'wss://hivemind-signaling.onrender.com'
  PRODUCTION_SIGNALING_SERVER: 'wss://hivemind-production-3f6e.up.railway.app', // Change this to your signaling server URL

  getSignalingUrl: () => {
    // Check if running locally
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'ws://localhost:3000';
    }

    // Use the production signaling server if configured
    if (CONFIG.PRODUCTION_SIGNALING_SERVER) {
      return CONFIG.PRODUCTION_SIGNALING_SERVER;
    }

    // Check for environment variable (set in Netlify UI)
    if (window.SIGNALING_SERVER) {
      return window.SIGNALING_SERVER;
    }

    // Default: Try to connect to same host (will fail on Netlify)
    console.warn('⚠️ No signaling server configured! Set CONFIG.PRODUCTION_SIGNALING_SERVER in config.js');
    console.warn('📖 See DEPLOYMENT.md for instructions on deploying the signaling server');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
};
