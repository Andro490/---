import { useEffect, useCallback } from 'react';

export const useVideoProtection = () => {
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Block DevTools shortcuts: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
      (e.ctrlKey && e.key === 'U') ||
      (e.metaKey && e.altKey && (e.key === 'i' || e.key === 'j')) || // Mac Safari/Chrome
      (e.metaKey && e.key === 'u') // Mac view source
    ) {
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    // Override getDisplayMedia to silently block in-browser screen sharing
    const originalGetDisplayMedia = navigator.mediaDevices?.getDisplayMedia;
    
    // Fix TS2774: Check if it's explicitly a function before overriding
    if (navigator.mediaDevices && typeof originalGetDisplayMedia === 'function') {
      navigator.mediaDevices.getDisplayMedia = async function () {
        return Promise.reject(new Error('Screen sharing is disabled for security reasons.'));
      };
    }

    // Block right click to prevent easy downloading
    document.addEventListener('contextmenu', handleContextMenu);
    
    // Block DevTools keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      // Restore original function on cleanup
      if (navigator.mediaDevices && typeof originalGetDisplayMedia === 'function') {
        navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
      }
      
      // Cleanup listeners
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleContextMenu, handleKeyDown]);

  // Return false always to completely disable the black screen feature.
  // The site will now rely entirely on the DynamicWatermark component.
  return { isProtected: false, warningMsg: '' };
};
