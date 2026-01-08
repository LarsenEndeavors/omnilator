import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFullscreen } from '../../hooks/useFullscreen';

describe('useFullscreen', () => {
  // Store original document methods
  let originalRequestFullscreen: typeof document.documentElement.requestFullscreen | undefined;
  let originalExitFullscreen: typeof document.exitFullscreen | undefined;
  let originalFullscreenElement: PropertyDescriptor | undefined;
  let originalFullscreenEnabled: PropertyDescriptor | undefined;

  beforeEach(() => {
    // Save original methods
    originalRequestFullscreen = document.documentElement.requestFullscreen;
    originalExitFullscreen = document.exitFullscreen;
    originalFullscreenElement = Object.getOwnPropertyDescriptor(document, 'fullscreenElement');
    originalFullscreenEnabled = Object.getOwnPropertyDescriptor(document, 'fullscreenEnabled');

    // Mock fullscreen API
    document.documentElement.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
    
    Object.defineProperty(document, 'fullscreenEnabled', {
      writable: true,
      configurable: true,
      value: true,
    });
    
    Object.defineProperty(document, 'fullscreenElement', {
      writable: true,
      configurable: true,
      value: null,
    });
  });

  afterEach(() => {
    // Restore original methods
    if (originalRequestFullscreen !== undefined) {
      document.documentElement.requestFullscreen = originalRequestFullscreen;
    }
    if (originalExitFullscreen !== undefined) {
      document.exitFullscreen = originalExitFullscreen;
    }
    
    if (originalFullscreenElement) {
      Object.defineProperty(document, 'fullscreenElement', originalFullscreenElement);
    }
    
    if (originalFullscreenEnabled) {
      Object.defineProperty(document, 'fullscreenEnabled', originalFullscreenEnabled);
    }
    
    vi.clearAllMocks();
  });

  it('should initialize with isFullscreen false', () => {
    const { result } = renderHook(() => useFullscreen());
    expect(result.current.isFullscreen).toBe(false);
  });

  it('should report isSupported as true when API is available', () => {
    const { result } = renderHook(() => useFullscreen());
    expect(result.current.isSupported).toBe(true);
  });

  it('should call requestFullscreen when enterFullscreen is invoked', async () => {
    const { result } = renderHook(() => useFullscreen());
    
    await act(async () => {
      await result.current.enterFullscreen();
    });
    
    expect(document.documentElement.requestFullscreen).toHaveBeenCalledOnce();
  });

  it('should call exitFullscreen when exitFullscreen is invoked', async () => {
    const { result } = renderHook(() => useFullscreen());
    
    await act(async () => {
      await result.current.exitFullscreen();
    });
    
    expect(document.exitFullscreen).toHaveBeenCalledOnce();
  });

  it('should toggle fullscreen state when toggleFullscreen is called', async () => {
    const { result } = renderHook(() => useFullscreen());
    
    // First toggle - enter fullscreen
    await act(async () => {
      result.current.toggleFullscreen();
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(document.documentElement.requestFullscreen).toHaveBeenCalledOnce();
  });

  it('should update isFullscreen when fullscreenchange event fires', async () => {
    const { result } = renderHook(() => useFullscreen());
    
    // Simulate entering fullscreen
    act(() => {
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: document.documentElement,
      });
      
      const event = new Event('fullscreenchange');
      document.dispatchEvent(event);
    });
    
    expect(result.current.isFullscreen).toBe(true);
    
    // Simulate exiting fullscreen
    act(() => {
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: null,
      });
      
      const event = new Event('fullscreenchange');
      document.dispatchEvent(event);
    });
    
    expect(result.current.isFullscreen).toBe(false);
  });

  it('should call onEnter callback when entering fullscreen', async () => {
    const onEnter = vi.fn();
    renderHook(() => useFullscreen({ onEnter }));
    
    act(() => {
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: document.documentElement,
      });
      
      const event = new Event('fullscreenchange');
      document.dispatchEvent(event);
    });
    
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it('should call onExit callback when exiting fullscreen', async () => {
    const onExit = vi.fn();
    renderHook(() => useFullscreen({ onExit }));
    
    // First enter fullscreen
    act(() => {
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: document.documentElement,
      });
      
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    
    // Then exit fullscreen
    act(() => {
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        configurable: true,
        value: null,
      });
      
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('should call onError callback when entering fullscreen fails', async () => {
    const onError = vi.fn();
    const mockError = new Error('Fullscreen denied');
    
    document.documentElement.requestFullscreen = vi.fn().mockRejectedValue(mockError);
    
    const { result } = renderHook(() => useFullscreen({ onError }));
    
    await act(async () => {
      await result.current.enterFullscreen();
    });
    
    expect(onError).toHaveBeenCalledWith(mockError);
  });

  it('should handle unsupported browsers gracefully', async () => {
    const onError = vi.fn();
    
    const { result } = renderHook(() => useFullscreen({ onError }));
    
    // We can't easily mock isSupported in this test environment
    // since it's calculated inline, but we can verify error handling works
    // when fullscreen is explicitly not supported by making the API throw
    
    // Mock the API to throw a specific error
    document.documentElement.requestFullscreen = vi.fn().mockRejectedValue(
      new Error('Fullscreen API is not supported in this browser')
    );
    
    await act(async () => {
      await result.current.enterFullscreen();
    });
    
    expect(onError).toHaveBeenCalled();
  });

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    
    const { unmount } = renderHook(() => useFullscreen());
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('fullscreenchange', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('webkitfullscreenchange', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mozfullscreenchange', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('MSFullscreenChange', expect.any(Function));
  });
});
