# Deployment Guide

## Netlify Deployment (Static Frontend)

### Quick Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Duathphoenix98/hivemind)

### Manual Deployment

1. **Connect to Netlify**
   - Go to [Netlify](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository
   - Netlify will auto-detect settings from `netlify.toml`

2. **Configure Build Settings** (auto-detected)
   - Build command: (none needed)
   - Publish directory: `public`
   - Functions directory: `netlify/functions`

3. **Deploy**
   - Click "Deploy site"
   - Your site will be live in seconds!

### Important Note about WebSocket Signaling

Netlify doesn't support WebSocket connections. For full P2P functionality, you have three options:

#### Option 1: Use a Free WebSocket Service (Recommended for Demo)
Deploy the signaling server to a free service:

**Railway** (Free tier available):
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Render** (Free tier available):
1. Go to [Render](https://render.com)
2. Create new "Web Service"
3. Connect your GitHub repo
4. Set:
   - Build Command: `npm install`
   - Start Command: `node server.js`

**Heroku** (Free tier removed, but cheap):
```bash
heroku create your-hivemind-signaling
git push heroku master
```

Then update your Netlify environment:
- Go to Site settings → Environment variables
- Add: `SIGNALING_SERVER` = `wss://your-signaling-server.railway.app`

#### Option 2: Local Development
For local testing with full P2P:
```bash
npm start
# Open http://localhost:3000
```

#### Option 3: Serverless Alternative
Consider using a managed WebRTC service:
- [PeerJS](https://peerjs.com/) - Free hosted signaling
- [Ably](https://ably.com/) - Generous free tier
- [Pusher](https://pusher.com/) - Free for development

## Full Stack Deployment (Recommended)

Deploy both frontend and backend together:

### Railway (One-Click Deploy)
```bash
railway login
railway init
railway up
```

Railway will:
- Install dependencies
- Start the signaling server
- Serve static files
- Give you a public URL

### Render
1. Create a new "Web Service"
2. Connect GitHub repo
3. Settings:
   - Build: `npm install`
   - Start: `node server.js`
   - Port: Auto-detected
4. Deploy

### DigitalOcean App Platform
1. Click "Create App"
2. Connect GitHub
3. Select repository
4. Configure:
   - Type: Web Service
   - Build: `npm install`
   - Run: `node server.js`
5. Deploy

## Custom Domain Setup

### Netlify
1. Go to Domain settings
2. Add custom domain
3. Configure DNS (Netlify provides instructions)

### Other Platforms
Follow platform-specific DNS configuration guides.

## Environment Variables

If using a separate signaling server, set these environment variables:

**Netlify:**
```
SIGNALING_SERVER=wss://your-signaling-server.com
```

**Railway/Render/Heroku:**
```
PORT=3000 (auto-configured)
```

## Testing Your Deployment

1. Open your deployed URL
2. Check WebGPU status (green = working)
3. Open in multiple tabs
4. Click "Join Swarm" on all tabs
5. Verify peers connect
6. Run inference task

## Troubleshooting

### WebGPU Not Supported
- Use Chrome 113+ or Edge 113+
- Enable WebGPU flag: `chrome://flags/#enable-unsafe-webgpu`

### Peers Not Connecting
- Check signaling server is running
- Verify WebSocket URL in config.js
- Check browser console for errors
- Ensure HTTPS (required for WebRTC)

### HTTPS Required
Most hosting platforms provide HTTPS by default. If not:
- Use Let's Encrypt
- Configure SSL in platform settings

## Performance Tips

1. **Use a CDN**: Netlify includes CDN by default
2. **Enable Compression**: Included in netlify.toml
3. **Close Signaling Server**: Deploy near your users
4. **WebGPU Optimization**: Already optimized with compute shaders

## Cost Estimation

- **Netlify Frontend**: Free (100GB bandwidth)
- **Railway Backend**: Free tier (500 hours/month)
- **Render Backend**: Free tier (750 hours/month)
- **Total**: $0/month for moderate usage

## Monitoring

Add monitoring to track:
- Peer connection success rate
- Inference performance
- WebSocket uptime

Recommended services:
- Uptime Robot (free)
- Pingdom (free tier)
- Sentry (error tracking)
