/**
 * React Native DOM Shims
 * 
 * This file provides minimal type declarations for web DOM APIs that are
 * referenced in components that support both web and mobile platforms.
 * 
 * WARNING: DO NOT use these types in native business logic.
 * They exist only to satisfy TypeScript in cross-platform code.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  const window: any;
  const document: any;
  
  interface Navigator {
    mediaDevices?: { 
      getUserMedia?: (...args: any[]) => Promise<any>;
    };
    userAgent?: string;
  }
  
  class MediaRecorder {
    constructor(stream?: any, options?: any);
    start(): void;
    stop(): void;
    addEventListener(type: string, listener: any): void;
    ondataavailable?: (ev: any) => void;
  }
  
  class MutationObserver {
    constructor(callback: any);
    observe(target: any, options?: any): void;
    disconnect(): void;
  }
  
  interface HTMLElement {
    style?: any;
  }
  
  interface KeyboardEvent {
    key?: string;
  }
}

export {};