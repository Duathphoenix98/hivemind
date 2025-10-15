class P2PNetwork {
  constructor() {
    this.peerId = this.generatePeerId();
    this.peers = new Map(); // peerId -> RTCPeerConnection
    this.dataChannels = new Map(); // peerId -> RTCDataChannel
    this.ws = null;
    this.onPeerConnected = null;
    this.onPeerDisconnected = null;
    this.onTaskReceived = null;
    this.onResultReceived = null;
    this.pendingTasks = new Map(); // taskId -> callback

    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ];
  }

  generatePeerId() {
    return 'peer-' + Math.random().toString(36).substr(2, 9);
  }

  async connect() {
    return new Promise((resolve, reject) => {
      // Use config to get signaling server URL
      const wsUrl = window.CONFIG ? CONFIG.getSignalingUrl() :
        `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.ws.send(JSON.stringify({
          type: 'register',
          peerId: this.peerId
        }));

        // Start client-side heartbeat
        this.startHeartbeat();

        resolve();
      };

      this.ws.onerror = (error) => {
        reject(error);
      };

      this.ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        await this.handleSignalingMessage(data);
      };
    });
  }

  startHeartbeat() {
    // Send ping every 25 seconds to keep connection alive
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  async handleSignalingMessage(data) {
    switch (data.type) {
      case 'peers':
        // Connect to all existing peers
        for (const peerId of data.peers) {
          await this.connectToPeer(peerId, true);
        }
        break;

      case 'peer-joined':
        // New peer joined, wait for them to initiate connection
        console.log(`New peer joined: ${data.peerId}`);
        break;

      case 'peer-left':
        this.handlePeerDisconnected(data.peerId);
        break;

      case 'signal':
        await this.handleSignal(data.fromPeerId, data.signal);
        break;
    }
  }

  async connectToPeer(peerId, initiator = false) {
    if (this.peers.has(peerId)) {
      return; // Already connected
    }

    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    this.peers.set(peerId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(peerId, {
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.handlePeerDisconnected(peerId);
      }
    };

    if (initiator) {
      const dataChannel = pc.createDataChannel('tasks');
      this.setupDataChannel(peerId, dataChannel);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.sendSignal(peerId, {
        type: 'offer',
        offer: offer
      });
    } else {
      pc.ondatachannel = (event) => {
        this.setupDataChannel(peerId, event.channel);
      };
    }
  }

  setupDataChannel(peerId, channel) {
    this.dataChannels.set(peerId, channel);

    channel.onopen = () => {
      console.log(`Data channel opened with ${peerId}`);
      if (this.onPeerConnected) {
        this.onPeerConnected(peerId);
      }
    };

    channel.onclose = () => {
      console.log(`Data channel closed with ${peerId}`);
      this.handlePeerDisconnected(peerId);
    };

    channel.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handlePeerMessage(peerId, message);
    };
  }

  handlePeerMessage(peerId, message) {
    switch (message.type) {
      case 'task':
        if (this.onTaskReceived) {
          this.onTaskReceived(peerId, message.taskId, message.data);
        }
        break;

      case 'result':
        const callback = this.pendingTasks.get(message.taskId);
        if (callback) {
          callback(message.result);
          this.pendingTasks.delete(message.taskId);
        }
        if (this.onResultReceived) {
          this.onResultReceived(peerId, message.taskId, message.result);
        }
        break;
    }
  }

  async handleSignal(fromPeerId, signal) {
    let pc = this.peers.get(fromPeerId);

    if (!pc) {
      await this.connectToPeer(fromPeerId, false);
      pc = this.peers.get(fromPeerId);
    }

    switch (signal.type) {
      case 'offer':
        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignal(fromPeerId, {
          type: 'answer',
          answer: answer
        });
        break;

      case 'answer':
        await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
        break;

      case 'ice-candidate':
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        break;
    }
  }

  sendSignal(targetPeerId, signal) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'signal',
        targetPeerId: targetPeerId,
        signal: signal
      }));
    }
  }

  sendTaskToPeer(peerId, taskId, data) {
    const channel = this.dataChannels.get(peerId);
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify({
        type: 'task',
        taskId: taskId,
        data: data
      }));
      return true;
    }
    return false;
  }

  sendResultToPeer(peerId, taskId, result) {
    const channel = this.dataChannels.get(peerId);
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify({
        type: 'result',
        taskId: taskId,
        result: result
      }));
      return true;
    }
    return false;
  }

  async distributeTask(data) {
    const connectedPeers = Array.from(this.dataChannels.entries())
      .filter(([_, channel]) => channel.readyState === 'open')
      .map(([peerId, _]) => peerId);

    if (connectedPeers.length === 0) {
      return null;
    }

    const taskId = 'task-' + Math.random().toString(36).substr(2, 9);
    const targetPeer = connectedPeers[Math.floor(Math.random() * connectedPeers.length)];

    return new Promise((resolve) => {
      this.pendingTasks.set(taskId, resolve);

      if (!this.sendTaskToPeer(targetPeer, taskId, data)) {
        this.pendingTasks.delete(taskId);
        resolve(null);
      }

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingTasks.has(taskId)) {
          this.pendingTasks.delete(taskId);
          resolve(null);
        }
      }, 10000);
    });
  }

  handlePeerDisconnected(peerId) {
    this.peers.delete(peerId);
    this.dataChannels.delete(peerId);

    if (this.onPeerDisconnected) {
      this.onPeerDisconnected(peerId);
    }
  }

  disconnect() {
    // Stop heartbeat
    this.stopHeartbeat();

    // Close all peer connections
    this.peers.forEach(pc => pc.close());
    this.peers.clear();
    this.dataChannels.clear();

    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getConnectedPeers() {
    return Array.from(this.dataChannels.entries())
      .filter(([_, channel]) => channel.readyState === 'open')
      .map(([peerId, _]) => peerId);
  }
}
