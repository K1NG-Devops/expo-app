/**
 * DeviceEventEmitter Stub for Web Platform
 * Provides a minimal implementation of React Native's DeviceEventEmitter for web compatibility
 */

class DeviceEventEmitterStub {
  constructor() {
    this.listeners = new Map();
  }

  addListener(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);

    // Return subscription object
    return {
      remove: () => {
        const callbacks = this.listeners.get(eventName) || [];
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  removeListener(eventName, callback) {
    const callbacks = this.listeners.get(eventName) || [];
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  removeAllListeners(eventName) {
    if (eventName) {
      this.listeners.delete(eventName);
    } else {
      this.listeners.clear();
    }
  }

  emit(eventName, ...args) {
    const callbacks = this.listeners.get(eventName) || [];
    callbacks.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.warn('[DeviceEventEmitter] Error in listener:', error);
      }
    });
  }

  listenerCount(eventName) {
    return (this.listeners.get(eventName) || []).length;
  }
}

// Export singleton instance
const deviceEventEmitter = new DeviceEventEmitterStub();

export default deviceEventEmitter;