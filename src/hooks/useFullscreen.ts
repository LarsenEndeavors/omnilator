import { useCallback, useRef, useEffect, useState } from 'react';

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
 * Custom hook for managing fullscreen mode with canvas dimension preservation
 * 
 * This hook ensures that entering/exiting fullscreen only changes the visual
 * display size via CSS, without modifying the canvas element's actual width
 * and height attributes (which define rendering resolution).
 */
export function useFullscreen({
  elementRef,
  onEnter,
  onExit,
}: UseFullscreenOptions): UseFullscreenResult {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Store original canvas dimensions before entering fullscreen
  const originalDimensionsRef = useRef<{
    width: string | null;
    height: string | null;
  } | null>(null);

  const saveCanvasDimensions = useCallback(() => {
    if (!elementRef.current) return;
    
    // Find the canvas element (RetroArch canvas)
    const canvas = elementRef.current.querySelector('canvas');
    if (!canvas) return;
    
    // Save the actual canvas attributes (rendering resolution)
    originalDimensionsRef.current = {
      width: canvas.getAttribute('width'),
      height: canvas.getAttribute('height'),
    };
    
    console.log('[useFullscreen] Saved canvas dimensions:', originalDimensionsRef.current);
  }, [elementRef]);

  const restoreCanvasDimensions = useCallback(() => {
    if (!elementRef.current || !originalDimensionsRef.current) return;
    
    // Find the canvas element
    const canvas = elementRef.current.querySelector('canvas');
    if (!canvas) return;
    
    // Restore the original canvas attributes (rendering resolution)
    const { width, height } = originalDimensionsRef.current;
    if (width) canvas.setAttribute('width', width);
    if (height) canvas.setAttribute('height', height);
    
    console.log('[useFullscreen] Restored canvas dimensions:', originalDimensionsRef.current);
  }, [elementRef]);

  const enterFullscreen = useCallback(async () => {
    if (!elementRef.current || isFullscreen) return;

    try {
      // Save canvas dimensions before entering fullscreen
      saveCanvasDimensions();
      
      // Request fullscreen on the container element
      await elementRef.current.requestFullscreen();
      
      setIsFullscreen(true);
      onEnter?.();
      
      console.log('[useFullscreen] Entered fullscreen mode');
    } catch (error) {
      console.error('[useFullscreen] Failed to enter fullscreen:', error);
      // If fullscreen failed, we don't need to restore dimensions
      originalDimensionsRef.current = null;
    }
  }, [elementRef, isFullscreen, onEnter, saveCanvasDimensions]);

  const exitFullscreen = useCallback(async () => {
    if (!document.fullscreenElement || !isFullscreen) return;

    try {
      await document.exitFullscreen();
      
      // Restore canvas dimensions after exiting fullscreen
      restoreCanvasDimensions();
      
      setIsFullscreen(false);
      onExit?.();
      
      console.log('[useFullscreen] Exited fullscreen mode');
    } catch (error) {
      console.error('[useFullscreen] Failed to exit fullscreen:', error);
    }
  }, [isFullscreen, onExit, restoreCanvasDimensions]);

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
        restoreCanvasDimensions();
        setIsFullscreen(false);
        onExit?.();
        console.log('[useFullscreen] Fullscreen exited via browser control');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen, onExit, restoreCanvasDimensions]);

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}
