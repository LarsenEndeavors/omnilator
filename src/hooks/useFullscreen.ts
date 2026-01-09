import { useState, useEffect, useCallback, type RefObject } from 'react';

interface UseFullscreenOptions {
  elementRef?: RefObject<HTMLElement | null>;
  onEnter?: () => void;
  onExit?: () => void;
  onError?: (error: Error) => void;
}

interface UseFullscreenResult {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
  isSupported: boolean;
}

/**
 * Custom hook for managing fullscreen mode using the Fullscreen API
 * 
 * Handles browser compatibility, state synchronization via fullscreenchange events,
 * and provides toggle/enter/exit functions.
 * 
 * @param options - Configuration options
 * @returns Fullscreen state and control functions
 * 
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen({
 *   elementRef: containerRef,
 *   onEnter: () => console.log('Entered fullscreen'),
 *   onExit: () => console.log('Exited fullscreen')
 * });
 * ```
 */
export function useFullscreen(options: UseFullscreenOptions = {}): UseFullscreenResult {
  const { elementRef, onEnter, onExit, onError } = options;
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check if Fullscreen API is supported
  const isSupported = !!(typeof document !== 'undefined' && 
    (document.fullscreenEnabled || 
     (document as Document & { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled || 
     (document as Document & { mozFullScreenEnabled?: boolean }).mozFullScreenEnabled));

  /**
   * Enter fullscreen mode for the specified element
   */
  const enterFullscreen = useCallback(async () => {
    if (!isSupported) {
      const error = new Error('Fullscreen API is not supported in this browser');
      onError?.(error);
      return;
    }

    try {
      // Use the provided element ref, or fall back to canvas container
      const element = elementRef?.current;
      if (!element) {
        const error = new Error('No element available for fullscreen');
        onError?.(error);
        return;
      }

      // Request fullscreen with browser-specific methods
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        await (element as HTMLElement & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
      } else if ((element as HTMLElement & { mozRequestFullScreen?: () => Promise<void> }).mozRequestFullScreen) {
        await (element as HTMLElement & { mozRequestFullScreen: () => Promise<void> }).mozRequestFullScreen();
      } else if ((element as HTMLElement & { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen) {
        await (element as HTMLElement & { msRequestFullscreen: () => Promise<void> }).msRequestFullscreen();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to enter fullscreen');
      onError?.(error);
      console.error('[useFullscreen] Error entering fullscreen:', error);
    }
  }, [isSupported, elementRef, onError]);

  /**
   * Exit fullscreen mode
   */
  const exitFullscreen = useCallback(async () => {
    if (!isSupported) {
      return;
    }

    try {
      // Exit fullscreen with browser-specific methods
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
        await (document as Document & { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
      } else if ((document as Document & { mozCancelFullScreen?: () => Promise<void> }).mozCancelFullScreen) {
        await (document as Document & { mozCancelFullScreen: () => Promise<void> }).mozCancelFullScreen();
      } else if ((document as Document & { msExitFullscreen?: () => Promise<void> }).msExitFullscreen) {
        await (document as Document & { msExitFullscreen: () => Promise<void> }).msExitFullscreen();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to exit fullscreen');
      onError?.(error);
      console.error('[useFullscreen] Error exiting fullscreen:', error);
    }
  }, [isSupported, onError]);

  /**
   * Toggle fullscreen mode
   */
  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  /**
   * Listen to fullscreenchange events to sync state
   */
  useEffect(() => {
    if (!isSupported) {
      return;
    }

    const handleFullscreenChange = () => {
      // Check if we're currently in fullscreen using browser-specific properties
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
        (document as Document & { mozFullScreenElement?: Element }).mozFullScreenElement ||
        (document as Document & { msFullscreenElement?: Element }).msFullscreenElement
      );

      setIsFullscreen(isCurrentlyFullscreen);

      // Call callbacks
      if (isCurrentlyFullscreen) {
        onEnter?.();
      } else {
        onExit?.();
      }
    };

    // Listen to all browser-specific fullscreenchange events
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Cleanup
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isSupported, onEnter, onExit]);

  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
    isSupported,
  };
}
