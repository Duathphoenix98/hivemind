// Netlify serverless function for WebSocket signaling
// Note: WebSockets are limited on Netlify. For production, consider using:
// - Netlify Edge Functions with Deno
// - External WebSocket service (Pusher, Ably, Socket.io hosted)
// - WebRTC mesh without signaling server

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // This is a simplified HTTP-based signaling endpoint
  // For full WebSocket support, you'll need a dedicated signaling server
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Signaling endpoint - use dedicated WebSocket server for production',
      recommendation: 'Deploy server.js to Heroku/Railway/Render for WebSocket support'
    })
  };
};
