import { useEffect, useRef, useState, useCallback } from 'react';
import type { IEmulatorCore } from '../core/IEmulatorCore';

interface UseEmulatorOptions {
  core: IEmulatorCore;
  targetFPS?: number;
  onFrameRendered?: (frameTime: number) => void;
}

interface UseEmulatorResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isRunning: boolean;
  fps: number;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

/**
 * Custom hook for managing emulator lifecycle and rendering loop
 */
export function useEmulator({
  core,
  targetFPS = 60,
  onFrameRendered,
}: UseEmulatorOptions): UseEmulatorResult {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [fps, setFps] = useState(0);
  
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastFrameTimeRef = useRef<number>(0);
  const fpsCounterRef = useRef({ frames: 0, lastTime: 0 });
  const renderFrameRef = useRef<((time: number) => Promise<void>) | null>(null);

  const frameInterval = 1000 / targetFPS;

  const renderFrame = useCallback(async (currentTime: number) => {
    if (!canvasRef.current) return;

    // Frame rate limiting
    const elapsed = currentTime - lastFrameTimeRef.current;
    if (elapsed < frameInterval) {
      animationFrameRef.current = requestAnimationFrame((time) => renderFrameRef.current?.(time));
      return;
    }

    lastFrameTimeRef.current = currentTime - (elapsed % frameInterval);

    try {
      // Run emulator frame
      await core.runFrame();

      // Get frame buffer and render to canvas
      const imageData = core.getBuffer();
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.putImageData(imageData, 0, 0);
      }

      // Update FPS counter
      fpsCounterRef.current.frames++;
      if (currentTime - fpsCounterRef.current.lastTime >= 1000) {
        const newFps = fpsCounterRef.current.frames;
        setFps(newFps);
        
        // DIAGNOSTIC: Log FPS
        console.log(`[useEmulator] FPS: ${newFps} (target: 60)`);
        
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.lastTime = currentTime;
      }

      // Call frame rendered callback
      onFrameRendered?.(elapsed);

      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame((time) => renderFrameRef.current?.(time));
    } catch (error) {
      console.error('Error rendering frame:', error);
      setIsRunning(false);
    }
  }, [core, frameInterval, onFrameRendered]);

  useEffect(() => {
    renderFrameRef.current = renderFrame;
  }, [renderFrame]);

  const start = useCallback(() => {
    if (!isRunning && renderFrameRef.current) {
      setIsRunning(true);
      lastFrameTimeRef.current = performance.now();
      fpsCounterRef.current = { frames: 0, lastTime: performance.now() };
      animationFrameRef.current = requestAnimationFrame((time) => renderFrameRef.current?.(time));
    }
  }, [isRunning]);

  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    setIsRunning(false);
    setFps(0);
  }, []);

  const toggle = useCallback(() => {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  }, [isRunning, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    canvasRef,
    isRunning,
    fps,
    start,
    stop,
    toggle,
  };
}
