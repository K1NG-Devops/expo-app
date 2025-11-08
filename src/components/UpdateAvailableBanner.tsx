'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

/**
 * Update Available Banner
 * Shows a banner at the top of the page when a new version is deployed
 */
export function UpdateAvailableBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Listen for the 'updatefound' event from service worker
    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;

        // Check if there's an update waiting
        if (registration.waiting) {
          setShowBanner(true);
        }

        // Listen for new service worker installing
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is ready
                setShowBanner(true);
              }
            });
          }
        });

        // Also listen for messages from the service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
            setShowBanner(true);
          }
        });
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    };

    // Check immediately
    checkForUpdates();

    // Also check periodically (every 5 minutes)
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdate = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (registration.waiting) {
        // Tell the waiting service worker to skip waiting and become active
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Reload the page after a short delay
        setTimeout(() => {
          window.location.reload();
        }, 100);
      } else {
        // Just reload the page
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating:', error);
      // Fallback: just reload
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    
    // Remember dismissal for this session
    try {
      sessionStorage.setItem('updateBannerDismissed', 'true');
    } catch (e) {
      // Ignore storage errors
    }
  };

  // Don't show if dismissed or not ready
  if (!showBanner || dismissed) {
    return null;
  }

  // Check if already dismissed in this session
  if (typeof window !== 'undefined') {
    try {
      if (sessionStorage.getItem('updateBannerDismissed') === 'true') {
        return null;
      }
    } catch (e) {
      // Ignore storage errors
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'linear-gradient(135deg, #00f5ff 0%, #0080ff 100%)',
        color: '#0a0a0f',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        boxShadow: '0 4px 12px rgba(0, 245, 255, 0.3)',
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <RefreshCw size={20} style={{ flexShrink: 0 }} />
      
      <div style={{ flex: 1, maxWidth: 600, textAlign: 'center' }}>
        <strong style={{ fontWeight: 700 }}>New Update Available!</strong>
        <span style={{ marginLeft: 8, opacity: 0.9 }}>
          A new version of EduDash Pro is ready.
        </span>
      </div>

      <button
        onClick={handleUpdate}
        style={{
          padding: '8px 20px',
          background: '#0a0a0f',
          color: '#00f5ff',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        Update Now
      </button>

      <button
        onClick={handleDismiss}
        style={{
          padding: 8,
          background: 'transparent',
          color: '#0a0a0f',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          opacity: 0.7,
          flexShrink: 0,
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.7';
        }}
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>

      <style jsx>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
