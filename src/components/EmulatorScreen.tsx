import React, { useEffect, useState } from 'react';
import { SnesCore } from '../core/SnesCore';
import { SnesButton } from '../core/IEmulatorCore';
import { useEmulator } from '../hooks/useEmulator';
import { useInput } from '../hooks/useInput';
import { AudioSystem } from '../audio/AudioSystem';
import './EmulatorScreen.css';

interface EmulatorScreenProps {
  romData?: Uint8Array;
}

/**
 * Convert button mask to human-readable button names
 * @param buttonMask - The button state bitmask
 * @returns Array of pressed button names
 */
const getButtonNames = (buttonMask: number): string[] => {
  const names: string[] = [];
  if (buttonMask & SnesButton.UP) names.push('UP');
  if (buttonMask & SnesButton.DOWN) names.push('DOWN');
  if (buttonMask & SnesButton.LEFT) names.push('LEFT');
  if (buttonMask & SnesButton.RIGHT) names.push('RIGHT');
  if (buttonMask & SnesButton.A) names.push('A');
  if (buttonMask & SnesButton.B) names.push('B');
  if (buttonMask & SnesButton.X) names.push('X');
  if (buttonMask & SnesButton.Y) names.push('Y');
  if (buttonMask & SnesButton.L) names.push('L');
  if (buttonMask & SnesButton.R) names.push('R');
  if (buttonMask & SnesButton.START) names.push('START');
  if (buttonMask & SnesButton.SELECT) names.push('SELECT');
  return names;
};

export const EmulatorScreen: React.FC<EmulatorScreenProps> = ({ romData }) => {
  const [core] = useState(() => new SnesCore());
  const [audioSystem] = useState(() => new AudioSystem());
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStates, setSaveStates] = useState<Map<number, Uint8Array>>(new Map());

  const { canvasRef, isRunning, fps, toggle } = useEmulator({
    core,
    targetFPS: 60,
  });

  const { buttons, isGamepadConnected } = useInput({
    port: 0,
    enabled: isInitialized,
    onInputChange: (buttons) => {
      if (isInitialized) {
        core.setInput(0, buttons);
      }
    },
  });

  // Initialize emulator
  useEffect(() => {
    const init = async () => {
      try {
        await core.initialize();
        setIsInitialized(true);
        
        // Try to initialize audio system (non-blocking)
        try {
          await audioSystem.initialize(core);
        } catch (audioErr) {
          console.warn('Audio system initialization failed, continuing without audio:', audioErr);
        }
        
        // If ROM data is provided, load it
        if (romData) {
          await core.loadROM(romData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize emulator');
        console.error('Initialization error:', err);
      }
    };

    init();

    return () => {
      core.cleanup();
      audioSystem.cleanup();
    };
  }, [core, audioSystem, romData]);

  // Sync audio playback with emulator state
  useEffect(() => {
    if (isRunning) {
      audioSystem.start();
    } else {
      audioSystem.stop();
    }
  }, [isRunning, audioSystem]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      await core.loadROM(uint8Array);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ROM');
      console.error('ROM load error:', err);
    }
  };

  const handleSaveState = (slot: number) => {
    try {
      const state = core.saveState();
      setSaveStates(prev => new Map(prev).set(slot, state));
      console.log(`State saved to slot ${slot}`);
    } catch (err) {
      console.error('Save state error:', err);
    }
  };

  const handleLoadState = (slot: number) => {
    try {
      const state = saveStates.get(slot);
      if (state) {
        core.loadState(state);
        console.log(`State loaded from slot ${slot}`);
      }
    } catch (err) {
      console.error('Load state error:', err);
    }
  };

  const handleReset = () => {
    core.reset();
  };

  return (
    <div className="emulator-screen">
      <div className="emulator-header">
        <h1>SNES Emulator</h1>
        <div className="emulator-stats">
          <span className="fps-counter">FPS: {fps}</span>
          <span className="gamepad-status">
            {isGamepadConnected ? '🎮 Gamepad Connected' : '⌨️ Keyboard'}
          </span>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="demo-notice">
        <strong>⚠️ Demo Mode:</strong> This is a test implementation showing input responsiveness. 
        Press buttons to see visual indicators. A real SNES emulator WASM module is needed for actual ROM playback.
      </div>

      <div className="emulator-container">
        <canvas
          ref={canvasRef}
          width={256}
          height={224}
          className="emulator-canvas"
        />
      </div>

      <div className="emulator-controls">
        <div className="control-group">
          <button onClick={toggle} disabled={!isInitialized}>
            {isRunning ? '⏸️ Pause' : '▶️ Play'}
          </button>
          <button onClick={handleReset} disabled={!isInitialized}>
            🔄 Reset
          </button>
          <label className="file-upload-button">
            📁 Load ROM
            <input
              type="file"
              accept=".smc,.sfc"
              onChange={handleFileUpload}
              disabled={!isInitialized}
            />
          </label>
        </div>

        <div className="save-states-section">
          <h4>Save States</h4>
          <div className="save-states-grid">
            {[1, 2, 3, 4].map(slot => (
              <div key={slot} className={`save-state-slot ${saveStates.has(slot) ? 'has-save' : ''}`}>
                <div className="slot-header">
                  <span className="slot-number">Slot {slot}</span>
                  <span className="slot-status">
                    {saveStates.has(slot) ? '✓ Saved' : 'Empty'}
                  </span>
                </div>
                <div className="slot-actions">
                  <button
                    onClick={() => handleSaveState(slot)}
                    disabled={!isInitialized}
                    title={`Save to slot ${slot}`}
                    className="save-button"
                  >
                    💾 Save
                  </button>
                  <button
                    onClick={() => handleLoadState(slot)}
                    disabled={!isInitialized || !saveStates.has(slot)}
                    title={`Load from slot ${slot}`}
                    className="load-button"
                  >
                    📂 Load
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="emulator-info">
        <div className="control-info">
          <h3>Keyboard Controls</h3>
          <div className="controls-grid">
            <div><strong>D-Pad:</strong> Arrow Keys or WASD</div>
            <div><strong>A Button:</strong> X</div>
            <div><strong>B Button:</strong> Z</div>
            <div><strong>X Button:</strong> V</div>
            <div><strong>Y Button:</strong> C</div>
            <div><strong>L Button:</strong> Q</div>
            <div><strong>R Button:</strong> E</div>
            <div><strong>Start:</strong> Enter</div>
            <div><strong>Select:</strong> Shift</div>
          </div>
        </div>

        <div className="button-state">
          <h3>Button State</h3>
          <div className="button-display">
            <div className="button-mask">
              0x{buttons.toString(16).padStart(4, '0').toUpperCase()}
            </div>
            <div className="button-names">
              {getButtonNames(buttons).length > 0 
                ? getButtonNames(buttons).join(' + ')
                : 'No buttons pressed'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
