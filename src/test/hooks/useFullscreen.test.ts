import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useRef } from 'react';

describe('useFullscreen', () => {
  let mockElement: HTMLDivElement;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create mock DOM elements
    mockCanvas = document.createElement('canvas');
    mockCanvas.setAttribute('width', '256');
    mockCanvas.setAttribute('height', '224');
    
    mockElement = document.createElement('div');
    mockElement.appendChild(mockCanvas);
    
    // Mock fullscreen API
    mockElement.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
    
    // Clear any fullscreen state
    Object.defineProperty(document, 'fullscreenElement', {
      writable: true,
      configurable: true,
      value: null,
    });
  });

  describe('initialization', () => {
    it('should initialize with isFullscreen false', () => {
      const { result } = renderHook(() => {
        const elementRef = useRef<HTMLDivElement>(mockElement);
        return useFullscreen({ elementRef });
      });

      expect(result.current.isFullscreen).toBe(false);
    });

    it('should provide all required functions', () => {
      const { result } = renderHook(() => {
        const elementRef = useRef<HTMLDivElement>(mockElement);
        return useFullscreen({ elementRef });
      });

      expect(typeof result.current.enterFullscreen).toBe('function');
      expect(typeof result.current.exitFullscreen).toBe('function');
      expect(typeof result.current.toggleFullscreen).toBe('function');
    });
  });

  describe('enterFullscreen', () => {
    it('should request fullscreen on the element', async () => {
      const { result } = renderHook(() => {
        const elementRef = useRef<HTMLDivElement>(mockElement);
        return useFullscreen({ elementRef });
      });

      await act(async () => {
        await result.current.enterFullscreen();
      });

      expect(mockElement.requestFullscreen).toHaveBeenCalledOnce();
    });

    it('should not modify canvas dimensions when entering fullscreen', async () => {
      const { result } = renderHook(() => {
        const elementRef = useRef<HTMLDivElement>(mockElement);
        return useFullscreen({ elementRef });
      });

      const originalWidth = mockCanvas.getAttribute('width');
      const originalHeight = mockCanvas.getAttribute('height');

      await act(async () => {
        await result.current.enterFullscreen();
      });

      // Canvas dimensions should remain unchanged - CSS handles visual scaling
      expect(mockCanvas.getAttribute('width')).toBe(originalWidth);
      expect(mockCanvas.getAttribute('height')).toBe(originalHeight);
    });

    it('should call onEnter callback when entering fullscreen', async () => {
      const onEnter = vi.fn();
      
      const { result } = renderHook(() => {
        const elementRef = useRef<HTMLDivElement>(mockElement);
        return useFullscreen({ elementRef, onEnter });
      });

      await act(async () => {
        await result.current.enterFullscreen();
      });

      expect(onEnter).toHaveBeenCalledOnce();
    });

    it('should update isFullscreen state', async () => {
      const { result } = renderHook(() => {
        const elementRef = useRef<HTMLDivElement>(mockElement);
        return useFullscreen({ elementRef });
      });

      expect(result.current.isFullscreen).toBe(false);

      await act(async () => {
        await result.current.enterFullscreen();
      });

      await waitFor(() => {
        expect(result.current.isFullscreen).toBe(true);
      });
    });

    it('should handle requestFullscreen errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockElement.requestFullscreen = vi.fn().mockRejectedValue(new Error('Fullscreen not supported'));

      const { result } = renderHook(() => {
        const elementRef = useRef<HTMLDivElement>(mockElement);
        return useFullscreen({ elementRef });
      });

      await act(async () => {
        await result.current.enterFullscreen();
      });

      expect(consoleError).toHaveBeenCalled();
      expect(result.current.isFullscreen).toBe(false);
      
      consoleError.mockRestore();
    });
  });

  describe('exitFullscreen', () => {
    it('should call document.exitFullscreen', async () => {
      const { result } = renderHook(() => {
        const elementRef = useRef<HTMLDivElement>(mockElement);
        return useFullscreen({ elementRef });
      });

      // First enter fullscreen
      await act(async () => {
        await result.current.enterFullscreen();
      });

      // Simulate fullscreen state
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: mockElement,
      });

      // Then exit
      await act(async () => {
        await result.current.exitFullscreen();
      });

      expect(document.exitFullscreen).toHaveBeenCalled();
    });

    it('should not modify canvas dimensions when exiting fullscreen', async () => {
      const { result } = renderHook(() => {
        const elementRef = useRef<HTMLDivElement>(mockElement);
        return useFullscreen({ elementRef });
      });

      const originalWidth = mockCanvas.getAttribute('width');
      const originalHeight = mockCanvas.getAttribute('height');

      // Enter fullscreen
      await act(async () => {
        await result.current.enterFullscreen();
      });

      // Simulate fullscreen state
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: mockElement,
      });

      // Exit fullscreen
      await act(async () => {
        await result.current.exitFullscreen();
      });

      // Canvas dimensions should remain unchanged - RetroArch manages them
      expect(mockCanvas.getAttribute('width')).toBe(originalWidth);
      expect(mockCanvas.getAttribute('height')).toBe(originalHeight);
    });

    it('should call onExit callback when exiting fullscreen', async () => {
      const onExit = vi.fn();
      
      const { result } = renderHook(() => {
        const elementRef = useRef<HTMLDivElement>(mockElement);
        return useFullscreen({ elementRef, onExit });
      });

      // Enter fullscreen
      await act(async () => {
        await result.current.enterFullscreen();
      });

      // Simulate fullscreen state
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: mockElement,
      });

      // Exit fullscreen
      await act(async () => {
        await result.current.exitFullscreen();
      });

      expect(onExit).toHaveBeenCalledOnce();
    });
  });

  describe('toggleFullscreen', () => {
    it('should enter fullscreen when not in fullscreen', async () => {
      const { result } = renderHook(() => {
        const elementRef = useRef<HTMLDivElement>(mockElement);
        return useFullscreen({ elementRef });
      });

      expect(result.current.isFullscreen).toBe(false);

      await act(async () => {
        await result.current.toggleFullscreen();
      });

      expect(mockElement.requestFullscreen).toHaveBeenCalled();
    });

    it('should exit fullscreen when in fullscreen', async () => {
      const { result } = renderHook(() => {
        const elementRef = useRef<HTMLDivElement>(mockElement);
        return useFullscreen({ elementRef });
      });

      // First enter fullscreen
      await act(async () => {
        await result.current.enterFullscreen();
      });

      // Simulate fullscreen state
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: mockElement,
      });

      // Then toggle (should exit)
      await act(async () => {
        await result.current.toggleFullscreen();
      });

      expect(document.exitFullscreen).toHaveBeenCalled();
    });
  });

  describe('multiple cycles', () => {
    it('should handle multiple enter/exit cycles without degradation', async () => {
      const { result } = renderHook(() => {
        const elementRef = useRef<HTMLDivElement>(mockElement);
        return useFullscreen({ elementRef });
      });

      const originalWidth = mockCanvas.getAttribute('width');
      const originalHeight = mockCanvas.getAttribute('height');

      // Cycle 1
      await act(async () => {
        await result.current.enterFullscreen();
      });
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: mockElement,
      });
      await act(async () => {
        await result.current.exitFullscreen();
      });
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: null,
      });

      expect(mockCanvas.getAttribute('width')).toBe(originalWidth);
      expect(mockCanvas.getAttribute('height')).toBe(originalHeight);

      // Cycle 2
      await act(async () => {
        await result.current.enterFullscreen();
      });
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: mockElement,
      });
      await act(async () => {
        await result.current.exitFullscreen();
      });
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: null,
      });

      // After multiple cycles, dimensions should still be original
      expect(mockCanvas.getAttribute('width')).toBe(originalWidth);
      expect(mockCanvas.getAttribute('height')).toBe(originalHeight);
    });
  });

  describe('browser fullscreen events', () => {
    it('should handle ESC key (fullscreenchange event)', async () => {
      const onExit = vi.fn();
      
      const { result } = renderHook(() => {
        const elementRef = useRef<HTMLDivElement>(mockElement);
        return useFullscreen({ elementRef, onExit });
      });

      // Enter fullscreen
      await act(async () => {
        await result.current.enterFullscreen();
      });

      // Simulate fullscreen state
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: mockElement,
      });

      // Simulate user pressing ESC (browser exits fullscreen)
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: null,
      });

      // Trigger fullscreenchange event
      await act(async () => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      await waitFor(() => {
        expect(onExit).toHaveBeenCalled();
      });
    });
  });
});
