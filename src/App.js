import React, { useState, useRef, useEffect, useMemo } from "react";
import * as Tone from "tone";
import "./style.css";

function App() {
  const [mode, setMode] = useState("landing");
  const strings = ["E", "A", "D", "G", "B", "e"];
  const [tracks, setTracks] = useState({ guitar: [], synth: [], bass: [] });
  const [instrument, setInstrument] = useState("guitar");

  const [bpm, setBpm] = useState(120);
  const [hoveredBlockId, setHoveredBlockId] = useState(null);
  const [filters, setFilters] = useState({
    guitar: { cutoff: 8000, q: 1 },
    synth: { cutoff: 8000, q: 1 },
    bass: { cutoff: 8000, q: 1 }
  });
  const [fx, setFx] = useState({
    guitar: { reverb: 0.25, chorus: 0.3 },
    synth: { reverb: 0.25, chorus: 0.3 },
    bass: { reverb: 0.1, chorus: 0.2 }
  });
  const [mute, setMute] = useState({ guitar: false, synth: false, bass: false });
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFX, setShowFX] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  const scrollRef = useRef(null);
  const isDraggingRef = useRef(false);
  const scrollSpeedRef = useRef(0);
  const rafRef = useRef(null);
  const playheadRef = useRef(null);
  const synthsRef = useRef({});
  const filtersRef = useRef({});
  const gainsRef = useRef({});
  const masterGainRef = useRef(null);
  const fxRef = useRef({});
  const animationRef = useRef(null);
  const startTimeRef = useRef(0);
  const pauseOffsetRef = useRef(0);
  const triggeredRef = useRef(new Set());
  const fileInputRef = useRef(null);
  const recorderRef = useRef(null);
  
  // НОВЫЙ РЕФ ДЛЯ СЕНСОРА v1.1
  const touchStateRef = useRef({
    taps: 0, lastTapTime: 0, tapTimer: null,
    startX: 0, startY: 0, blockX: 0, blockLength: 0, block: null,
    mode: null, initialFret: 0, initialVelocity: 1, hasMoved: false
  });
  const handleStartCreating = async (inst = "guitar") => {
    await Tone.start(); // Разблокируем звук для мобильных браузеров
    console.log("Audio is ready!"); 
    setInstrument(inst); // Устанавливаем выбранный инструмент
    setMode("app"); // Переходим в интерфейс DAW
};
  const STEP_WIDTH = 40;
  const STEP_TIME = useMemo(() => 60 / bpm / 4, [bpm]);
  const FOLLOW_OFFSET = 150;
  const OPEN_STRINGS = [82.41, 110, 146.83, 196, 246.94, 329.63];
  const autoScrollIfNeeded = (clientX) => {
    const el = scrollRef.current;
    if (!el) return;
  
    const rect = el.getBoundingClientRect();
    const edge = 80;
  
    const distRight = rect.right - clientX;
const distLeft = clientX - rect.left;

const maxSpeed = 12;
const deadZone = 20;

let speed = 0;

let direction = 0;
let raw = 0;

if (distRight < edge - deadZone) {
  direction = 1;
  raw = (edge - deadZone - distRight) / (edge - deadZone);

} else if (distLeft < edge - deadZone) {
  direction = -1;
  raw = (edge - deadZone - distLeft) / (edge - deadZone);
}

// ограничиваем 0..1
const rawClamped = Math.max(0, Math.min(1, raw));

// кривая (мягкость)
const power = rawClamped * rawClamped * rawClamped * (rawClamped * (6 * rawClamped - 15) + 10);
// минимальная скорость
const minSpeed = 0.5;
const dynamicMinSpeed = minSpeed * (0.5 + rawClamped * 0.5);

// базовая скорость
const baseSpeed = power * maxSpeed;

// если начали двигаться — не даём быть слишком медленным
const boostedSpeed =
  rawClamped > 0.02
    ? Math.max(baseSpeed, dynamicMinSpeed)
    : 0;

// финальная скорость
speed = direction * boostedSpeed;
const targetSpeed = Math.max(
  -maxSpeed,
  Math.min(maxSpeed, speed)
);

// если цель почти 0 → сразу стоп
const easing = 0.15;
const stopThreshold = 0.1;

// всегда плавно идём к цели (даже если targetSpeed = 0)
scrollSpeedRef.current += (targetSpeed - scrollSpeedRef.current) * easing;

// останавливаемся только когда и цель, и скорость почти 0
if (
  Math.abs(scrollSpeedRef.current) < stopThreshold &&
  Math.abs(targetSpeed) < stopThreshold
) {
  scrollSpeedRef.current = 0;
}
    
    if (!rafRef.current) {
      const loop = () => {
        if (!scrollRef.current) {
          rafRef.current = null;
          return;
        }
    
        scrollRef.current.scrollLeft += scrollSpeedRef.current;
    
        rafRef.current = requestAnimationFrame(loop);
      };
    
      rafRef.current = requestAnimationFrame(loop);
    } // ← закрыли if
    
    };
  useEffect(() => {
    const handleMove = (e) => {
      if (!isDraggingRef.current) return;
         autoScrollIfNeeded(e.clientX);
    };
  
    const handleUp = () => {
      isDraggingRef.current = false;
      scrollSpeedRef.current = 0;
    
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);
  useEffect(() => {
    const grid = scrollRef.current;
    if (!grid) return;
  
    const handleWheel = (e) => {
      // 👉 если НЕ над нотой — вообще ничего не трогаем
      if (!hoveredBlockId) return;
    
      // 👉 блокируем только когда реально редактируем
      e.preventDefault();
    
      setTracks(prev => ({
        ...prev,
        [instrument]: prev[instrument].map((it) => {
          if (it.id === hoveredBlockId) {
            
            // ЕСЛИ ЗАЖАТ ALT — МЕНЯЕМ ГРОМКОСТЬ (VELOCITY)
            if (e.altKey) {
              // Шаг изменения громкости, например 0.1
              const volDelta = e.deltaY < 0 ? 0.1 : -0.1; 
              // Ограничиваем velocity от 0 до 1
              const newVelocity = Math.max(0, Math.min(1, (it.velocity ?? 1) + volDelta));
              
              return {
                ...it,
                velocity: newVelocity
              };
            } 
            
            // ИНАЧЕ МЕНЯЕМ ЛАД (FRET)
            else {
              const fretDelta = e.deltaY < 0 ? 1 : -1;
              return {
                ...it,
                fret: Math.max(0, it.fret + fretDelta)
              };
            }
          }
          return it;
        })
      }));
    };
  
    // Слушатель с passive: false заставляет браузер слушаться команды preventDefault()
    grid.addEventListener("wheel", handleWheel, { passive: false });
  
    return () => {
      grid.removeEventListener("wheel", handleWheel);
    };
  }, [instrument, hoveredBlockId]);
  const getColor = (fret) => {
    const colors = ["#FF4D4D", "#FF7A4D", "#FFB84D", "#FFD84D", "#E6FF4D", "#A8FF4D", "#4DFF88", "#4DFFD2", "#4DC3FF", "#4D88FF", "#7A4DFF", "#C84DFF", "#FF4DA6"];
    return colors[fret % colors.length];
  };

  // --- AUDIO INIT ---
  useEffect(() => {
    const limiter = new Tone.Limiter(-6).toDestination();
    const master = new Tone.Gain(0.8).connect(limiter);
    masterGainRef.current = master;

    recorderRef.current = new Tone.Recorder();
    master.connect(recorderRef.current);

    ["guitar", "synth", "bass"].forEach(type => {
      const gain = new Tone.Gain(0.5).connect(master);
      const filter = new Tone.Filter(8000, "lowpass");
      const chorus = new Tone.Chorus(2, 1.5, 0.3).start();
      const reverb = new Tone.Reverb({ decay: 1.5, wet: 1 });
      const chorusGain = new Tone.Gain(0);
      const reverbGain = new Tone.Gain(0);

      fxRef.current[type] = { chorus, reverb, chorusGain, reverbGain };
      filter.connect(gain);
      filter.connect(chorus);
      chorus.connect(chorusGain);
      chorusGain.connect(gain);
      filter.connect(reverb);
      reverb.connect(reverbGain);
      reverbGain.connect(gain);

      gainsRef.current[type] = gain;
      filtersRef.current[type] = filter;

      if (type === "bass") {
        synthsRef.current[type] = new Tone.MonoSynth({
          oscillator: { type: "fatsawtooth", count: 3, spread: 20 },
          envelope: { attack: 0.03, decay: 0.4, sustain: 0.8, release: 0.6 }
        }).connect(filter);
      } else if (type === "guitar") {
        synthsRef.current[type] = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 2, modulationIndex: 10, oscillator: { type: "triangle" },
          envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 1.5 },
          modulationEnvelope: { attack: 0.1, decay: 0.2, sustain: 1, release: 0.8 }
        }).connect(filter);
      } else {
        synthsRef.current[type] = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: "sawtooth" },
          envelope: { attack: 0.15, decay: 0.2, sustain: 0.4, release: 2.0 }
        }).connect(filter);
      }
    });

    return () => {
      master.dispose();
      limiter.dispose();
      if (recorderRef.current) recorderRef.current.dispose();
      
      Object.values(synthsRef.current).forEach(s => { if (s) s.dispose(); });
      Object.values(filtersRef.current).forEach(f => { if (f) f.dispose(); });
      Object.values(gainsRef.current).forEach(g => { if (g) g.dispose(); });
      
      Object.values(fxRef.current).forEach(fx => {
        if (fx.chorus) fx.chorus.dispose();
        if (fx.reverb) fx.reverb.dispose();
        if (fx.chorusGain) fx.chorusGain.dispose();
        if (fx.reverbGain) fx.reverbGain.dispose();
      });
    };
  }, []);

  useEffect(() => {
    Object.entries(mute).forEach(([type, isMuted]) => {
      const gain = gainsRef.current[type];
      if (gain) {
        gain.gain.rampTo(isMuted ? 0 : 1, 0.05);
      }
    });
  }, [mute]);

  useEffect(() => {
    const now = Tone.now();
    Object.entries(filters).forEach(([type, f]) => {
      const filter = filtersRef.current[type];
      if (filter) {
        filter.frequency.setTargetAtTime(f.cutoff, now, 0.05);
        filter.Q.setTargetAtTime(f.q, now, 0.05);
      }
    });
  }, [filters]);

  useEffect(() => {
    const now = Tone.now();
    Object.entries(fx).forEach(([type, values]) => {
      const fxUnit = fxRef.current[type];
      if (fxUnit) {
        fxUnit.chorusGain.gain.setTargetAtTime(values.chorus, now, 0.05);
        fxUnit.reverbGain.gain.setTargetAtTime(values.reverb, now, 0.05);
      }
    });
  }, [fx]);

  const handleSaveProject = () => {
    const projectData = { bpm, tracks, filters, fx };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `struna_proj_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadProject = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.tracks) setTracks(data.tracks);
        if (data.bpm) setBpm(data.bpm);
        if (data.filters) setFilters(data.filters);
        if (data.fx) setFx(data.fx);
      } catch (err) {
        alert("Ошибка при чтении файла!");
      }
    };
    reader.readAsText(file);
    event.target.value = null; 
  };

  const getRelativeX = (clientX) => {
    const rect = scrollRef.current.getBoundingClientRect();
    return clientX - rect.left + scrollRef.current.scrollLeft;
  };

  // --- ЛОГИКА МЫШИ (Оставлена для десктопа) ---
  const startDrag = (block, e) => {
    e.stopPropagation();
    const startX = e.clientX || (e.touches && e.touches[0].clientX);
    const initialBlockX = block.x;

    const onMove = (moveEvent) => {
      const currentX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0].clientX);
      const deltaX = currentX - startX;
      const newX = Math.max(0, Math.floor((initialBlockX + deltaX) / STEP_WIDTH) * STEP_WIDTH);
      
      const rect = scrollRef.current.getBoundingClientRect();
      const currentY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0].clientY);
      const relativeY = currentY - rect.top;
      const newString = Math.max(0, Math.min(strings.length - 1, Math.floor(relativeY / 60)));
      
      setTracks(prev => ({
        ...prev,
        [instrument]: prev[instrument].map(b => b.id === block.id ? { ...b, x: newX, string: newString } : b)
      }));
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const startResize = (block, e) => {
    e.stopPropagation();
    const clientX = e.clientX; 
    const startX = clientX; 
    const initialLength = block.length;

    const onMove = (moveEvent) => {
      const moveX = moveEvent.clientX;
      const deltaX = moveX - startX; 
      const newLength = Math.max(STEP_WIDTH, Math.floor((initialLength + deltaX) / STEP_WIDTH) * STEP_WIDTH);
      
      setTracks(prev => ({
        ...prev, 
        [instrument]: prev[instrument].map(b => b.id === block.id ? { ...b, length: newLength } : b)
      }));
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }; 

  const startPlayheadDrag = (e) => {
    if (!e.shiftKey && e.type === 'mousedown') return;
    
    e.preventDefault();
    const grid = scrollRef.current;
    const startClientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;

    const onMove = (moveEvent) => {
      const currentClientX = moveEvent.type.includes('touch') ? moveEvent.touches[0].clientX : moveEvent.clientX;
      
      const rect = grid.getBoundingClientRect();
      const xInView = currentClientX - rect.left;
      const xInGrid = xInView + grid.scrollLeft;
      const boundedX = Math.max(0, xInGrid);
      
      if (playheadRef.current) playheadRef.current.style.transform = `translateX(${boundedX}px)`;
      
      const edgeThreshold = 50;
      const scrollSpeed = 15;
      if (xInView > rect.width - edgeThreshold) grid.scrollLeft += scrollSpeed;
      else if (xInView < edgeThreshold) grid.scrollLeft -= scrollSpeed;
      
      const newTime = (boundedX / STEP_WIDTH) * STEP_TIME;
      const now = Tone.now();
      startTimeRef.current = now - newTime;
      pauseOffsetRef.current = newTime;
      triggeredRef.current.clear();
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
  };

  const startEngine = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const loop = () => {
      const now = Tone.now();
      let elapsed = now - startTimeRef.current;
      const allBlocks = Object.values(tracks).flat();
      if (allBlocks.length > 0) {
        const lastBlockEndPX = Math.max(...allBlocks.map(b => b.x + b.length));
        const loopEndTime = (lastBlockEndPX / STEP_WIDTH) * STEP_TIME;
        if (elapsed >= loopEndTime) {
          startTimeRef.current = now;
          pauseOffsetRef.current = 0;
          elapsed = 0;
          triggeredRef.current.clear();
        }
      }
      Object.entries(tracks).forEach(([type, blocks]) => {
        blocks.forEach((b) => {
          const startStep = Math.floor(b.x / STEP_WIDTH);
          const durationSteps = Math.max(1, Math.floor(b.length / STEP_WIDTH));
          const startTime = startStep * STEP_TIME;
          const duration = durationSteps * STEP_TIME;
          const key = `${type}_${b.id}_${startStep}`;
          if (elapsed >= startTime && elapsed <= startTime + duration && !triggeredRef.current.has(key)) {
            const freq = OPEN_STRINGS[b.string] * Math.pow(2, b.fret / 12);
            const synth = synthsRef.current[type];
            const velocity = Math.min(1, Math.max(0, b.velocity ?? 1));
            if (type === "bass") {
              synth.triggerAttack(freq, now + 0.01, velocity);
              synth.triggerRelease(now + 0.01 + duration);
            } else {
              synth.triggerAttackRelease(freq, duration, now + 0.01, velocity);
            }
            triggeredRef.current.add(key);
          }
        });
      });
      const x = (elapsed / STEP_TIME) * STEP_WIDTH;
      if (playheadRef.current) playheadRef.current.style.transform = `translateX(${x}px)`;
      if (scrollRef.current) {
        const target = Math.max(0, x - FOLLOW_OFFSET);
        scrollRef.current.scrollLeft += (target - scrollRef.current.scrollLeft) * 0.08;
      }
      animationRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const handleTogglePlay = async () => {
    // Эта проверка — ключ к успеху на мобилках
    if (Tone.context.state !== 'running') {
      await Tone.start();
      console.log("Audio Context started!");
  }
    if (isPlaying) {
      const now = Tone.now();
      cancelAnimationFrame(animationRef.current);
      pauseOffsetRef.current = now - startTimeRef.current; 
      setIsPlaying(false);
      
      Object.values(synthsRef.current).forEach(s => { 
        try { 
          if (s.releaseAll) s.releaseAll(); 
          else if (s.triggerRelease) s.triggerRelease(); 
        } catch(e) {} 
      });
    } else {
      await Tone.start();
      const now = Tone.now();
      startTimeRef.current = now - pauseOffsetRef.current;
      triggeredRef.current.clear();
      setIsPlaying(true);
      startEngine();
    }
  };

  const handleStop = () => {
    cancelAnimationFrame(animationRef.current);
    pauseOffsetRef.current = 0;
    startTimeRef.current = Tone.now();
    triggeredRef.current.clear();
    setIsPlaying(false);
    
    if (playheadRef.current) playheadRef.current.style.transform = "translateX(0px)";
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;

    Object.values(synthsRef.current).forEach(s => { 
      try { 
        if (s.releaseAll) s.releaseAll(); 
        else if (s.triggerRelease) s.triggerRelease(); 
      } catch(e) {} 
    });
  };

  const handleRecord = async () => {
    if (!isRecording) {
      await Tone.start();
      recorderRef.current.start();
      setIsRecording(true);
      if (!isPlaying) handleTogglePlay();
    } else {
      const recording = await recorderRef.current.stop();
      setIsRecording(false);
      const url = URL.createObjectURL(recording);
      const anchor = document.createElement("a");
      anchor.download = `STRUNA_Track_${Date.now()}.wav`;
      anchor.href = url;
      anchor.click();
    }
  };

  const stopSound = () => {
    // 1. Останавливаем анимацию
    cancelAnimationFrame(animationRef.current);
    
    // 2. Мгновенно глушим все синтезаторы
    Object.values(synthsRef.current).forEach(s => { 
      try { 
        if (s.releaseAll) s.releaseAll(); 
        else if (s.triggerRelease) s.triggerRelease(); 
      } catch(e) {} 
    });

    // 3. Агрессивное глушение мастер-шины
    if (masterGainRef.current) {
      masterGainRef.current.gain.rampTo(0, 0.01); 
      setTimeout(() => {
        if (masterGainRef.current) {
          masterGainRef.current.gain.setTargetAtTime(0.8, Tone.now(), 0.1);
        }
      }, 100);
    }

    // 4. Сброс состояния
    pauseOffsetRef.current = 0;
    triggeredRef.current.clear();
    setIsPlaying(false);
    
    if (playheadRef.current) playheadRef.current.style.transform = "translateX(0px)";
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  };

  const handleResetAll = () => {
    if (window.confirm("Очистить проект?")) {
      stopSound();
      setTracks({ guitar: [], synth: [], bass: [] });
    }
  };

  // --- ЛОГИКА ЖЕСТОВ ТАЧПАДА (v1.1) ---
  const handleTouchStart = (e, b, isResize) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const now = Date.now();
    const state = touchStateRef.current;

    if (now - state.lastTapTime < 350 && state.block?.id === b.id) {
      state.taps += 1;
    } else {
      state.taps = 1;
    }
    
    state.lastTapTime = now;
    state.startX = touch.clientX;
    state.startY = touch.clientY;
    state.block = b;
    state.blockX = b.x;
    state.blockLength = b.length;
    state.initialFret = b.fret;
    state.initialVelocity = b.velocity ?? 1;
    state.hasMoved = false;

    if (isResize) {
      state.mode = 'resize';
      state.taps = 0; 
    } else if (state.taps === 3) {
      state.mode = 'volume';
    } else if (state.taps === 2) {
      state.mode = 'color';
    } else {
      state.mode = 'drag'; 
    }

    clearTimeout(state.tapTimer);
    state.tapTimer = setTimeout(() => { state.taps = 0; }, 400);
  };

  const handleTouchMove = (e) => {
    const state = touchStateRef.current;
    if (!state.block || !state.mode) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;

    // 1. Сначала проверяем, сдвинулся ли палец достаточно сильно
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        state.hasMoved = true;
    }

    // 2. Если еще не сдвинулся — ничего не делаем (ждем)
    if (!state.hasMoved) return;

    // 3. А вот ТЕПЕРЬ пошла вся остальная логика (удаление, движение и т.д.)
    if (state.mode === 'drag' && deltaY < -50 && Math.abs(deltaX) < 40) {
        // ... твой код удаления
        setTracks(prev => ({
          ...prev, 
          [instrument]: prev[instrument].filter(it => it.id !== state.block.id)
      })); 
      state.block = null;
      state.mode = null;
      return;
  }
    if (state.mode === 'color' && state.hasMoved) {
      const fretChange = Math.floor(-deltaY / 20); 
      const newFret = Math.max(0, state.initialFret + fretChange);
      setTracks(prev => ({...prev, [instrument]: prev[instrument].map(b => b.id === state.block.id ? { ...b, fret: newFret } : b)}));
    } 
    else if (state.mode === 'volume' && state.hasMoved) {
      const volChange = -deltaY / 200; 
      const newVol = Math.min(1, Math.max(0, state.initialVelocity + volChange));
      setTracks(prev => ({...prev, [instrument]: prev[instrument].map(b => b.id === state.block.id ? { ...b, velocity: newVol } : b)}));
    } 
    else if (state.mode === 'drag' && state.hasMoved) {
      const newX = Math.max(0, Math.floor((state.blockX + deltaX) / STEP_WIDTH) * STEP_WIDTH);
      const rect = scrollRef.current.getBoundingClientRect();
      const relativeY = touch.clientY - rect.top;
      const newString = Math.max(0, Math.min(strings.length - 1, Math.floor(relativeY / 60)));
      setTracks(prev => ({...prev, [instrument]: prev[instrument].map(b => b.id === state.block.id ? { ...b, x: newX, string: newString } : b)}));
    } 
    else if (state.mode === 'resize') {
      const newLength = Math.max(STEP_WIDTH, Math.floor((state.blockLength + deltaX) / STEP_WIDTH) * STEP_WIDTH);
      setTracks(prev => ({...prev, [instrument]: prev[instrument].map(b => b.id === state.block.id ? { ...b, length: newLength } : b)}));
    }
  };

  const handleTouchEnd = () => {
    touchStateRef.current.mode = null;
    touchStateRef.current.block = null;
  };

  const mixerColumnStyle = { display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "75px" };
  const verticalSliderStyle = { height: "120px", width: "30px", appearance: "slider-vertical", WebkitAppearance: "slider-vertical", cursor: "pointer" };
  const resetBtnStyle = { fontSize: "10px", padding: "4px 8px", background: "#2A3350", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" };
  const labelStyle = { fontSize: "11px", fontWeight: "bold", color: "#AAB3C2", textAlign: "center" };
  if (mode === "landing") {
    return (
      <div className="app landing">
    
        <div className="landing-content">
    
          <h1 className="logo">STRUNA</h1>
    
          <p className="tagline">UNBOUND SOUND</p>
    
          <button
    // Просто одна строка вместо пяти!
onClick={() => handleStartCreating("guitar")}
    className="start-btn"
>
    START CREATING
</button>
    
<div className="preview">

<div
  className="preview-track guitar"
  onClick={() => handleStartCreating("guitar")}>
  <span>GUITAR</span>
  <div className="wave">
  <span></span>
  <span></span>
  <span></span>
  <span></span>
  <span></span>
</div>
</div>

<div
  className="preview-track synth"
  onClick={() => handleStartCreating("synth")}>
  <span>SYNTH</span>
  <div className="wave">
  <span></span>
  <span></span>
  <span></span>
  <span></span>
  <span></span>
</div>
</div>

<div
  className="preview-track bass"
  onClick={() => handleStartCreating("bass")}>
  <span>BASS</span>
  <div className="wave">
  <span></span>
  <span></span>
  <span></span>
  <span></span>
  <span></span>
</div>
</div>

</div>
<div style={{
  position: "absolute",
  bottom: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  textAlign: "center",
  width: "100%",
  pointerEvents: "none",
  zIndex: 10
}}>
  <p style={{
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: "10px",
    letterSpacing: "4px",
    textTransform: "uppercase",
    margin: 0,
    fontFamily: "sans-serif"
  }}>
    Powered By <span style={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: "bold" }}>KARGANI STUDIO</span>
  </p>
</div>   
        </div>
    
      </div>
    );
  }
  return (
    <div className="app">
      
      <style>{`
        @keyframes pulse-record {
          0% { box-shadow: 0 0 0 0 rgba(255, 77, 77, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(255, 77, 77, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 77, 77, 0); }
        }
      `}</style>

<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
  
  {/* Левая часть: Кнопка НАЗАД (EXIT) и Логотип */}
  <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
    
    {/* Кнопка-невидимка EXIT */}
    <button 
      onClick={() => {
        stopSound(); // Остановка звука
        setMode("landing"); // Возврат на главный экран
      }} 
      style={{
        background: "transparent",
        border: "none",
        color: "rgba(255, 255, 255, 0.3)",
        cursor: "pointer",
        padding: "5px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.3s ease",
      }}
      onMouseOver={(e) => { 
        e.currentTarget.style.color = "#FF4D4D"; 
        e.currentTarget.style.filter = "drop-shadow(0 0 10px rgba(255, 77, 77, 0.8))";
        e.currentTarget.style.transform = "translateX(-3px) scale(1.1)";
      }}
      onMouseOut={(e) => { 
        e.currentTarget.style.color = "rgba(255, 255, 255, 0.3)"; 
        e.currentTarget.style.filter = "none";
        e.currentTarget.style.transform = "translateX(0) scale(1)";
      }}
    >
      <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
      </svg>
    </button>

    {/* Логотип */}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <h1 className="logo" style={{ margin: 0 }}>STRUNA</h1>
        <span style={{ fontSize: "10px", color: "#4D88FF", opacity: 0.7 }}>v1.1.1-BETA</span>
      </div>
      <p style={{ margin: 0, fontSize: "12px", color: "#4D88FF", letterSpacing: "2px", marginTop: "-5px" }}>
        UNBOUND SOUND
      </p>
    </div>
  </div>

  {/* Правая часть: Кнопки сохранения и загрузки */}
  <div style={{ display: "flex", gap: "10px" }}>
    <button onClick={handleSaveProject} className="save-btn">💾 SAVE</button>
    <button onClick={() => fileInputRef.current.click()} className="load-btn">📂 LOAD</button>
    <input type="file" ref={fileInputRef} onChange={handleLoadProject} style={{ display: "none" }} accept=".json" />
  </div>

</div>

      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: 20 }}>
        <button onClick={handleTogglePlay} className={`play-pause-btn ${isPlaying ? "playing" : "stopped"}`}>
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="28" height="28">
              <rect x="6" y="5" width="4" height="14" rx="1" fill="#4d88ff" />
              <rect x="14" y="5" width="4" height="14" rx="1" fill="#4d88ff" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="28" height="28">
              <path d="M8 5v14l11-7z" fill="#4dff88" />
            </svg>
          )}
        </button>
        <button onClick={handleStop} className="stop-btn">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <rect x="6" y="6" width="12" height="12" rx="1" fill="#ff4d4d" />
          </svg>
        </button>
        
        <button onClick={handleRecord} className={`record-btn ${isRecording ? 'recording' : ''}`}>
          <div className="record-dot"></div>
          {isRecording ? 'REC' : 'RECORD'}
        </button>

        <button onClick={handleResetAll} className="reset-btn">RESET 🗑️</button>
      </div>

      <div style={{ display: "flex", gap: "15px", alignItems: "center", marginBottom: 25, background: "#161B33", padding: "15px", borderRadius: "10px", width: "fit-content" }}>
        <div className="bpm-display">
          <span className="bpm-label">TEMPO</span>
          <span className="bpm-value">{bpm} BPM</span>
        </div>
        <input type="range" min="60" max="200" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} style={{ width: "150px", cursor: "pointer" }} />
      </div>

      <div className="instrument-selector">
        {["guitar", "synth", "bass"].map((t) => (
          <button
            key={t}
            onClick={() => setInstrument(t)}
            className={`inst-btn ${instrument === t ? "active" : ""} ${t}-btn`}
          >
            <span className="inst-icon">
              {t === "guitar" ? "🎸" : t === "synth" ? "🎹" : "🔊"}
            </span>
            <span className="inst-text">{t.toUpperCase()}</span>
            {instrument === t && <div className="active-glow"></div>}
          </button>
        ))}

        <button onClick={() => setShowFX(!showFX)} className={`inst-btn fx-toggle-btn ${showFX ? "fx-active" : ""}`}>
          <span className="inst-icon">⚙️</span>
          <span className="inst-text">{showFX ? "HIDE FX" : "SHOW FX"}</span>
          {showFX && <div className="active-glow"></div>}
        </button>
      </div>

      <div style={{ maxHeight: showFX ? "300px" : "0px", opacity: showFX ? 1 : 0, overflow: "hidden", transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)", marginBottom: showFX ? 30 : 0 }}>
        <div style={{ display: "flex", gap: "25px", background: "#161B33", padding: "20px", borderRadius: "12px", width: "fit-content" }}>
          <div style={mixerColumnStyle}>
            <span style={labelStyle}>CUTOFF<br/>{filters[instrument].cutoff}</span>
            <input type="range" min="200" max="10000" value={filters[instrument].cutoff} onChange={(e) => setFilters(p => ({...p, [instrument]: {...p[instrument], cutoff: Number(e.target.value)}}))} style={verticalSliderStyle} />
            <button style={resetBtnStyle} onClick={() => setFilters(p => ({...p, [instrument]: {...p[instrument], cutoff: 8000}}))}>Reset</button>
          </div>
          <div style={mixerColumnStyle}>
            <span style={labelStyle}>Q (RES)<br/>{filters[instrument].q}</span>
            <input type="range" min="0.1" max="20" step="0.1" value={filters[instrument].q} onChange={(e) => setFilters(p => ({...p, [instrument]: {...p[instrument], q: Number(e.target.value)}}))} style={verticalSliderStyle} />
            <button style={resetBtnStyle} onClick={() => setFilters(p => ({...p, [instrument]: {...p[instrument], q: 1}}))}>Reset</button>
          </div>
          <div style={mixerColumnStyle}>
            <span style={labelStyle}>CHORUS<br/>{fx[instrument].chorus.toFixed(2)}</span>
            <input type="range" min="0" max="1" step="0.01" value={fx[instrument].chorus} onChange={(e) => setFx(p => ({...p, [instrument]: {...p[instrument], chorus: Number(e.target.value)}}))} style={verticalSliderStyle} />
            <button style={resetBtnStyle} onClick={() => setFx(p => ({...p, [instrument]: {...p[instrument], chorus: 0.3}}))}>Reset</button>
          </div>
          <div style={mixerColumnStyle}>
            <span style={labelStyle}>REVERB<br/>{fx[instrument].reverb.toFixed(2)}</span>
            <input type="range" min="0" max="1" step="0.01" value={fx[instrument].reverb} onChange={(e) => setFx(p => ({...p, [instrument]: {...p[instrument], reverb: Number(e.target.value)}}))} style={verticalSliderStyle} />
            <button style={resetBtnStyle} onClick={() => setFx(p => ({...p, [instrument]: {...p[instrument], reverb: 0.25}}))}>Reset</button>
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        onMouseMove={(e) => {
          if (!isDraggingRef.current) return;
        
          autoScrollIfNeeded(e.clientX); // 🔥 КЛЮЧ
        }}
        onTouchMove={(e) => {
          if (!isDraggingRef.current) return;
        
          const touchX = e.touches[0].clientX;
          autoScrollIfNeeded(touchX);
        }}
        className="scroll-container"
        onContextMenu={(e) => e.preventDefault()}
        style={{
          width: "100%",
          overflowX: "auto", // Оставляем
          overflowY: "auto", // БЫЛО "hidden" - именно оно обрезало ползунок! Измените на auto
          paddingBottom: "10px", // ДОБАВЬТЕ отступ снизу, чтобы ползунку было где отрисоваться
          position: "relative",
          background: "#050814",
          borderRadius: 10,
          border: "1px solid #161B33",
          WebkitOverflowScrolling: "touch", 
          touchAction: "pan-x"
        }}
        >
          <div style={{ 
            width: '2000px', 
            display: "inline-block",
            minWidth: '2000px', 
            position: "relative", 
            height: 360, 
            backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)`, 
            backgroundSize: `${STEP_WIDTH}px 60px` 
          }}>
          {strings.map((s, i) => (
            <div key={i} onMouseDown={(e) => {
              if (e.target.closest(".block") || e.target.closest(".playhead-grabber")) return;
              isDraggingRef.current = true;
              const x = Math.floor(getRelativeX(e.clientX) / STEP_WIDTH) * STEP_WIDTH;
              setTracks(prev => ({...prev, [instrument]: [...prev[instrument], { id: Date.now(), string: i, x, length: 80, fret: 0, velocity: 1 }]}));
            }}
            onTouchStart={(e) => {
              if (e.target.closest(".block") || e.target.closest(".playhead-grabber")) return;
              const touchX = e.touches[0].clientX;
              const x = Math.floor(getRelativeX(touchX) / STEP_WIDTH) * STEP_WIDTH;
              setTracks(prev => ({...prev, [instrument]: [...prev[instrument], { id: Date.now(), string: i, x, length: 80, fret: 0, velocity: 1 }]}));
            }} style={{ borderBottom: "1px solid #161B33", height: 60, display: "flex", alignItems: "center", paddingLeft: 10, color: "#4D88FF", position: "relative" }}>
              <span style={{ width: 30, fontWeight: "bold" }}>{s}</span>
              
              {Object.keys(tracks).map(instName => 
                tracks[instName]
                  .filter(b => b.string === i)
                  .map(b => {
                    const isActive = instName === instrument; 
                    
                    return (
                      <div 
                        key={b.id} 
                        className="block"
                        data-id={b.id}
                        onMouseEnter={() => setHoveredBlockId(b.id)}   // 👈 ДОБАВИТЬ
                        onMouseLeave={() => setHoveredBlockId(null)}   // 👈 ДОБАВИТЬ
                        onMouseDown={(e) => {
                          if (!isActive) return;
                        
                          isDraggingRef.current = true; // 🔥 ВОТ ЭТО ДОБАВЬ
                          startDrag(b, e);
                        }}
                        onDoubleClick={() => {
                          if (!isActive) return;
                          setTracks(prev => ({
                            ...prev,
                            [instrument]: prev[instrument].map(it => 
                              it.id === b.id ? { ...it, velocity: (it.velocity || 1) <= 0.5 ? 1 : 0.5 } : it
                            )
                          }));
                        }}
                        onTouchStart={(e) => isActive && handleTouchStart(e, b, false)}
                        onTouchMove={(e) => isActive && handleTouchMove(e)}
                        onTouchEnd={handleTouchEnd}
                        onContextMenu={(e) => { 
                          e.preventDefault(); 
                          if (!isActive) return;
                          setTracks(prev => ({...prev, [instrument]: prev[instrument].filter(it => it.id !== b.id)})); 
                        }} 
                        style={{
                          position: "absolute",
                          left: b.x,
                          width: b.length,
                          height: 45,
                          backgroundColor: isActive ? getColor(b.fret) : "rgba(100, 100, 100, 0.3)",
                          "--neon-color": isActive ? getColor(b.fret) : "transparent",
                          opacity: isActive ? (b.velocity || 1) : 0.4,
                          border: isActive ? "none" : "1px dashed rgba(255,255,255,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: isActive ? "white" : "rgba(255,255,255,0.2)",
                          fontWeight: "bold",
                          cursor: isActive ? "grab" : "default",
                          zIndex: isActive ? 10 : 5,
                          borderRadius: 6,
                          pointerEvents: isActive ? "auto" : "none",
                          touchAction: "none" 
                        }}>
                        {b.fret}
                        {isActive && (
                          <div 
                            onMouseDown={(e) => startResize(b, e)}
                            onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e, b, true); }}
                            style={{
                              position: "absolute",
                              right: 0,
                              top: 0,
                              width: 15,
                              height: "100%",
                              cursor: "ew-resize",
                              background: "rgba(0,0,0,0.1)",
                              borderRadius: "0 6px 6px 0",
                            }} 
                          />
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          ))}
          <div 
            ref={playheadRef} 
            className="playhead-grabber" 
            onMouseDown={startPlayheadDrag} 
            onTouchStart={startPlayheadDrag} 
            style={{ 
              position: "absolute", 
              top: 0, 
              width: 25, 
              marginLeft: -11, 
              height: "100%", 
              cursor: "ew-resize", 
              zIndex: 30, 
              display: "flex", 
              justifyContent: "center" 
            }} 
          >
            <div style={{ width: 3, height: "100%", background: "#FF4D4D", pointerEvents: "none" }} />
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;