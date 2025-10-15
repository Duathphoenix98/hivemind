# Hivemind - P2P WebGPU Neural Network Swarm

A distributed neural network inference platform that connects browsers in a peer-to-peer network to share GPU compute power.

## Features

- **P2P Architecture**: Direct browser-to-browser connections via WebRTC
- **WebGPU Acceleration**: GPU-accelerated neural network inference using WebGPU compute shaders
- **Distributed Computing**: Automatically distributes inference tasks across the swarm
- **Real-time Visualization**: Beautiful UI showing swarm status, connected peers, and performance metrics
- **Zero-config**: Simple setup with automatic peer discovery

## How It Works

1. Each browser instance acts as both a client and a compute node
2. WebRTC enables direct peer-to-peer connections between browsers
3. WebGPU compute shaders perform neural network inference on the GPU
4. Tasks are distributed across available peers for parallel processing
5. Results are aggregated and displayed in real-time

## Requirements

- Modern browser with WebGPU support (Chrome 113+, Edge 113+)
- Node.js 14+ (for signaling server)

## Installation

```bash
npm install
```

## Running the App

Start the server:

```bash
npm start
```

Then open http://localhost:3000 in multiple browser tabs or on different devices.

## Usage

1. Click "Join Swarm" to connect to the P2P network
2. Open the same URL in other tabs/devices to add more nodes
3. Click "Run Neural Network Inference" to distribute a demo task
4. Watch as tasks are computed across the swarm

## Architecture

### Frontend
- **app.js**: Main application controller
- **p2p-network.js**: WebRTC peer-to-peer networking
- **webgpu-compute.js**: WebGPU compute shader for neural network inference
- **index.html**: Beautiful, animated UI
- **style.css**: Modern gradient design with animations

### Backend
- **server.js**: WebSocket signaling server for peer discovery

## Technical Details

### Neural Network Inference
The demo implements a simple 2-layer feedforward neural network:
- Input layer: 10 features
- Hidden layer: 5 neurons (ReLU activation)
- Output layer: 3 classes (Softmax)

### WebGPU Compute Shaders
Matrix multiplication and activation functions run entirely on the GPU for maximum performance.

### P2P Communication
- Uses WebRTC data channels for low-latency task distribution
- Automatic reconnection handling
- STUN servers for NAT traversal

## Browser Compatibility

- Chrome/Edge 113+
- Experimental WebGPU flag may need to be enabled in some browsers

## License

MIT

## Future Enhancements

- Support for larger neural networks
- Model upload/download
- Persistent model storage
- Advanced task scheduling algorithms
- Support for training (not just inference)
- Mobile support
