class WebGPUCompute {
  constructor() {
    this.device = null;
    this.adapter = null;
    this.isSupported = false;
  }

  async initialize() {
    if (!navigator.gpu) {
      console.error('WebGPU not supported');
      return false;
    }

    try {
      this.adapter = await navigator.gpu.requestAdapter();
      if (!this.adapter) {
        console.error('No GPU adapter found');
        return false;
      }

      this.device = await this.adapter.requestDevice();
      this.isSupported = true;
      console.log('WebGPU initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize WebGPU:', error);
      return false;
    }
  }

  // Simple neural network inference: Matrix multiplication (y = Wx + b)
  async runInference(input, weights, bias) {
    if (!this.device) {
      throw new Error('WebGPU not initialized');
    }

    const inputSize = input.length;
    const outputSize = weights.length / inputSize;

    // Create shader code for matrix multiplication
    const shaderCode = `
      struct Matrix {
        data: array<f32>
      }

      @group(0) @binding(0) var<storage, read> input: Matrix;
      @group(0) @binding(1) var<storage, read> weights: Matrix;
      @group(0) @binding(2) var<storage, read> bias: Matrix;
      @group(0) @binding(3) var<storage, read_write> output: Matrix;

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let idx = global_id.x;
        if (idx >= ${outputSize}u) {
          return;
        }

        var sum: f32 = 0.0;
        for (var i = 0u; i < ${inputSize}u; i = i + 1u) {
          sum = sum + input.data[i] * weights.data[idx * ${inputSize}u + i];
        }

        // Add bias and apply ReLU activation
        output.data[idx] = max(sum + bias.data[idx], 0.0);
      }
    `;

    // Create buffers
    const inputBuffer = this.createBuffer(new Float32Array(input), GPUBufferUsage.STORAGE);
    const weightsBuffer = this.createBuffer(new Float32Array(weights), GPUBufferUsage.STORAGE);
    const biasBuffer = this.createBuffer(new Float32Array(bias), GPUBufferUsage.STORAGE);
    const outputBuffer = this.createBuffer(
      new Float32Array(outputSize),
      GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    );

    // Create compute pipeline
    const shaderModule = this.device.createShaderModule({ code: shaderCode });

    const pipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'main'
      }
    });

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: weightsBuffer } },
        { binding: 2, resource: { buffer: biasBuffer } },
        { binding: 3, resource: { buffer: outputBuffer } }
      ]
    });

    // Execute compute shader
    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(outputSize / 64));
    passEncoder.end();

    // Read results
    const readBuffer = this.device.createBuffer({
      size: outputSize * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    commandEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, outputSize * 4);
    this.device.queue.submit([commandEncoder.finish()]);

    await readBuffer.mapAsync(GPUMapMode.READ);
    const result = new Float32Array(readBuffer.getMappedRange());
    const output = Array.from(result);

    readBuffer.unmap();

    // Cleanup
    inputBuffer.destroy();
    weightsBuffer.destroy();
    biasBuffer.destroy();
    outputBuffer.destroy();
    readBuffer.destroy();

    return output;
  }

  createBuffer(data, usage) {
    const buffer = this.device.createBuffer({
      size: data.byteLength,
      usage: usage,
      mappedAtCreation: true
    });

    if (data instanceof Float32Array) {
      new Float32Array(buffer.getMappedRange()).set(data);
    } else {
      new Uint32Array(buffer.getMappedRange()).set(data);
    }

    buffer.unmap();
    return buffer;
  }

  // Simple demo: classify a random input vector
  async runDemoInference() {
    // Create a simple 2-layer neural network demo
    // Input: 10 features -> Hidden: 5 neurons -> Output: 3 classes

    const input = Array.from({ length: 10 }, () => Math.random());

    // Layer 1: 10 -> 5
    const weights1 = Array.from({ length: 50 }, () => Math.random() * 0.5 - 0.25);
    const bias1 = Array.from({ length: 5 }, () => Math.random() * 0.1);

    const hidden = await this.runInference(input, weights1, bias1);

    // Layer 2: 5 -> 3
    const weights2 = Array.from({ length: 15 }, () => Math.random() * 0.5 - 0.25);
    const bias2 = Array.from({ length: 3 }, () => Math.random() * 0.1);

    const output = await this.runInference(hidden, weights2, bias2);

    // Softmax for probabilities
    const expOutput = output.map(x => Math.exp(x));
    const sumExp = expOutput.reduce((a, b) => a + b, 0);
    const probabilities = expOutput.map(x => x / sumExp);

    return {
      input: input,
      output: probabilities,
      prediction: probabilities.indexOf(Math.max(...probabilities))
    };
  }

  // Process task received from peer
  async processTask(taskData) {
    try {
      const { input, weights, bias } = taskData;
      const result = await this.runInference(input, weights, bias);
      return { success: true, result };
    } catch (error) {
      console.error('Error processing task:', error);
      return { success: false, error: error.message };
    }
  }

  destroy() {
    if (this.device) {
      this.device.destroy();
    }
  }
}
