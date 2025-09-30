/**
<<<<<<< HEAD
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
=======
 * DeviceEventEmitter stub for React Native web builds
 * This provides a minimal EventEmitter implementation for web
 */

class DeviceEventEmitter {
  constructor() {
    this.listeners = {};
  }

  addListener(eventType, listener, context) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    
    this.listeners[eventType].push(listener);
    
    // Return subscription object
    return {
      remove: () => this.removeListener(eventType, listener),
    };
  }

  removeListener(eventType, listener) {
    if (!this.listeners[eventType]) return;
    
    this.listeners[eventType] = this.listeners[eventType].filter(
      (l) => l !== listener
    );
  }

  removeAllListeners(eventType) {
    if (eventType) {
      delete this.listeners[eventType];
    } else {
      this.listeners = {};
    }
  }

  emit(eventType, ...args) {
    if (!this.listeners[eventType]) return;
    
    this.listeners[eventType].forEach((listener) => {
      try {
        listener(...args);
      } catch (error) {
        console.error('[DeviceEventEmitter] Error in listener:', error);
>>>>>>> 9714ed31cc299dd708052e7917a4b7b8cd2faa9a
      }
    });
  }

<<<<<<< HEAD
  listenerCount(eventName) {
    return (this.listeners.get(eventName) || []).length;
  }
}

// Export singleton instance
const deviceEventEmitter = new DeviceEventEmitterStub();

export default deviceEventEmitter;
=======
  listenerCount(eventType) {
    return this.listeners[eventType]?.length || 0;
  }
}

// Create singleton instance
const instance = new DeviceEventEmitter();

// CommonJS export
module.exports = instance;

// ES6 default export
module.exports.default = instance;
>>>>>>> 9714ed31cc299dd708052e7917a4b7b8cd2faa9a
