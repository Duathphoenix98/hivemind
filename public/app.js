// Main application controller
class HivemindApp {
  constructor() {
    this.network = new P2PNetwork();
    this.compute = new WebGPUCompute();
    this.connected = false;
    this.tasksProcessed = 0;
    this.inferenceTime = [];

    this.initializeUI();
    this.checkWebGPU();
  }

  async checkWebGPU() {
    const statusEl = document.getElementById('webgpu-status');
    const success = await this.compute.initialize();

    if (success) {
      statusEl.textContent = 'Ready';
      statusEl.className = 'status-value status-ready';
      this.log('WebGPU initialized successfully', 'success');
    } else {
      statusEl.textContent = 'Not Supported';
      statusEl.className = 'status-value status-error';
      this.log('WebGPU not supported on this device', 'error');
    }
  }

  initializeUI() {
    document.getElementById('peer-id').textContent = this.network.peerId;

    document.getElementById('connect-btn').addEventListener('click', () => {
      this.connectToSwarm();
    });

    document.getElementById('disconnect-btn').addEventListener('click', () => {
      this.disconnectFromSwarm();
    });

    document.getElementById('run-task-btn').addEventListener('click', () => {
      this.runDemoTask();
    });

    // Set up network callbacks
    this.network.onPeerConnected = (peerId) => {
      this.handlePeerConnected(peerId);
    };

    this.network.onPeerDisconnected = (peerId) => {
      this.handlePeerDisconnected(peerId);
    };

    this.network.onTaskReceived = async (peerId, taskId, data) => {
      await this.handleTaskReceived(peerId, taskId, data);
    };

    this.network.onResultReceived = (peerId, taskId, result) => {
      this.handleResultReceived(peerId, taskId, result);
    };
  }

  async connectToSwarm() {
    try {
      this.log('Connecting to DePIN network...', 'info');
      document.getElementById('connect-btn').disabled = true;

      await this.network.connect();

      this.connected = true;
      document.getElementById('disconnect-btn').disabled = false;
      document.getElementById('run-task-btn').disabled = false;
      document.getElementById('compute-status').textContent = 'Online';

      this.log('Successfully joined the network', 'success');
    } catch (error) {
      this.log(`Failed to connect: ${error.message}`, 'error');
      document.getElementById('connect-btn').disabled = false;
    }
  }

  disconnectFromSwarm() {
    this.network.disconnect();
    this.connected = false;

    document.getElementById('connect-btn').disabled = false;
    document.getElementById('disconnect-btn').disabled = true;
    document.getElementById('run-task-btn').disabled = true;
    document.getElementById('compute-status').textContent = 'Offline';

    this.updatePeersList();
    this.log('Disconnected from network', 'info');
  }

  handlePeerConnected(peerId) {
    this.log(`Node connected: ${peerId}`, 'success');
    this.updatePeersList();
  }

  handlePeerDisconnected(peerId) {
    this.log(`Node disconnected: ${peerId}`, 'warning');
    this.updatePeersList();
  }

  async handleTaskReceived(fromPeerId, taskId, data) {
    this.log(`Received task ${taskId} from ${fromPeerId}`, 'info');
    document.getElementById('compute-status').textContent = 'Computing...';

    const startTime = performance.now();
    const result = await this.compute.processTask(data);
    const endTime = performance.now();

    const inferenceTime = endTime - startTime;
    this.inferenceTime.push(inferenceTime);

    this.network.sendResultToPeer(fromPeerId, taskId, result);

    this.tasksProcessed++;
    document.getElementById('tasks-processed').textContent = this.tasksProcessed;
    document.getElementById('compute-status').textContent = 'Online';

    this.updateStats();
    this.log(`Completed task ${taskId} in ${inferenceTime.toFixed(2)}ms`, 'success');
  }

  handleResultReceived(fromPeerId, taskId, result) {
    this.log(`Received result for task ${taskId} from ${fromPeerId}`, 'success');

    if (result.success) {
      console.log('Task result:', result.result);
    } else {
      console.error('Task failed:', result.error);
    }
  }

  async runDemoTask() {
    if (!this.connected) {
      this.log('Not connected to network', 'error');
      return;
    }

    const connectedPeers = this.network.getConnectedPeers();

    if (connectedPeers.length === 0) {
      // No peers, run locally
      this.log('No network nodes available, running inference locally...', 'info');
      document.getElementById('compute-status').textContent = 'Computing...';

      const startTime = performance.now();
      const result = await this.compute.runDemoInference();
      const endTime = performance.now();

      const inferenceTime = endTime - startTime;
      this.inferenceTime.push(inferenceTime);

      this.tasksProcessed++;
      document.getElementById('tasks-processed').textContent = this.tasksProcessed;
      document.getElementById('compute-status').textContent = 'Online';

      this.updateStats();

      this.log(`Local inference completed in ${inferenceTime.toFixed(2)}ms`, 'success');
      this.log(`Prediction: Class ${result.prediction} (confidence: ${(result.output[result.prediction] * 100).toFixed(1)}%)`, 'info');
    } else {
      // Distribute to peers
      this.log(`Distributing task to ${connectedPeers.length} network node(s)...`, 'info');

      // Create task data
      const input = Array.from({ length: 10 }, () => Math.random());
      const weights = Array.from({ length: 15 }, () => Math.random() * 0.5 - 0.25);
      const bias = Array.from({ length: 3 }, () => Math.random() * 0.1);

      const startTime = performance.now();
      const result = await this.network.distributeTask({ input, weights, bias });
      const endTime = performance.now();

      if (result) {
        const inferenceTime = endTime - startTime;
        this.log(`Distributed inference completed in ${inferenceTime.toFixed(2)}ms`, 'success');
        console.log('Result:', result);
      } else {
        this.log('Failed to distribute task', 'error');
      }
    }
  }

  updatePeersList() {
    const peersListEl = document.getElementById('peers-list');
    const connectedPeers = this.network.getConnectedPeers();

    document.getElementById('peer-count').textContent = connectedPeers.length;

    if (connectedPeers.length === 0) {
      peersListEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>No nodes connected</p>
          <p class="empty-hint">Waiting for nodes to join...</p>
        </div>
      `;
    } else {
      peersListEl.innerHTML = connectedPeers.map(peerId => `
        <div class="peer-item">
          <div class="peer-info">
            <div class="peer-id">${peerId}</div>
            <div class="peer-details">WebGPU Node</div>
          </div>
          <div class="peer-status connected">
            <span class="status-dot"></span>
            <span>Connected</span>
          </div>
        </div>
      `).join('');
    }
  }

  updateStats() {
    if (this.inferenceTime.length > 0) {
      const avgTime = this.inferenceTime.reduce((a, b) => a + b, 0) / this.inferenceTime.length;
      document.getElementById('avg-inference-time').textContent = `${avgTime.toFixed(2)}ms`;

      const throughput = (1000 / avgTime).toFixed(2);
      document.getElementById('total-throughput').textContent = `${throughput} tasks/sec`;

      const gpuUtil = Math.min(100, (avgTime / 100) * 100);
      document.getElementById('gpu-utilization').textContent = `${gpuUtil.toFixed(0)}%`;

      const connectedPeers = this.network.getConnectedPeers().length;
      const efficiency = connectedPeers > 0 ? ((connectedPeers + 1) / (connectedPeers + 1) * 100) : 100;
      document.getElementById('swarm-efficiency').textContent = `${efficiency.toFixed(0)}%`;
    }
  }

  log(message, type = 'info') {
    const logEl = document.getElementById('log');
    const timestamp = new Date().toLocaleTimeString();

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `
      <span class="log-time">${timestamp}</span>
      <span class="log-message">${message}</span>
    `;

    logEl.insertBefore(entry, logEl.firstChild);

    // Keep only last 50 entries
    while (logEl.children.length > 50) {
      logEl.removeChild(logEl.lastChild);
    }
  }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.app = new HivemindApp();
});
