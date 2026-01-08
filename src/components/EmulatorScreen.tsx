import React, { useEffect, useState, useRef } from 'react';
import { SnesCore } from '../core/SnesCore';
import './EmulatorScreen.css';

interface EmulatorScreenProps {
  romData?: Uint8Array;
}

/**
 * Simplified EmulatorScreen using Emulatrix RetroArch
 * 
 * This component is MUCH simpler than the previous implementation because:
 * - RetroArch manages its own rendering loop (no useEmulator hook needed)
 * - RetroArch handles audio directly (no AudioSystem needed)
 * - RetroArch reads keyboard input via config (no useInput hook needed)
 * 
 * We just need to:
 * 1. Initialize the core
 * 2. Load a ROM
 * 3. Add RetroArch's canvas to the DOM
 * 4. Let RetroArch do everything else!
 */
export const EmulatorScreen: React.FC<EmulatorScreenProps> = ({ romData }) => {
  const [core] = useState(() => new SnesCore());
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedRomName, setLoadedRomName] = useState<string | null>(null);
  const [isLoadingRom, setIsLoadingRom] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Initialize emulator core
  useEffect(() => {
    const init = async () => {
      try {
        console.log('[EmulatorScreen] Initializing Emulatrix RetroArch core...');
        await core.initialize();
        setIsInitialized(true);
        console.log('[EmulatorScreen] Core initialized successfully');
        
        // Get the canvas from RetroArch and add it to our container
        const canvas = core.getCanvas();
        if (canvas && canvasContainerRef.current) {
          canvasContainerRef.current.appendChild(canvas);
          console.log('[EmulatorScreen] RetroArch canvas added to DOM');
        }
        
        // If ROM data is provided, load it
        if (romData) {
          await core.loadROM(romData);
          setLoadedRomName('Preloaded ROM');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize emulator');
        console.error('[EmulatorScreen] Initialization error:', err);
      }
    };

    init();

    return () => {
      console.log('[EmulatorScreen] Cleaning up...');
      core.cleanup();
    };
  }, [core, romData]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoadingRom(true);
    setError(null);

    try {
      console.log(`[EmulatorScreen] Loading ROM file: ${file.name} (${file.size} bytes)`);
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      await core.loadROM(uint8Array);
      setLoadedRomName(file.name);
      setError(null);
      console.log('[EmulatorScreen] ROM loaded successfully, RetroArch is running!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ROM');
      console.error('[EmulatorScreen] ROM load error:', err);
      setLoadedRomName(null);
    } finally {
      setIsLoadingRom(false);
    }
  };

  const handleReset = () => {
    try {
      core.reset();
      console.log('[EmulatorScreen] Emulator reset');
    } catch (err) {
      console.error('[EmulatorScreen] Reset error:', err);
    }
  };

  return (
    <div className="emulator-screen">
      <div className="emulator-header">
        <h1>SNES Emulator (Emulatrix RetroArch)</h1>
        {loadedRomName && (
          <div className="rom-status">
            <strong>📄 ROM Loaded:</strong> {loadedRomName}
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {isLoadingRom && (
        <div className="rom-loading">
          <strong>⏳ Loading ROM...</strong>
        </div>
      )}

      {!isInitialized && !error && (
        <div className="initializing">
          <strong>🔧 Initializing RetroArch...</strong>
        </div>
      )}

      <div className="emulator-container">
        {/* RetroArch canvas will be inserted here */}
        <div ref={canvasContainerRef} className="retroarch-canvas-container" />
      </div>

      <div className="emulator-controls">
        <div className="control-group">
          <label className="file-upload-button">
            📁 Load ROM
            <input
              type="file"
              accept=".smc,.sfc"
              onChange={handleFileUpload}
              disabled={!isInitialized}
            />
          </label>
          <button onClick={handleReset} disabled={!isInitialized || !loadedRomName}>
            🔄 Reset (F10)
          </button>
        </div>
      </div>

      <div className="keyboard-controls">
        <h4>🎮 Keyboard Controls (Configured in RetroArch)</h4>
        <div className="controls-grid">
          <div className="control-section">
            <h5>Movement</h5>
            <ul>
              <li><kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> D-Pad</li>
            </ul>
          </div>
          <div className="control-section">
            <h5>Buttons</h5>
            <ul>
              <li><kbd>X</kbd> A Button</li>
              <li><kbd>Z</kbd> B Button</li>
              <li><kbd>S</kbd> X Button</li>
              <li><kbd>A</kbd> Y Button</li>
              <li><kbd>Q</kbd> L Shoulder</li>
              <li><kbd>W</kbd> R Shoulder</li>
            </ul>
          </div>
          <div className="control-section">
            <h5>System</h5>
            <ul>
              <li><kbd>Enter</kbd> Start</li>
              <li><kbd>Shift</kbd> Select</li>
              <li><kbd>F9</kbd> Mute Audio</li>
              <li><kbd>F10</kbd> Reset</li>
            </ul>
          </div>
        </div>
        <p className="controls-note">
          ℹ️ RetroArch handles all input directly. No custom input system needed!
        </p>
      </div>

      <div className="info-box">
        <h4>✨ What's Different?</h4>
        <ul>
          <li>✅ Using proven Emulatrix RetroArch implementation</li>
          <li>✅ Audio plays smoothly with optimal latency (128ms)</li>
          <li>✅ Input handled natively by RetroArch config</li>
          <li>✅ Much simpler code - RetroArch does the heavy lifting</li>
          <li>✅ No custom frame loop, audio system, or input hooks needed</li>
        </ul>
      </div>
    </div>
  );
};
