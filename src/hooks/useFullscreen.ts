import { useCallback, useEffect, useState } from 'react';

interface UseFullscreenOptions {
  elementRef: React.RefObject<HTMLElement | null>;
  onEnter?: () => void;
  onExit?: () => void;
}

interface UseFullscreenResult {
  isFullscreen: boolean;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
  toggleFullscreen: () => Promise<void>;
}

/**
 * Custom hook for managing fullscreen mode
 * 
 * This hook handles entering/exiting fullscreen without modifying the canvas
 * element's width and height attributes. The CSS handles visual scaling.
 */
export function useFullscreen({
  elementRef,
  onEnter,
  onExit,
}: UseFullscreenOptions): UseFullscreenResult {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = useCallback(async () => {
    if (!elementRef.current || isFullscreen) return;

    try {
      // Request fullscreen on the container element
      await elementRef.current.requestFullscreen();
      
      setIsFullscreen(true);
      onEnter?.();
      
      console.log('[useFullscreen] Entered fullscreen mode');
    } catch (error) {
      console.error('[useFullscreen] Failed to enter fullscreen:', error);
    }
  }, [elementRef, isFullscreen, onEnter]);

  const exitFullscreen = useCallback(async () => {
    if (!document.fullscreenElement || !isFullscreen) return;

    try {
      await document.exitFullscreen();
      
      setIsFullscreen(false);
      onExit?.();
      
      console.log('[useFullscreen] Exited fullscreen mode');
    } catch (error) {
      console.error('[useFullscreen] Failed to exit fullscreen:', error);
    }
  }, [isFullscreen, onExit]);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Listen for fullscreen changes (e.g., user presses ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      
      if (!isNowFullscreen && isFullscreen) {
        // User exited fullscreen (e.g., pressed ESC)
        setIsFullscreen(false);
        onExit?.();
        console.log('[useFullscreen] Fullscreen exited via browser control');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen, onExit]);

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}
