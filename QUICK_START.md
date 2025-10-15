# Quick Start - Deploying Hivemind to Netlify

## The Problem
Netlify doesn't support WebSocket connections, which are needed for the P2P signaling server. You need to deploy the signaling server separately.

## Solution: Deploy in 2 Steps

### Step 1: Deploy Signaling Server (Free!)

Choose one of these free options:

#### Option A: Railway (Recommended - 500 hours/month free)

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login and deploy:
   ```bash
   railway login
   railway init
   railway up
   ```

3. Railway will give you a URL like: `https://hivemind-signaling.railway.app`

4. Get your WebSocket URL:
   - Change `https://` to `wss://`
   - Example: `wss://hivemind-signaling.railway.app`

#### Option B: Render (Free tier, 750 hours/month)

1. Go to [Render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   - **Name**: hivemind-signaling
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Click "Create Web Service"
6. Copy your URL (e.g., `https://hivemind-signaling.onrender.com`)
7. Convert to WebSocket: `wss://hivemind-signaling.onrender.com`

#### Option C: Heroku (Paid, but cheap)

1. Install Heroku CLI and login
2. Deploy:
   ```bash
   heroku create hivemind-signaling
   git push heroku master
   ```
3. Get your WebSocket URL: `wss://hivemind-signaling.herokuapp.com`

### Step 2: Configure Netlify Frontend

After deploying your signaling server:

#### Method 1: Update config.js (Easy)

1. Open `public/config.js`
2. Update line 6:
   ```javascript
   PRODUCTION_SIGNALING_SERVER: 'wss://your-signaling-server.railway.app',
   ```
3. Commit and push:
   ```bash
   git add public/config.js
   git commit -m "Configure production signaling server"
   git push
   ```

#### Method 2: Use Netlify Environment Variable

1. Go to Netlify dashboard
2. Site settings → Environment variables
3. Add variable:
   - **Key**: `SIGNALING_SERVER`
   - **Value**: `wss://your-signaling-server.railway.app`
4. Redeploy your site

### Step 3: Deploy to Netlify

1. Go to [Netlify](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub
4. Select your `hivemind` repository
5. Netlify auto-detects settings from `netlify.toml`
6. Click "Deploy site"

Done! Your site is now live with full P2P functionality! 🎉

## Testing Your Deployment

1. Open your Netlify URL (e.g., `https://your-site.netlify.app`)
2. Click "Join Swarm"
3. You should see "Successfully joined the swarm"
4. Open the same URL in another tab/device
5. Both tabs should connect as peers!

## Troubleshooting

### Error: "Failed to connect: undefined"
- Your signaling server isn't configured or isn't running
- Check that you updated `PRODUCTION_SIGNALING_SERVER` in config.js
- Verify your signaling server is running (visit the HTTPS URL in your browser)

### Error: "WebSocket connection failed"
- Make sure you're using `wss://` (not `https://`)
- Check that your signaling server supports WebSocket upgrades
- Verify CORS is not blocking the connection

### Peers not connecting
- Make sure both tabs/devices can reach the signaling server
- Check browser console for WebRTC errors
- Ensure both peers are using the same signaling server URL

## Cost Breakdown

- **Netlify Frontend**: Free (100GB bandwidth)
- **Railway Signaling**: Free (500 hours/month)
- **Render Signaling**: Free (750 hours/month)

Total: **$0/month** for moderate usage!

## Alternative: Full Stack Deploy

If you prefer a single deployment:

Deploy everything to Railway/Render instead of Netlify:
- No separate configuration needed
- WebSocket works out of the box
- Slightly more expensive at scale

See [DEPLOYMENT.md](./DEPLOYMENT.md) for details.
