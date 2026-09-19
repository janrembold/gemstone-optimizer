import { optimize } from './optimizer.js';
let paused = false,
  cancelled = false,
  running = false,
  lastMessage = 0;
const yieldThread = () => new Promise((resolve) => setTimeout(resolve, 0));
self.onmessage = async ({ data }) => {
  if (data.type === 'pause') {
    paused = true;
    return;
  }
  if (data.type === 'resume') {
    paused = false;
    return;
  }
  if (data.type === 'cancel') {
    cancelled = true;
    return;
  }
  if (data.type !== 'start' || running) return;
  running = true;
  paused = false;
  cancelled = false;
  try {
    const result = await optimize(data.config, {
      checkpoint: async () => {
        await yieldThread();
        while (paused && !cancelled) await new Promise((resolve) => setTimeout(resolve, 50));
        if (cancelled) throw new Error('Cancelled');
      },
      progress: (p) => {
        if (p.force || performance.now() - lastMessage > 150) {
          self.postMessage({ type: 'progress', data: p });
          lastMessage = performance.now();
        }
      },
    });
    self.postMessage({ type: 'done', data: result });
  } catch (error) {
    self.postMessage({ type: cancelled ? 'cancelled' : 'error', message: error.message });
  } finally {
    running = false;
  }
};
