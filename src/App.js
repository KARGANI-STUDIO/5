import React, { useState, useRef, useEffect, useMemo } from "react";
import * as Tone from "tone";
import "./style.css";
import { useGoogleLogin } from '@react-oauth/google';
import UserProfile from './UserProfile';
import { supabase } from './supabaseClient';

function App() {
  const [user, setUser] = useState(() => {
    // При загрузке страницы проверяем, есть ли сохраненный юзер в памяти браузера
    const savedUser = localStorage.getItem("struna_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [mode, setMode] = useState("landing");
  const strings = ["E1", "A1", "E", "A", "D", "G", "B", "e"];
  const [tracks, setTracks] = useState({ guitar: [], synth: [], drum: [], bass: [], chip: [] });
  const [instrument, setInstrument] = useState("guitar");
  const [showHelp, setShowHelp] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [infoModal, setInfoModal] = useState({ visible: false, message: '' });;
  const [bpm, setBpm] = useState(120);
  const [hoveredBlockId, setHoveredBlockId] = useState(null);
  const [demoPlaying, setDemoPlaying] = useState(null); // имя инструмента или null
  const [isTempoMasterVisible, setIsTempoMasterVisible] = useState(true);
  const defaultFilters = {
    guitar: { cutoff: 8000, q: 1 },
    synth: { cutoff: 8000, q: 1 },
    drum: { cutoff: 10000, q: 1 },
    bass: { cutoff: 8000, q: 1 },
    chip: { cutoff: 12000, q: 0.8 }
  };
  const defaultFx = {
    guitar: { reverb: 0.25, chorus: 0.3 },
    synth: { reverb: 0.25, chorus: 0.3 },
    drum: { reverb: 0.2, chorus: 0.1 },
    bass: { reverb: 0.1, chorus: 0.2 },
    chip: { reverb: 0.05, chorus: 0.05 }
  };
  const defaultVolumes = {
    guitar: 0.35,
    synth: 0.4,
    drum: 0.6,
    bass: 0.5,
    chip: 0.45
  };

  const [filters, setFilters] = useState(defaultFilters);
  const [fx, setFx] = useState(defaultFx);
  const [volumes, setVolumes] = useState(defaultVolumes);
  const [mute, setMute] = useState({ guitar: false, synth: false, drum: false, bass: false, chip: false });
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFX, setShowFX] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [activeStep, setActiveStep] = useState(null);
  const [currentPosition, setCurrentPosition] = useState({ bar: 1, beat: 1, seconds: 0 });
  const [selectedBlockIds, setSelectedBlockIds] = useState(new Set());
  const [isGroupDragging, setIsGroupDragging] = useState(false);
  const [dragStartInfo, setDragStartInfo] = useState(null);
  const [masterVolume, setMasterVolume] = useState(0);
  const [masterDisplayMode, setMasterDisplayMode] = useState("vu");
  const [uiSoundsEnabled, setUiSoundsEnabled] = useState(true);
  const [fxVolume, setFxVolume] = useState(0.5);
  const [loopActive, setLoopActive] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);
  const [waveAmp, setWaveAmp] = useState(5);
  const [previewLoopEnd, setPreviewLoopEnd] = useState(0);
  const loopStartRef = useRef(0);
  const loopEndRef = useRef(0);
  window.__currentFxVolume = fxVolume;
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  const meterRef = useRef(null);
  const copiedBlocksRef = useRef([]);
  const playheadXRef = useRef(0);
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
  const demoRef = useRef(null); // ссылка на текущий демо-синтезатор
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      const data = await res.json();
      const userData = { ...data, access_token: tokenResponse.access_token };
      setUser(userData);
      localStorage.setItem("struna_user", JSON.stringify(userData));
      window.location.reload();
    },
    scope: 'https://www.googleapis.com/auth/drive.file',
  });
  // НОВЫЙ РЕФ ДЛЯ СЕНСОРА v1.1
  const touchStateRef = useRef({
    taps: 0, lastTapTime: 0, tapTimer: null,
    startX: 0, startY: 0, blockX: 0, blockLength: 0, block: null,
    mode: null, initialFret: 0, initialVelocity: 1, hasMoved: false
  });

// ==================== handleStartCreating ====================
const handleStartCreating = async (inst = "guitar") => {
  // Мгновенно заглушаем звук текущего демо, не удаляя узлы (избегаем ошибок)
  if (demoRef.current && demoRef.current.masterGain) {
    demoRef.current.masterGain.gain.value = 0;
  }
  demoRef.current = null;
  setDemoPlaying(null);
  await Tone.start();
  setInstrument(inst);
  setMode("app");
};

// ==================== playDemo ====================
const playDemo = async (inst) => {
  // Останавливаем предыдущее демо (заглушаем и забываем)
  if (demoRef.current && demoRef.current.masterGain) {
    demoRef.current.masterGain.gain.value = 0;
  }
  demoRef.current = null;

  if (Tone.context.state !== 'running') {
    await Tone.start();
  }

  setDemoPlaying(inst);
  setTimeout(() => setDemoPlaying(null), 800);

  const now = Tone.now();
  let synth;
  let masterGain;
  let bitCrusher = null;
  let guitarBoost = null;
  let notes = [];

  masterGain = new Tone.Gain(0.5).toDestination();

  switch (inst) {
    case "guitar":
      synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 2,
        modulationIndex: 6,
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.8 },
        modulationEnvelope: { attack: 0.05, decay: 0.1, sustain: 1, release: 0.5 }
      });
      guitarBoost = new Tone.Gain(2.0);
      synth.connect(guitarBoost);
      guitarBoost.connect(masterGain);
      notes = [
        { note: "C4", time: now + 0.0, duration: 0.4 },
        { note: "D4", time: now + 0.5, duration: 0.4 },
        { note: "E4", time: now + 1.0, duration: 0.5 },
        { note: "G4", time: now + 1.6, duration: 0.6 },
        { note: "C5", time: now + 2.3, duration: 0.8 }
      ];
      break;

    case "synth":
      synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.4, release: 1.0 }
      });
      synth.connect(masterGain);
      notes = [
        { note: "D4", time: now + 0.0, duration: 0.3 },
        { note: "F#4", time: now + 0.4, duration: 0.3 },
        { note: "A4", time: now + 0.8, duration: 0.6 },
        { note: "D5", time: now + 1.3, duration: 0.5 },
        { note: "E5", time: now + 1.9, duration: 0.7 }
      ];
      break;

    case "bass":
      synth = new Tone.MonoSynth({
        oscillator: { type: "fatsawtooth", count: 2, spread: 10 },
        envelope: { attack: 0.02, decay: 0.2, sustain: 0.6, release: 0.5 }
      });
      synth.connect(masterGain);
      notes = [
        { note: "E2", time: now + 0.0, duration: 0.5 },
        { note: "G2", time: now + 0.6, duration: 0.5 },
        { note: "A2", time: now + 1.2, duration: 0.6 },
        { note: "B2", time: now + 1.9, duration: 0.6 },
        { note: "E3", time: now + 2.6, duration: 0.8 }
      ];
      break;

    case "chip":
      synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "square" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.2, release: 0.1 }
      });
      bitCrusher = new Tone.BitCrusher(4);
      synth.connect(bitCrusher);
      bitCrusher.connect(masterGain);
      notes = [
        { note: "C5", time: now + 0.0, duration: 0.1 },
        { note: "D5", time: now + 0.2, duration: 0.1 },
        { note: "E5", time: now + 0.4, duration: 0.2 },
        { note: "G5", time: now + 0.7, duration: 0.2 },
        { note: "C6", time: now + 1.0, duration: 0.3 }
      ];
      break;

    case "drum":
      const drumMembrane = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 4,
        oscillator: { type: "sine" },
        envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 }
      }).connect(masterGain);

      const drumNoise = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }
      }).connect(masterGain);

      demoRef.current = { synth: { membrane: drumMembrane, noise: drumNoise }, masterGain };

      drumMembrane.triggerAttackRelease("C2", "8n", now);
      drumNoise.triggerAttackRelease("8n", now + 0.3);
      drumMembrane.triggerAttackRelease("D2", "8n", now + 0.6);
      drumNoise.triggerAttackRelease("8n", now + 0.9);
      drumNoise.envelope.decay = 0.05;
      drumNoise.triggerAttackRelease("16n", now + 1.1);
      drumNoise.envelope.decay = 0.2;
      drumMembrane.triggerAttackRelease("E2", "8n", now + 1.4);
      drumNoise.triggerAttackRelease("8n", now + 1.7);
      drumNoise.envelope.decay = 0.05;
      drumNoise.triggerAttackRelease("16n", now + 1.9);
      drumNoise.triggerAttackRelease("16n", now + 2.0);
      return; // выходим, чтобы не создавать notes

    default:
      return;
  }

  // Общий код для инструментов, кроме DRUM
  demoRef.current = { synth, masterGain, bitCrusher, extra: [guitarBoost].filter(Boolean) };
  notes.forEach(n => {
    synth.triggerAttackRelease(n.note, n.duration, n.time);
  });
  setTimeout(() => {
    // Через 3.5 секунды забываем о демо, если оно ещё активно
    if (demoRef.current && demoRef.current.synth === synth) {
      demoRef.current = null;
    }
  }, 3500);
};
  // Единые синтезаторы для каждого типа эффекта (переиспользование)
// Единые синтезаторы для каждого типа эффекта (переиспользование)
const effectSynths = {};

const uiSounds = {
  getSynth: (effectName) => {
    if (effectSynths[effectName]) return effectSynths[effectName];
    let synth;
    switch (effectName) {
      case 'click':
        synth = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 } });
        break;
      case 'pop':
        synth = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.04 } });
        break;
      case 'pixel':
        synth = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 } });
        break;
      case 'boom':
        synth = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.2 } });
        break;
      case 'chirp':
        synth = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.002, decay: 0.1, sustain: 0, release: 0.05 } });
        break;
      default: return null;
    }
    effectSynths[effectName] = synth;
    if (window.__fxMasterGain) {
      synth.connect(window.__fxMasterGain);
    } else {
      synth.toDestination();
    }
    return synth;
  },
  playEffect: (effectName, velocity = 1) => {
    if (!uiSoundsEnabled) return;
    const synth = uiSounds.getSynth(effectName);
    if (!synth) return;
    let freq;
    let duration = '32n';
    switch (effectName) {
      case 'click': freq = 1047; break;
      case 'pop':   freq = 784;  break;
      case 'pixel': freq = 659;  duration = '16n'; break;
      case 'boom':  freq = 65;   duration = '8n';  break;
      case 'chirp': freq = 880;  break;
      default: return;
    }
    // Генерируем уникальный микро-сдвиг (0 .. 0.005 секунды)
    const shift = (performance.now() % 100) * 0.0001;
    const time = Tone.now() + 0.01 + shift;
    synth.triggerAttackRelease(freq, duration, time, velocity);
  },
  playClick: () => { if (uiSoundsEnabled) uiSounds.playEffect('click', 1); },
  playPop: () => { if (uiSoundsEnabled) uiSounds.playEffect('pop', 1); },
  playPixel: () => { if (uiSoundsEnabled) uiSounds.playEffect('pixel', 1); },
  playBoom: () => { if (uiSoundsEnabled) uiSounds.playEffect('boom', 1); },
  playChirp: () => { if (uiSoundsEnabled) uiSounds.playEffect('chirp', 1); }
};
  const STEP_WIDTH = 20;
  const STEP_TIME = useMemo(() => 60 / bpm / 4, [bpm]);
  const FOLLOW_OFFSET = 150;
  const OPEN_STRINGS = [41.20, 55.00, 82.41, 110.00, 146.83, 196.00, 246.94, 329.63];
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
    const handleGroupDragStart = (e, block) => {
      setIsGroupDragging(true);
      const initialPositions = new Map();
      tracks[instrument].forEach(b => {
        if (selectedBlockIds.has(b.id)) {
          initialPositions.set(b.id, { x: b.x, string: b.string });
        }
      });
      if (initialPositions.size === 0) return;
    
      // Находим самый левый блок и самую верхнюю струну (для единого смещения)
      const minX = Math.min(...Array.from(initialPositions.values()).map(p => p.x));
      const minString = Math.min(...Array.from(initialPositions.values()).map(p => p.string));
    
      const startX = e.clientX;
      const startY = e.clientY;
      const offsetX = startX - minX;
      const offsetY = startY - (minString * 60); // 60px – высота строки
    
      setDragStartInfo({
        startX,
        startY,
        offsetX,
        offsetY,
        initialBlocks: initialPositions
      });
    };
    const handleGroupDragMove = (e) => {
      if (!isGroupDragging || !dragStartInfo) return;
    
      const deltaX = e.clientX - dragStartInfo.startX;
      const deltaY = e.clientY - dragStartInfo.startY;
    
      setTracks(prev => ({
        ...prev,
        [instrument]: prev[instrument].map(b => {
          if (dragStartInfo.initialBlocks.has(b.id)) {
            const initial = dragStartInfo.initialBlocks.get(b.id);
            let newX = initial.x + deltaX;
            newX = Math.round(newX / STEP_WIDTH) * STEP_WIDTH;
            newX = Math.max(0, newX);
            let newString = initial.string + Math.round(deltaY / 60);
            newString = Math.max(0, Math.min(strings.length - 1, newString));
            return { ...b, x: newX, string: newString };
          }
          return b;
        })
      }));
    };
  useEffect(() => {
    const handleMove = (e) => {
      if (!isDraggingRef.current) return;
      if (isGroupDragging) handleGroupDragMove(e);
         autoScrollIfNeeded(e.clientX);
    };
  
    const handleUp = () => {
      isDraggingRef.current = false;
      scrollSpeedRef.current = 0;
      setIsGroupDragging(false);
    
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
  },[isGroupDragging, dragStartInfo, instrument, tracks, selectedBlockIds]);
  useEffect(() => {
    const grid = scrollRef.current;
    if (!grid) return;

    const handleWheel = (e) => {
      // 1. Если мы над кубиком (нотой)
      if (hoveredBlockId) {
        e.preventDefault();

        setTracks(prev => {
          // ИСПРАВЛЕННАЯ ПРОВЕРКА: используем .has(), так как это Set
          const isSelected = selectedBlockIds.has(hoveredBlockId);
          if (!isSelected) return prev;

          return {
            ...prev,
            [instrument]: prev[instrument].map((it) => {
              if (it.id === hoveredBlockId) {
                // А) ЕСЛИ ЗАЖАТ ALT — МЕНЯЕМ ГРОМКОСТЬ (VELOCITY)
                if (e.altKey) {
                  const volDelta = e.deltaY > 0 ? -0.1 : 0.1;
                  const currentVel = it.velocity ?? 1;
                  const newVelocity = Math.max(0.1, Math.min(1.5, currentVel + volDelta));
                  return { ...it, velocity: newVelocity };
                } 
                // Б) ИНАЧЕ — МЕНЯЕМ ЛАД (ТОН / FRET)
                else {
                  const fretDelta = e.deltaY > 0 ? -1 : 1;
                  const newFret = Math.max(0, (it.fret || 0) + fretDelta);
                  return { ...it, fret: newFret };
                }
              }
              return it;
            })
          };
        });
        return;
      }

      // 2. Если мы просто крутим колесо над пустой сеткой — скроллим
      if (!hoveredBlockId) {
        e.preventDefault();
        grid.scrollTo({
          left: grid.scrollLeft + (e.deltaY * 2),
          behavior: 'smooth'
        });
      }
    };

    grid.addEventListener("wheel", handleWheel, { passive: false });
    return () => grid.removeEventListener("wheel", handleWheel);

    // ВАЖНО: массив зависимостей должен совпадать с переменными выше
  }, [instrument, hoveredBlockId, selectedBlockIds]);
  const getColor = (fret) => {
    const colors = ["#FF4D4D", "#FF7A4D", "#FFB84D", "#FFD84D", "#E6FF4D", "#A8FF4D", "#4DFF88", "#4DFFD2", "#4DC3FF", "#4D88FF", "#7A4DFF", "#C84DFF", "#FF4DA6"];
    return colors[fret % colors.length];
  };
  // --- AUDIO INIT ---
useEffect(() => {
  // 1. Мастер-компрессор (идёт в самый конец цепи)
  const masterCompressor = new Tone.Compressor({
    threshold: -12,
    ratio: 3,
    attack: 0.01,
    release: 0.2,
    knee: 5
  }).toDestination(); // отправляем на колонки

  // 2. Лимитер для защиты от перегрузки
  const limiter = new Tone.Limiter(-3).connect(masterCompressor);

  // 3. Мастер-гейн (общая громкость)
  const master = new Tone.Gain(0.9).connect(limiter);
  masterGainRef.current = master;
  const meter = new Tone.Meter();
  master.connect(meter);
  meterRef.current = meter; 
  // Общий узел для громкости спецэффектов (не зависит от инструментов)
const fxMasterGain = new Tone.Gain(fxVolume);
fxMasterGain.connect(master);
window.__fxMasterGain = fxMasterGain;

  // 4. Recorder
  recorderRef.current = new Tone.Recorder();
  master.connect(recorderRef.current);

  // ---------- SIDECHAIN KICK (невидимый ритмический импульс) ----------
  const kickNoise = new Tone.Noise("brown");
  const kickFilter = new Tone.Filter(80, "lowpass");
  const kickEnv = new Tone.Gain(0);
  kickNoise.connect(kickFilter);
  kickFilter.connect(kickEnv);
  kickEnv.gain.value = 0; // не слышен в мастере

  // Компрессор для баса с sidechain-входом
  const bassSidechainComp = new Tone.Compressor({
    threshold: -20,
    ratio: 4,
    attack: 0.01,
    release: 0.2,
    knee: 5
  });

  // Подключаем источник импульса к sidechain-входу компрессора
  kickEnv.connect(bassSidechainComp);

  // Функция короткого "удара"
  const triggerKick = () => {
    kickEnv.gain.setTargetAtTime(0.8, Tone.now(), 0.005);
    kickEnv.gain.setTargetAtTime(0, Tone.now() + 0.05, 0.05);
  };

  // Лупер, тикающий каждую четверть
  const kickLoop = new Tone.Loop(() => triggerKick(), "4n");

  // Сохраняем для управления из других мест (временное решение)
  window.__sidechain = { kickLoop, bassSidechainComp };

  // 5. Создаём инструменты
  ["guitar", "synth", "drum", "bass", "chip"].forEach((type) => {
    let volume = volumes[type];
    let panValue = type === 'guitar' ? -0.4 : (type === 'synth' ? 0.4 : (type === 'chip' ? 0.2 : (type === 'drum' ? 0 : 0)));
    let cutoffFreq = type === 'bass' ? 1200 : (type === 'guitar' ? 3500 : (type === 'synth' ? 6000 : (type === 'chip' ? 10000 : 8000)));
  
    const gain = new Tone.Gain(volume).connect(master);
    const panner = new Tone.Panner(panValue).connect(gain);
    const filter = new Tone.Filter(cutoffFreq, "lowpass");
  
    const chorus = new Tone.Chorus(2, 1.5, 0.3).start();
    const reverb = new Tone.Reverb({ decay: 1.2, wet: 1 });
    const chorusGain = new Tone.Gain(0);
    const reverbGain = new Tone.Gain(0);
  
    fxRef.current[type] = { chorus, reverb, chorusGain, reverbGain };
  
    filter.connect(panner);
    filter.connect(chorus);
    chorus.connect(chorusGain);
    chorusGain.connect(panner);
    filter.connect(reverb);
    reverb.connect(reverbGain);
    reverbGain.connect(panner);
  
    gainsRef.current[type] = gain;
    filtersRef.current[type] = filter;
  
    // Создаём синтезаторы
    if (type === "bass") {
      const bassSynth = new Tone.MonoSynth({
        oscillator: { type: "fatsawtooth", count: 3, spread: 20 },
        envelope: { attack: 0.03, decay: 0.4, sustain: 0.8, release: 0.6 }
      });
      bassSynth.connect(bassSidechainComp);
      bassSidechainComp.connect(filter);
      synthsRef.current[type] = bassSynth;
    } else if (type === "guitar") {
      synthsRef.current[type] = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 2, modulationIndex: 10, oscillator: { type: "triangle" },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 1.5 },
        modulationEnvelope: { attack: 0.1, decay: 0.2, sustain: 1, release: 0.8 }
      }).connect(filter);
    } else if (type === "drum") {
      // Создаём пул из 4 мембранных синтезаторов и 4 шумовых
      const membranePool = [];
      const noisePool = [];
      for (let i = 0; i < 8; i++) {
        membranePool.push(new Tone.MembraneSynth({
          pitchDecay: 0.05,
          octaves: 4,
          oscillator: { type: "sine" },
          envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 }
        }).connect(filter));
        
        noisePool.push(new Tone.NoiseSynth({
          noise: { type: "white" },
          envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }
        }).connect(filter));
      }
      synthsRef.current[type] = { membranePool, noisePool };
    }
    else if (type === "chip") {
      const chipSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "square" },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0.1, release: 0.05 }
      });
      const bitCrusher = new Tone.BitCrusher(8);
      if (bitCrusher.frequency) bitCrusher.frequency.value = 8000;
      chipSynth.connect(bitCrusher);
      bitCrusher.connect(filter);
      synthsRef.current[type] = chipSynth;
    } else { // synth (по умолчанию)
      synthsRef.current[type] = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.15, decay: 0.2, sustain: 0.4, release: 2.0 }
      }).connect(filter);
    }
  });

  // Cleanup function (очистка при размонтировании компонента)
  return () => {
    if (window.__fxMasterGain) {
      window.__fxMasterGain.dispose();
      Object.values(effectSynths).forEach(synth => synth?.dispose());
      delete window.__fxMasterGain;
    }
    // Отключаем и уничтожаем все узлы
    masterGainRef.current?.dispose();
   // Уничтожаем все синтезаторы, включая пулы DRUM
Object.values(synthsRef.current).forEach(item => {
  if (!item) return;
  if (item.membranePool && item.noisePool) {
    item.membranePool.forEach(s => s.dispose());
    item.noisePool.forEach(s => s.dispose());
  } else if (typeof item.dispose === 'function') {
    item.dispose();
  }
});
    Object.values(filtersRef.current).forEach(f => f?.dispose());
    Object.values(gainsRef.current).forEach(g => g?.dispose());
    Object.values(fxRef.current).forEach(fx => {
      fx.chorus?.dispose();
      fx.reverb?.dispose();
      fx.chorusGain?.dispose();
      fx.reverbGain?.dispose();
    });
    kickNoise?.dispose();
    kickFilter?.dispose();
    kickEnv?.dispose();
    bassSidechainComp?.dispose();
    kickLoop?.dispose();
    delete window.__sidechain;
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
  useEffect(() => {
    const loadFromUrl = async () => {
      // 1. Ищем ID проекта в ссылке
      const params = new URLSearchParams(window.location.search);
      const projectId = params.get('project');
  
      if (projectId) {
        console.log("Обнаружен ID проекта в ссылке, загружаю...");
        
        // 2. Достаем данные из Supabase
        const { data, error } = await supabase
          .from('projects')
          .select('grid_data')
          .eq('id', projectId)
          .single();
  
        if (error) {
          console.error('Ошибка загрузки по ссылке:', error.message);
          return;
        }
  
        if (data && data.grid_data) {
          const p = data.grid_data;
          
          // 3. Загружаем всё в плеер (убедись, что эти функции у тебя так называются)
          if (p.bpm) setBpm(p.bpm);
          if (p.tracks) setTracks(p.tracks);
          if (p.filters) setFilters(p.filters);
          if (p.fx) setFx(p.fx);
          
          alert("Проект успешно загружен по вашей ссылке! Нажмите PLAY.");
        }
      }
    };
  
    loadFromUrl();
  }, []);
  useEffect(() => {
    Object.entries(volumes).forEach(([type, vol]) => {
      const gain = gainsRef.current[type];
      if (gain) {
        gain.gain.rampTo(vol, 0.05);
      }
    });
  }, [volumes]);
  useEffect(() => {
    if (isPlaying) {
      // Перезапускаем движок с новым темпом
      cancelAnimationFrame(animationRef.current);
      startEngine();
    }
  }, [bpm]);
  useEffect(() => {
    if (window.__fxMasterGain) {
      window.__fxMasterGain.gain.rampTo(fxVolume, 0.05);
    }
  }, [fxVolume]);
  useEffect(() => {
    loopStartRef.current = loopStart;
    loopEndRef.current = loopEnd;
  }, [loopStart, loopEnd]);
  const handleShare = async () => {
    try {
      // Собираем все данные проекта (как в твоем handleSaveProject)
      const projectData = { 
        tracks: tracks, 
        bpm: bpm, 
        filters: filters, 
        fx: fx 
      };
  
      const { data, error } = await supabase
        .from('projects')
        .insert([
          { 
            user_email: user?.email || 'guest', 
            tempo: bpm, 
            grid_data: projectData // сохраняем весь объект со всеми настройками
          }
        ])
        .select();
  
      if (error) throw error;
  
      if (data && data[0]) {
        // Создаем ссылку
        const shareUrl = `${window.location.origin}?project=${data[0].id}`;
        
        // Копируем в буфер
        await navigator.clipboard.writeText(shareUrl);
        alert('Ссылка на твой трек скопирована! Можно отправлять друзьям.');
      }
    } catch (error) {
      console.error('Ошибка Supabase:', error.message);
      alert('Не удалось создать ссылку: ' + error.message);
    }
  };
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
    const startBlockX = block.x;
    const offsetX = startX - startBlockX; // смещение курсора внутри блока
  
    const onMove = (moveEvent) => {
      const currentX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0].clientX);
      // новое положение левого края = текущий курсор минус смещение
      let rawX = currentX - offsetX;
      // округление до сетки (20px)
      let newX = Math.round(rawX / STEP_WIDTH) * STEP_WIDTH;
      newX = Math.max(0, newX);
  
      const rect = scrollRef.current.getBoundingClientRect();
      const currentY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0].clientY);
      const relativeY = currentY - rect.top;
      let newString = Math.floor(relativeY / 60);
      newString = Math.max(0, Math.min(strings.length - 1, newString));
  
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
    // Не перетаскиваем, если клик был по блоку (ноте)
    if (e.target.closest(".block")) return;
    
    e.preventDefault();
    const grid = scrollRef.current;
    const startClientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
  
    const onMove = (moveEvent) => {
      const currentClientX = moveEvent.type.includes('touch') ? moveEvent.touches[0].clientX : moveEvent.clientX;
      
      const rect = grid.getBoundingClientRect();
      const xInView = currentClientX - rect.left;
      const xInGrid = xInView + grid.scrollLeft;
      const boundedX = Math.max(0, xInGrid);
      playheadXRef.current = boundedX;
      // Если мы в режиме установки лупа (начало установлено, конец ещё нет)
      if (loopStart !== 0 && loopEnd === 0) {
      setPreviewLoopEnd(boundedX);
      }
      
      if (playheadRef.current) playheadRef.current.style.transform = `translateX(${boundedX}px)`;
      
      const edgeThreshold = 50;
      const scrollSpeed = 15;
      if (xInView > rect.width - edgeThreshold) grid.scrollLeft += scrollSpeed;
      else if (xInView < edgeThreshold) grid.scrollLeft -= scrollSpeed;
      
      const newTime = (boundedX / STEP_WIDTH) * (60 / bpm / 4);
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
    const lastStartTimeMap = new Map();
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const loop = () => {
      const now = Tone.now();
      const stepTime = 60 / bpm / 4;
      let elapsed = now - startTimeRef.current;
      const allBlocks = Object.values(tracks).flat();
  
      // Глобальная логика окончания всего трека (только если есть блоки и луп выключен)
      if (allBlocks.length > 0) {
        const lastBlockEndPX = Math.max(...allBlocks.map(b => b.x + b.length));
        const globalLoopEndTime = (lastBlockEndPX / STEP_WIDTH) * stepTime;
        
        // Отображение времени: такт / доля / секунды (всегда)
        const elapsedSeconds = elapsed;
        const secondsPerBeat = 60 / bpm;
        const beats = elapsedSeconds / secondsPerBeat;
        const currentBar = Math.floor(beats / 4) + 1;
        const currentBeat = (Math.floor(beats) % 4) + 1;
        setCurrentPosition({
          bar: currentBar,
          beat: currentBeat,
          seconds: elapsedSeconds
        });
  
        // Сброс трека только если луп НЕ активен
        if (!loopActive && elapsed >= globalLoopEndTime) {
          startTimeRef.current = now;
          pauseOffsetRef.current = 0;
          elapsed = 0;
          triggeredRef.current.clear();
        }
      }
  
      // Логика лупа
      if (loopActive && loopStartRef.current !== 0 && loopEndRef.current !== 0 && loopEndRef.current > loopStartRef.current) {
        const loopStartTime = (loopStartRef.current / STEP_WIDTH) * stepTime;
        const loopEndTime = (loopEndRef.current / STEP_WIDTH) * stepTime;
        const delta = loopEndTime - loopStartTime;
        if (elapsed >= loopEndTime && delta > 0) {
          startTimeRef.current += delta;
          elapsed = loopStartTime;
          triggeredRef.current.clear();
        }
      }
  
      // Обработка нот
      Object.entries(tracks).forEach(([type, blocks]) => {
        if (!filtersRef.current[type]) return;
        blocks.forEach((b) => {
          const startStep = Math.floor(b.x / STEP_WIDTH);
          const durationSteps = Math.max(1, Math.floor(b.length / STEP_WIDTH));
          const startTime = startStep * stepTime;
          const duration = durationSteps * stepTime;
          const key = `${type}_${b.id}_${startStep}`;
          if (elapsed >= startTime && elapsed <= startTime + duration && !triggeredRef.current.has(key)) {
            const freq = OPEN_STRINGS[b.string] * Math.pow(2, b.fret / 12);
            const synth = synthsRef.current[type];
            const velocity = Math.min(1, Math.max(0, b.velocity ?? 1));
  
            if (type === "drum") {
              const pools = synth; // { membranePool, noisePool }
              if (!pools || !pools.membranePool) return;
              const durationSec = duration;
              const velocityAdjusted = Math.min(1, velocity * 1.2);
              const index = Math.abs(b.id) % pools.membranePool.length;
              const membraneSynth = pools.membranePool[index];
              const noiseSynth = pools.noisePool[index];
              const drumIdx = (b.fret % 20) + (b.string % 3) * 20;
            
              // Определяем, какой синтезатор будет использован
              let targetSynth = null;
              let isMembrane = true;
              const typeIdx = drumIdx % 20;
              if (typeIdx >= 0 && typeIdx <= 7) {
                targetSynth = membraneSynth;
                isMembrane = true;
              } else {
                targetSynth = noiseSynth;
                isMembrane = false;
              }
              if (!targetSynth) return;
            
              // Корректируем время старта
              let startTime = now + 0.01;
              const lastTime = lastStartTimeMap.get(targetSynth);
              if (lastTime !== undefined && startTime <= lastTime) {
                startTime = lastTime + 0.001;
              }
              lastStartTimeMap.set(targetSynth, startTime);
            
              // Сброс параметров по умолчанию
              if (!isMembrane) {
                noiseSynth.noise.type = "white";
                noiseSynth.envelope.decay = 0.2;
              } else {
                membraneSynth.pitchDecay = 0.05;
              }
            
              switch (typeIdx) {
                case 0: membraneSynth.triggerAttackRelease("C2", durationSec, startTime, velocityAdjusted); break;
                case 1: membraneSynth.triggerAttackRelease("D2", durationSec, startTime, velocityAdjusted); break;
                case 2: membraneSynth.triggerAttackRelease("E2", durationSec, startTime, velocityAdjusted); break;
                case 3: membraneSynth.triggerAttackRelease("F2", durationSec, startTime, velocityAdjusted); break;
                case 4: membraneSynth.triggerAttackRelease("G2", durationSec, startTime, velocityAdjusted); break;
                case 5: membraneSynth.triggerAttackRelease("A2", durationSec, startTime, velocityAdjusted); break;
                case 6: membraneSynth.triggerAttackRelease("B2", durationSec, startTime, velocityAdjusted); break;
                case 7: membraneSynth.triggerAttackRelease("C3", durationSec, startTime, velocityAdjusted); break;
                case 8: noiseSynth.envelope.decay = 0.12; noiseSynth.triggerAttackRelease(durationSec, startTime, velocityAdjusted); break;
                case 9: noiseSynth.envelope.decay = 0.18; noiseSynth.triggerAttackRelease(durationSec, startTime, velocityAdjusted); break;
                case 10: noiseSynth.envelope.decay = 0.25; noiseSynth.triggerAttackRelease(durationSec, startTime, velocityAdjusted); break;
                case 11: noiseSynth.noise.type = "pink"; noiseSynth.envelope.decay = 0.15; noiseSynth.triggerAttackRelease(durationSec, startTime, velocityAdjusted); break;
                case 12: noiseSynth.envelope.decay = 0.05; noiseSynth.triggerAttackRelease(durationSec, startTime, velocityAdjusted); break;
                case 13: noiseSynth.envelope.decay = 0.04; noiseSynth.triggerAttackRelease(durationSec, startTime, velocityAdjusted); break;
                case 14: noiseSynth.envelope.decay = 0.06; noiseSynth.triggerAttackRelease(durationSec, startTime, velocityAdjusted); break;
                case 15: noiseSynth.envelope.decay = 0.08; noiseSynth.triggerAttackRelease(durationSec, startTime, velocityAdjusted * 0.9); break;
                case 16: noiseSynth.envelope.decay = 0.10; noiseSynth.triggerAttackRelease(durationSec, startTime, velocityAdjusted * 0.85); break;
                case 17: noiseSynth.noise.type = "brown"; noiseSynth.envelope.decay = 0.30; noiseSynth.triggerAttackRelease(durationSec, startTime, velocityAdjusted * 0.7); break;
                case 18: noiseSynth.noise.type = "white"; noiseSynth.envelope.decay = 0.02; noiseSynth.triggerAttackRelease(durationSec, startTime, velocityAdjusted * 0.6); break;
                case 19: noiseSynth.noise.type = "pink"; noiseSynth.envelope.decay = 0.25; noiseSynth.triggerAttackRelease(durationSec, startTime, velocityAdjusted * 0.8); break;
                default: membraneSynth.triggerAttackRelease("C2", durationSec, startTime, velocityAdjusted);
              }
            } else if (type === "bass") {
              synth.triggerAttack(freq, now + 0.01, velocity);
              synth.triggerRelease(now + 0.01 + duration);
            } else {
              synth.triggerAttackRelease(freq, duration, now + 0.01, velocity);
            }
  
            triggeredRef.current.add(key);
            if (b.effect && uiSoundsEnabled) {
              uiSounds.playEffect(b.effect, velocity);
            }
          }
        });
      });
  
      const x = (elapsed / stepTime) * STEP_WIDTH;
      playheadXRef.current = x;
  
      const currentStep = Math.floor(x / STEP_WIDTH);
      if (activeStep !== currentStep) setActiveStep(currentStep);
  
      if (playheadRef.current) playheadRef.current.style.transform = `translateX(${x}px)`;
  
      if (scrollRef.current) {
        const target = Math.max(0, x - FOLLOW_OFFSET);
        scrollRef.current.scrollLeft += (target - scrollRef.current.scrollLeft) * 0.08;
      }
  
      if (meterRef.current) {
        const level = meterRef.current.getValue();
        let normalized = (level + 60) / 60;
        normalized = Math.min(1, Math.max(0, normalized));
        setMasterVolume(normalized);
      }
      if (meterRef.current) {
        const level = meterRef.current.getValue();
        let normalized = (level + 60) / 60;
        normalized = Math.min(1, Math.max(0, normalized));
        setMasterVolume(normalized);
        // Мгновенная амплитуда для волны (от 5 до 35)
        setWaveAmp(5 + normalized * 30);
      }
  
      animationRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

const handleTogglePlay = async () => {
  if (Tone.context.state !== 'running') {
    await Tone.start();
    console.log("Audio Context started!");
  }
  
  if (isPlaying) {
    // Остановка воспроизведения
    const now = Tone.now();
    cancelAnimationFrame(animationRef.current);
    pauseOffsetRef.current = now - startTimeRef.current; 
    setIsPlaying(false);
    
    // Сбрасываем VU-метр
    setMasterVolume(0);
    
    // Останавливаем sidechain-лупер
    if (window.__sidechain?.kickLoop) {
      window.__sidechain.kickLoop.stop();
    }
    
    // Глушим все синтезаторы
    Object.values(synthsRef.current).forEach(s => { 
      try { 
        if (s.releaseAll) s.releaseAll(); 
        else if (s.triggerRelease) s.triggerRelease(); 
      } catch(e) {} 
    });
  } else {
    // Запуск воспроизведения
    await Tone.start();
    const now = Tone.now();
    startTimeRef.current = now - pauseOffsetRef.current;
    triggeredRef.current.clear();
    setIsPlaying(true);
    
    // Запускаем sidechain-лупер
    if (window.__sidechain?.kickLoop) {
      window.__sidechain.kickLoop.start(0);
    }
    
    startEngine();
  }
};

const handleStop = () => {
  cancelAnimationFrame(animationRef.current);
  pauseOffsetRef.current = 0;
  startTimeRef.current = Tone.now();
  triggeredRef.current.clear();
  setIsPlaying(false);
  
  // Сбрасываем VU-метр
  setMasterVolume(0);
  
  // Останавливаем sidechain-лупер
  if (window.__sidechain?.kickLoop) window.__sidechain.kickLoop.stop();
  
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
    // Останавливаем воспроизведение
    if (isPlaying) {
      cancelAnimationFrame(animationRef.current);
      setIsPlaying(false);
    }
    // Останавливаем sidechain-лупер
    if (window.__sidechain?.kickLoop) window.__sidechain.kickLoop.stop();
    // Глушим синтезаторы
    Object.values(synthsRef.current).forEach(s => {
      try { s.releaseAll?.(); s.triggerRelease?.(); } catch(e) {}
    });
    // Сбрасываем состояние времени
    pauseOffsetRef.current = 0;
    startTimeRef.current = Tone.now();
    triggeredRef.current.clear();
    if (playheadRef.current) playheadRef.current.style.transform = "translateX(0px)";
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
    // Очищаем треки
    setTracks({ guitar: [], synth: [], drum: [], bass: [], chip: [] });
    // Сбрасываем все настройки до заводских
    setFilters(defaultFilters);
    setFx(defaultFx);
    setVolumes(defaultVolumes);
    setBpm(120);
    // Снимаем выделение блоков
    setSelectedBlockIds(new Set());
    setMasterVolume(0);
    setCurrentPosition({ bar: 1, beat: 1, seconds: 0 });
    setLoopStart(0);
    setLoopEnd(0);
    setPreviewLoopEnd(0);
    setLoopActive(false);
    // возможно, сбросить playheadXRef.current = 0;
    playheadXRef.current = 0;
    // также перезаписать ref-ы
    loopStartRef.current = 0;
    loopEndRef.current = 0;
  };
  // --- ИСПРАВЛЕННОЕ КОПИРОВАНИЕ И ВСТАВКА (ПОСЛЕДОВАТЕЛЬНО) ---

const handleSelectBlock = (e, block, instName) => {
  e.stopPropagation();
  if (e.ctrlKey || e.metaKey) {
    setSelectedBlockIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(block.id)) newSet.delete(block.id);
      else newSet.add(block.id);
      return newSet;
    });
  } else {
    setSelectedBlockIds(new Set([block.id]));
  }
};

const copySelectedBlocks = () => {
  const blocksToCopy = [];
  for (const [inst, blocks] of Object.entries(tracks)) {
    blocks.forEach(block => {
      if (selectedBlockIds.has(block.id)) {
        blocksToCopy.push({
          instrument: inst,
          block: { ...block }
        });
      }
    });
  }
  copiedBlocksRef.current = blocksToCopy.sort((a, b) => a.block.x - b.block.x);
  console.log("Скопировано:", copiedBlocksRef.current.length);
};

const pasteBlocks = () => {
  if (copiedBlocksRef.current.length === 0) return;
  const minX = Math.min(...copiedBlocksRef.current.map(i => i.block.x));
  const maxEndX = Math.max(...copiedBlocksRef.current.map(i => i.block.x + i.block.length));
  const offset = (maxEndX - minX) || STEP_WIDTH; // исправлено: || вместо |
  const nextClipboard = copiedBlocksRef.current.map(item => ({
    instrument: item.instrument,
    block: {
      ...item.block,
      id: Date.now() + Math.random(),
      x: item.block.x + offset
    }
  }));
  setTracks(prev => {
    const updated = { ...prev };
    nextClipboard.forEach(({ instrument: inst, block: newBlock }) => {
      updated[inst] = [...(updated[inst] || []), newBlock];
    });
    return updated;
  });
  copiedBlocksRef.current = nextClipboard;
  console.log("Вставлено последовательно");
};

const deleteSelectedBlocks = () => {
  if (selectedBlockIds.size === 0) return;
  setTracks(prev => {
    const updated = { ...prev };
    Object.keys(updated).forEach(inst => {
      updated[inst] = updated[inst].filter(block => !selectedBlockIds.has(block.id));
    });
    return updated;
  });
  setSelectedBlockIds(new Set());
  console.log("Selected blocks deleted");
 };
  // Горячие клавиши с поддержкой русской раскладки и Chrome
 useEffect(() => {
  const handleKeyDown = (e) => {
    // 1. Игнорируем в инпутах
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // 2. Удаление (Delete / Backspace)
    if (e.code === 'Delete' || e.code === 'Backspace') {
      if (selectedBlockIds.size > 0) {
        e.preventDefault();
        deleteSelectedBlocks();
      }
      return;
    }

    // 3. Пробел – Play / Pause
    if (e.code === 'Space') {
      e.preventDefault();
      e.stopPropagation();
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
        document.activeElement.blur();
      }
      handleTogglePlay();  // ← основная функция play/pause
      return;
    }
    // 4. Клавиша S – STOP (остановка с возвратом в начало)
    if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleStop();
      return;
    }

    // 4. Копирование / Вставка (Ctrl+C / Ctrl+V)
    const isC = e.key === 'c' || e.key === 'с' || e.code === 'KeyC';
    const isV = e.key === 'v' || e.key === 'м' || e.code === 'KeyV';

    if ((e.ctrlKey || e.metaKey) && isC) {
      e.preventDefault();
      copySelectedBlocks();
    } else if ((e.ctrlKey || e.metaKey) && isV) {
      e.preventDefault();
      pasteBlocks();
    }
  };

  window.addEventListener('keydown', handleKeyDown, true);
  return () => window.removeEventListener('keydown', handleKeyDown, true);
}, [selectedBlockIds, handleTogglePlay, copySelectedBlocks, pasteBlocks, deleteSelectedBlocks]);
const clearAllEffects = () => {
  setTracks(prev => {
    const updated = { ...prev };
    Object.keys(updated).forEach(inst => {
      updated[inst] = updated[inst].map(block => {
        // Удаляем поле effect, если оно есть
        if (block.effect) {
          const { effect, ...rest } = block;
          return rest;
        }
        return block;
      });
    });
    return updated;
  });
};
const applyEffectToSelectedBlocks = (effectName) => {
  if (selectedBlockIds.size === 0) return;
  setTracks(prev => {
    const updated = { ...prev };
    Object.keys(updated).forEach(inst => {
      updated[inst] = updated[inst].map(block => {
        if (selectedBlockIds.has(block.id)) {
          return { ...block, effect: effectName };
        }
        return block;
      });
    });
    return updated;
  });
};
const removeAllEffects = () => {
  setTracks(prev => {
    const updated = { ...prev };
    Object.keys(updated).forEach(inst => {
      updated[inst] = updated[inst].map(block => ({ ...block, effect: null }));
    });
    return updated;
  });
};
  const handleLogout = () => {
    localStorage.removeItem("struna_user");
    setUser(null);
    setMode("landing");
  };
  const handleDriveSave = async () => {
    // 1. Берем данные пользователя прямо из хранилища (самый надежный способ)
    const storedUser = JSON.parse(localStorage.getItem("struna_user") || "{}");
    const token = user?.access_token || storedUser?.access_token;

    if (!token) {
      alert("Ошибка: Ключ доступа не найден. Пожалуйста, сделайте Logout и войдите снова.");
      return;
    }

    const projectData = { bpm, tracks, name: "Struna Project " + new Date().toLocaleString() };
    const metadata = { name: `struna_${Date.now()}.json`, mimeType: 'application/json' };

    const file = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file);

    try {
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        alert("✅ Успешно сохранено на Google Диск!");
      } else {
        const errorDetail = await response.json();
        console.error("Детали ошибки Google:", errorDetail);
        alert(`Ошибка: ${errorDetail.error.message}`);
      }
    } catch (err) {
      alert("Ошибка сети или сервера Google");
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
    
        <div className="logo-wrapper">
  <h1 className="neon-struna">STRUNA</h1>
</div>
    
          <p className="tagline" style={{ marginTop: "-50px" }}>UNBOUND SOUND</p>
    
          <button
    // Просто одна строка вместо пяти!
onClick={() => handleStartCreating("guitar")}
    className="start-btn"
>
    START CREATING
</button>
{mode === "landing" && (
  <div style={{
    position: 'fixed',
    top: '25px',
    right: '25px',
    zIndex: 9999,
    cursor: 'pointer',
    background: 'rgba(255, 255, 255, 0.07)',
    padding: '12px',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
  }} 
  onClick={() => login()}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
    e.currentTarget.style.transform = 'scale(1.05)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
    e.currentTarget.style.transform = 'scale(1)';
  }}
  >
    <svg width="20" height="20" viewBox="0 0 48 48">
  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>
  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
</svg>
  </div>
)}
    
    <div className="preview">

{/* GUITAR */}
<div
  className="preview-track guitar"
  onClick={(e) => { e.stopPropagation(); playDemo("guitar"); }}
  onDoubleClick={() => handleStartCreating("guitar")}
>
  <div className="bg-wave">
    <svg viewBox="0 0 200 40" preserveAspectRatio="none">
    <path d="M0,20 C10,5 30,5 40,20 C50,35 70,35 80,20 C90,5 110,5 120,20 C130,35 150,35 160,20 C170,5 190,5 200,20" />
    </svg>
  </div>
  <span>GUITAR</span>
  <div className="wave">
    <span></span><span></span><span></span><span></span><span></span>
  </div>
</div>

{/* SYNTH */}
<div
  className="preview-track synth"
  onClick={(e) => { e.stopPropagation(); playDemo("synth"); }}
  onDoubleClick={() => handleStartCreating("synth")}
>
  <div className="bg-wave">
    <svg viewBox="0 0 200 40" preserveAspectRatio="none">
    <path d="M0,20 C10,5 30,5 40,20 C50,35 70,35 80,20 C90,5 110,5 120,20 C130,35 150,35 160,20 C170,5 190,5 200,20" />
    </svg>
  </div>
  <span>SYNTH</span>
  <div className="wave">
    <span></span><span></span><span></span><span></span><span></span>
  </div>
</div>

{/* DRUM */}
<div
  className="preview-track drum"
  onClick={(e) => { e.stopPropagation(); playDemo("drum"); }}
  onDoubleClick={() => handleStartCreating("drum")}
>
  <div className="bg-wave">
    <svg viewBox="0 0 200 40" preserveAspectRatio="none">
    <path d="M0,20 C10,5 30,5 40,20 C50,35 70,35 80,20 C90,5 110,5 120,20 C130,35 150,35 160,20 C170,5 190,5 200,20" />
    </svg>
  </div>
  <span>DRUM</span>
  <div className="wave">
    <span></span><span></span><span></span><span></span><span></span>
  </div>
</div>

{/* BASS */}
<div
  className="preview-track bass"
  onClick={(e) => { e.stopPropagation(); playDemo("bass"); }}
  onDoubleClick={() => handleStartCreating("bass")}
>
  <div className="bg-wave">
    <svg viewBox="0 0 200 40" preserveAspectRatio="none">
    <path d="M0,20 C10,5 30,5 40,20 C50,35 70,35 80,20 C90,5 110,5 120,20 C130,35 150,35 160,20 C170,5 190,5 200,20" />
    </svg>
  </div>
  <span>BASS</span>
  <div className="wave">
    <span></span><span></span><span></span><span></span><span></span>
  </div>
</div>

{/* CHIP */}
<div
  className="preview-track chip"
  onClick={(e) => { e.stopPropagation(); playDemo("chip"); }}
  onDoubleClick={() => handleStartCreating("chip")}
>
<div className="bg-wave">
  <svg viewBox="0 0 200 40" preserveAspectRatio="none">
  <path d="M0,20 C10,5 30,5 40,20 C50,35 70,35 80,20 C90,5 110,5 120,20 C130,35 150,35 160,20 C170,5 190,5 200,20" />
  </svg>
</div>
  <span>CHIP</span>
  <div className="wave">
    <span></span><span></span><span></span><span></span><span></span>
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
  zIndex: 10,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "6px"
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
  
  <span style={{
    fontSize: "9px",
    color: "#4D88FF",
    opacity: 0.6,
    letterSpacing: "1px",
    textTransform: "uppercase",
    padding: "2px 8px",
    border: "1px solid rgba(77, 136, 255, 0.2)",
    borderRadius: "4px"
  }}>
    Desktop Version Only
  </span>
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
  
      {/* Верхняя панель: EXIT, логотип, SAVE/LOAD/DRIVE/SHARE */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <button 
            onClick={() => {
              stopSound();
              setMode("landing");
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <h1 className="logo" style={{ margin: 0 }}>STRUNA</h1>
              <span style={{ fontSize: "10px", color: "#4D88FF", opacity: 0.7 }}>v1.5.0-BETA</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <UserProfile user={user} onLogout={handleLogout} />
          <button onClick={handleSaveProject} className="save-btn">💾 SAVE</button>
          <button onClick={() => fileInputRef.current.click()} className="load-btn">📂 LOAD</button>
          {user && (
            <button onClick={handleDriveSave} className="save-btn" style={{ background: '#34A853', marginLeft: '10px' }}>
              ▲ DRIVE SAVE
            </button>
          )}
          {user && (
            <button onClick={handleShare} className="save-btn share-btn" style={{ marginLeft: '10px' }}>
              <span>🔗</span> SHARE
            </button>
          )}
          <input type="file" ref={fileInputRef} onChange={handleLoadProject} style={{ display: "none" }} accept=".json" />
        </div>
      </div>
  
      {/* ===== НОВОЕ МЕСТО: БЛОК ВЫБОРА ИНСТРУМЕНТОВ ===== */}
      <div className="instrument-selector">
  {["guitar", "synth", "drum", "bass", "chip"].map((t) => (
    <button
      key={t}
      onClick={() => setInstrument(t)}
      className={`inst-btn ${instrument === t ? "active" : ""} ${t}-btn`}
    >
      <span className="inst-icon">
        {t === "guitar" ? "🎸" : t === "synth" ? "🎹" : t === "drum" ? "🥁" : t === "bass" ? "🔊" : "🕹️"}
      </span>
      <span className="inst-text">{t.toUpperCase()}</span>
      {instrument === t && <div className="active-glow"></div>}
    </button>
  ))}
  <div style={{ display: "flex", gap: "2px", marginLeft: "auto" }}>
    <button
      onClick={() => setIsTempoMasterVisible(!isTempoMasterVisible)}
      className={`inst-btn fx-toggle-btn ${isTempoMasterVisible ? "fx-active" : ""}`}
      style={{ borderRadius: "20px 0 0 20px" }}
    >
      <span className="inst-icon">{isTempoMasterVisible ? "🔽" : "🔼"}</span>
      <span className="inst-text" style={{ fontSize: "9px" }}>INFO</span>
      {isTempoMasterVisible && <div className="active-glow"></div>}
    </button>
    <button
      onClick={() => setShowFX(!showFX)}
      className={`inst-btn fx-toggle-btn ${showFX ? "fx-active" : ""}`}
      style={{ borderRadius: "0 20px 20px 0" }}
    >
      <span className="inst-icon">⚙️</span>
      <span className="inst-text" style={{ fontSize: "9px" }}>FX</span>
      {showFX && <div className="active-glow"></div>}
    </button>
  </div>
</div>
  
            {/* Блоки TEMPO / ATTACH EFFECT / MASTER (анимированный контейнер) */}
            <div style={{
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        maxHeight: isTempoMasterVisible ? "300px" : "0px",
        opacity: isTempoMasterVisible ? 1 : 0,
        marginBottom: isTempoMasterVisible ? "20px" : "0px"
      }}>
        <div style={{ display: "flex", gap: "20px", alignItems: "stretch", flexWrap: "wrap" }}>
          {/* TEMPO */}
          <div style={{ background: "#0a0e1a", padding: "15px", borderRadius: "12px", border: "1px solid #2a3a6e", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", width: "200px", textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "#4D88FF", marginBottom: "6px" }}>TEMPO</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#4DFF88", marginBottom: "4px" }}>{bpm}</div>
            <div style={{ fontSize: "10px", color: "#4D88FF", marginBottom: "12px" }}>BPM</div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginTop: "10px" }}>
              {/* кнопки лупа – без изменений */}
              <button
                onClick={() => {
                  const currentX = playheadXRef.current;
                  if (loopStart === 0 && loopEnd === 0) {
                    setLoopStart(currentX);
                    setLoopEnd(0);
                    setPreviewLoopEnd(currentX);
                  } else if (loopStart !== 0 && loopEnd === 0) {
                    if (previewLoopEnd > loopStart) {
                      setLoopEnd(previewLoopEnd);
                    } else {
                      setLoopStart(previewLoopEnd);
                      setLoopEnd(loopStart);
                    }
                    setPreviewLoopEnd(0);
                  } else {
                    setLoopStart(0);
                    setLoopEnd(0);
                    setPreviewLoopEnd(0);
                    setLoopActive(false);
                  }
                }}
                style={{
                  background: "#0a0e1a",
                  border: `2px solid ${loopStart === 0 ? "#4DFF88" : (loopEnd === 0 ? "#FFA500" : "#FF4D4D")}`,
                  borderRadius: "6px",
                  padding: "3px 6px",
                  flex: 1,
                  color: loopStart === 0 ? "#4DFF88" : (loopEnd === 0 ? "#FFA500" : "#FF4D4D"),
                  fontSize: "9px",
                  fontWeight: "bold",
                  letterSpacing: "0.5px",
                  cursor: "pointer",
                  textShadow: `0 0 3px ${loopStart === 0 ? "#4DFF88" : (loopEnd === 0 ? "#FFA500" : "#FF4D4D")}`,
                  boxShadow: `0 0 6px rgba(${loopStart === 0 ? "77, 255, 136" : (loopEnd === 0 ? "255, 165, 0" : "255, 77, 77")}, 0.5)`,
                  transition: "all 0.2s ease",
                  backdropFilter: "blur(2px)"
                }}
              >
                {loopStart === 0 ? "SET LOOP" : (loopEnd === 0 ? "SET END" : "RESET LOOP")}
              </button>
              <button
                onClick={() => {
                  if (loopStart !== 0 && loopEnd !== 0 && loopEnd > loopStart) {
                    setLoopActive(!loopActive);
                  } else {
                    setInfoModal({
                      visible: true,
                      message: "First set the loop area (press SET LOOP twice at desired positions)"
                    });
                  }
                }}
                style={{
                  background: loopActive ? "#4DFF88" : "#0a0e1a",
                  border: `2px solid ${loopActive ? "#4DFF88" : "#FF4D4D"}`,
                  borderRadius: "6px",
                  padding: "3px 6px",
                  flex: 1,
                  color: loopActive ? "#0a0e1a" : "#FF4D4D",
                  fontSize: "9px",
                  fontWeight: "bold",
                  letterSpacing: "0.5px",
                  cursor: "pointer",
                  textShadow: loopActive ? "none" : "0 0 3px #FF4D4D",
                  boxShadow: loopActive ? "0 0 10px #4DFF88, inset 0 0 2px rgba(0,0,0,0.2)" : "0 0 6px rgba(255,77,77,0.5)",
                  transition: "all 0.2s ease",
                  backdropFilter: "blur(2px)"
                }}
              >
                LOOP {loopActive ? "ON" : "OFF"}
              </button>
            </div>
            <input
              type="range"
              min="60"
              max="200"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              style={{ width: "100%", cursor: "pointer", marginTop: "25px" }}
            />
          </div>

          {/* ATTACH EFFECT (UI SOUNDS) */}
          <div style={{ background: "#0a0e1a", padding: "12px", borderRadius: "12px", border: "1px solid #2a3a6e", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", width: "200px", textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "#4D88FF", marginBottom: "6px" }}>ATTACH EFFECT</div>
            <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
              {[
                { name: 'click', icon: '🔊', title: 'Щелчок', play: () => uiSounds.playClick() },
                { name: 'pop', icon: '🎯', title: 'Цок', play: () => uiSounds.playPop() },
                { name: 'pixel', icon: '🕹️', title: 'Пиксельный', play: () => uiSounds.playPixel() },
                { name: 'boom', icon: '💥', title: 'Бум', play: () => uiSounds.playBoom() },
                { name: 'chirp', icon: '🐤', title: 'Чирп', play: () => uiSounds.playChirp() }
              ].map(effect => (
                <button
                  key={effect.name}
                  onClick={(e) => {
                    const btn = e.currentTarget;
                    btn.classList.add('btn-flash');
                    setTimeout(() => btn.classList.remove('btn-flash'), 120);
                    applyEffectToSelectedBlocks(effect.name);
                    effect.play();
                  }}
                  style={{ background: "#1e2a50", border: "none", borderRadius: "20px", padding: "6px 8px", color: "#4DFF88", cursor: "pointer", fontSize: "12px", transition: "all 0.1s ease" }}
                  title={effect.title}
                >
                  {effect.icon}
                </button>
              ))}
              <button
                onClick={(e) => {
                  const btn = e.currentTarget;
                  btn.classList.add('btn-flash-red');
                  setTimeout(() => btn.classList.remove('btn-flash-red'), 120);
                  applyEffectToSelectedBlocks(null);
                }}
                style={{ background: "#2A3350", border: "none", borderRadius: "20px", padding: "6px 8px", color: "#FFB84D", cursor: "pointer", fontSize: "12px" }}
                title="Сбросить эффект с выделенных блоков"
              >
                ❌
              </button>
            </div>
            <div style={{ fontSize: "9px", color: "#AAB3C2", marginBottom: "8px" }}>Select block(s) → choose effect</div>
            <button
              onClick={(e) => {
                const btn = e.currentTarget;
                btn.classList.add('btn-flash-red');
                setTimeout(() => btn.classList.remove('btn-flash-red'), 200);
                removeAllEffects();
              }}
              style={{ backgroundColor: "#0f172a", border: "1px solid #ff4d4d", borderRadius: "6px", padding: "6px 8px", width: "100%", color: "#ff4d4d", cursor: "pointer", fontSize: "10px", fontWeight: "bold", marginTop: "6px", transition: "all 0.3s ease", textTransform: "uppercase" }}
            >
              REMOVE ALL EFFECTS
            </button>
          </div>

          {/* MASTER — с переключением VU / WAVE, пульсирующим кругом и динамическим цветом */}
<div style={{
  background: "#0a0e1a",
  padding: "15px",
  borderRadius: "12px",
  border: "1px solid #2a3a6e",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  width: "200px",
  textAlign: "center"
}}>
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
    <button
      onClick={() => setMasterDisplayMode("vu")}
      style={{
        background: masterDisplayMode === "vu" ? "#4DFF88" : "transparent",
        border: `1px solid ${masterDisplayMode === "vu" ? "#4DFF88" : "#4D88FF"}`,
        borderRadius: "4px",
        padding: "2px 6px",
        fontSize: "8px",
        color: masterDisplayMode === "vu" ? "#0a0e1a" : "#4D88FF",
        fontWeight: "bold",
        cursor: "pointer",
        transition: "all 0.2s"
      }}
    >
      VU
    </button>
    <span style={{ fontSize: "12px", color: "#4D88FF" }}>MASTER</span>
    <button
      onClick={() => setMasterDisplayMode("wave")}
      style={{
        background: masterDisplayMode === "wave" ? "#4DFF88" : "transparent",
        border: `1px solid ${masterDisplayMode === "wave" ? "#4DFF88" : "#4D88FF"}`,
        borderRadius: "4px",
        padding: "2px 6px",
        fontSize: "8px",
        color: masterDisplayMode === "wave" ? "#0a0e1a" : "#4D88FF",
        fontWeight: "bold",
        cursor: "pointer",
        transition: "all 0.2s"
      }}
    >
      WAVE
    </button>
  </div>

  {masterDisplayMode === "vu" ? (
    <>
      <div style={{ fontSize: "28px", fontWeight: "bold", color: "#4DFF88", marginBottom: "8px" }}>
        {Math.floor(masterVolume * 100)}%
      </div>
      <div style={{ display: "flex", gap: "4px", alignItems: "center", justifyContent: "center", height: "30px", marginBottom: "12px" }}>
        {[...Array(20)].map((_, idx) => {
          const intensity = idx / 20;
          const isActive = masterVolume > intensity;
          let color = "#4DFF88";
          if (intensity > 0.7) color = "#FFB84D";
          if (intensity > 0.9) color = "#FF4D4D";
          return (
            <div key={idx} style={{ width: "6px", height: `${10 + intensity * 20}px`, backgroundColor: isActive ? color : "rgba(77,136,255,0.2)", borderRadius: "2px", transition: "height 0.05s linear" }} />
          );
        })}
      </div>
    </>
  ) : (
    <div style={{ marginBottom: "12px", display: "flex", justifyContent: "center", alignItems: "center", height: "80px" }}>
      <div
        style={{
          width: "70px",
          height: "70px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${(() => {
            const vol = masterVolume;
            if (vol < 0.33) return "rgba(77, 255, 136, 0.3)";
            if (vol < 0.66) return "rgba(255, 184, 77, 0.3)";
            return "rgba(255, 77, 77, 0.3)";
          })()}, rgba(77, 255, 136, 0))`,
          border: `2px solid ${(() => {
            const vol = masterVolume;
            if (vol < 0.33) return "#4DFF88";
            if (vol < 0.66) return "#FFB84D";
            return "#FF4D4D";
          })()}`,
          boxShadow: `0 0 ${masterVolume * 45}px ${(() => {
            const vol = masterVolume;
            if (vol < 0.33) return "#4DFF88";
            if (vol < 0.66) return "#FFB84D";
            return "#FF4D4D";
          })()}`,
          transform: `scale(${0.1 + masterVolume * 1.4})`,
          transition: "all 0.05s linear",
          filter: "drop-shadow(0 0 6px currentColor)",
          opacity: 0.5 + masterVolume * 0.5
        }}
      />
    </div>
  )}

  <div style={{ fontSize: "18px", fontWeight: "bold", color: "#4DFF88", marginTop: "6px" }}>
    {currentPosition.seconds.toFixed(1)}s
  </div>
  <div style={{ fontSize: "10px", color: "#4D88FF" }}>
    ({currentPosition.bar}.{currentPosition.beat})
  </div>
</div>
        </div>
      </div>

      {/* FX-панель (ползунки) – выровнена по ширине трёх блоков (640px) */}
      <div style={{ maxHeight: showFX ? "300px" : "0px", opacity: showFX ? 1 : 0, overflow: "hidden", transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)", marginBottom: showFX ? 30 : 0, width: "640px" }}>
        <div style={{
          background: "#0a0e1a",
          border: "1px solid #2a3a6e",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          padding: "20px",
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: "20px",
          width: "100%",
          boxSizing: "border-box"
        }}>
          {/* VOLUME */}
          <div style={{ textAlign: "center" }}>
            <div style={labelStyle}>VOLUME<br/>{volumes[instrument].toFixed(2)}</div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volumes[instrument]}
              onChange={(e) => setVolumes(prev => ({ ...prev, [instrument]: Number(e.target.value) }))}
              style={{ width: "100%", marginTop: "8px", marginBottom: "8px" }}
            />
            <button style={resetBtnStyle} onClick={() => setVolumes(prev => ({ ...prev, [instrument]: 0.5 }))}>Reset</button>
          </div>
          {/* FX VOLUME */}
          <div style={{ textAlign: "center" }}>
            <div style={labelStyle}>FX VOLUME<br/>{fxVolume.toFixed(2)}</div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={fxVolume}
              onChange={(e) => setFxVolume(parseFloat(e.target.value))}
              style={{ width: "100%", marginTop: "8px", marginBottom: "8px" }}
            />
            <button style={resetBtnStyle} onClick={() => setFxVolume(0.5)}>Reset</button>
          </div>
          {/* CUTOFF */}
          <div style={{ textAlign: "center" }}>
            <div style={labelStyle}>CUTOFF<br/>{filters[instrument].cutoff}</div>
            <input
              type="range"
              min="200"
              max="10000"
              value={filters[instrument].cutoff}
              onChange={(e) => setFilters(p => ({ ...p, [instrument]: { ...p[instrument], cutoff: Number(e.target.value) } }))}
              style={{ width: "100%", marginTop: "8px", marginBottom: "8px" }}
            />
            <button style={resetBtnStyle} onClick={() => setFilters(p => ({ ...p, [instrument]: { ...p[instrument], cutoff: 8000 } }))}>Reset</button>
          </div>
          {/* Q (RES) */}
          <div style={{ textAlign: "center" }}>
            <div style={labelStyle}>Q (RES)<br/>{filters[instrument].q}</div>
            <input
              type="range"
              min="0.1"
              max="20"
              step="0.1"
              value={filters[instrument].q}
              onChange={(e) => setFilters(p => ({ ...p, [instrument]: { ...p[instrument], q: Number(e.target.value) } }))}
              style={{ width: "100%", marginTop: "8px", marginBottom: "8px" }}
            />
            <button style={resetBtnStyle} onClick={() => setFilters(p => ({ ...p, [instrument]: { ...p[instrument], q: 1 } }))}>Reset</button>
          </div>
          {/* CHORUS */}
          <div style={{ textAlign: "center" }}>
            <div style={labelStyle}>CHORUS<br/>{fx[instrument].chorus.toFixed(2)}</div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={fx[instrument].chorus}
              onChange={(e) => setFx(p => ({ ...p, [instrument]: { ...p[instrument], chorus: Number(e.target.value) } }))}
              style={{ width: "100%", marginTop: "8px", marginBottom: "8px" }}
            />
            <button style={resetBtnStyle} onClick={() => setFx(p => ({ ...p, [instrument]: { ...p[instrument], chorus: 0.3 } }))}>Reset</button>
          </div>
          {/* REVERB */}
          <div style={{ textAlign: "center" }}>
            <div style={labelStyle}>REVERB<br/>{fx[instrument].reverb.toFixed(2)}</div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={fx[instrument].reverb}
              onChange={(e) => setFx(p => ({ ...p, [instrument]: { ...p[instrument], reverb: Number(e.target.value) } }))}
              style={{ width: "100%", marginTop: "8px", marginBottom: "8px" }}
            />
            <button style={resetBtnStyle} onClick={() => setFx(p => ({ ...p, [instrument]: { ...p[instrument], reverb: 0.25 } }))}>Reset</button>
          </div>
        </div>
      </div>
      {/* Блок транспорта (над сеткой) */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "20px", marginBottom: "20px" }}>
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
        <button onClick={() => setShowResetConfirm(true)} className="reset-btn" style={{ marginLeft: "auto" }}>RESET</button>
      </div>
  
      {/* Сетка (scroll-container) */}
      <div 
        ref={scrollRef}
        onMouseMove={(e) => { if (!isDraggingRef.current) return; autoScrollIfNeeded(e.clientX); }}
        onTouchMove={(e) => { if (!isDraggingRef.current) return; const touchX = e.touches[0].clientX; autoScrollIfNeeded(touchX); }}
        className="scroll-container"
        onContextMenu={(e) => e.preventDefault()}
        style={{
          width: "100%",
          overflowX: "auto",
          overflowY: "auto",
          paddingBottom: "10px",
          position: "relative",
          background: "#050814",
          borderRadius: 10,
          border: "1px solid #161B33",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x"
        }}
      >
        <div style={{ 
          width: `${Math.max(2000, Math.max(0, ...Object.values(tracks).flat().map(b => b.x + b.length)) + 1000)}px`, 
          display: "inline-block",
          minWidth: '100%', 
          position: "relative", 
          minHeight: 480, 
          backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)`, 
          backgroundSize: `${STEP_WIDTH}px 60px` 
        }}>
          {loopStart !== 0 && (loopEnd !== 0 && loopEnd > loopStart || previewLoopEnd > loopStart) && (
            <div style={{
              position: "absolute",
              top: 0,
              left: loopStart,
              width: (loopEnd !== 0 ? loopEnd : previewLoopEnd) - loopStart,
              height: "100%",
              backgroundColor: "rgba(77, 255, 136, 0.15)",
              borderLeft: "2px solid #4DFF88",
              borderRight: "2px solid #4DFF88",
              pointerEvents: "none",
              zIndex: 5,
              transition: "width 0.05s linear"
            }} />
          )}
          {strings.map((s, i) => (
            <div key={i} 
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                if (e.target.closest(".block") || e.target.closest(".playhead-grabber")) return;
                isDraggingRef.current = true;
                const x = Math.floor(getRelativeX(e.clientX) / STEP_WIDTH) * STEP_WIDTH;
                const newBlock = { id: Date.now(), string: i, x, length: 80, fret: 0, velocity: 1, effect: null };
                const existingOnString = tracks[instrument].filter(b => b.string === i);
                const overlapping = existingOnString.some(b => (x < b.x + b.length && x + 80 > b.x));
                if (!overlapping) {
                  setTracks(prev => ({...prev, [instrument]: [...prev[instrument], newBlock]}));
                }
              }}
              onTouchStart={(e) => {
                if (e.target.closest(".block") || e.target.closest(".playhead-grabber")) return;
                const touchX = e.touches[0].clientX;
                const x = Math.floor(getRelativeX(touchX) / STEP_WIDTH) * STEP_WIDTH;
                const newBlock = { id: Date.now(), string: i, x, length: 80, fret: 0, velocity: 1, effect: null };
                const existingOnString = tracks[instrument].filter(b => b.string === i);
                const overlapping = existingOnString.some(b => (x < b.x + b.length && x + 80 > b.x));
                if (!overlapping) {
                  setTracks(prev => ({...prev, [instrument]: [...prev[instrument], newBlock]}));
                }
              }}
              style={{ borderBottom: "1px solid #161B33", height: 60, display: "flex", alignItems: "center", paddingLeft: 10, color: "#4D88FF", position: "relative" }}
            >
              <span style={{ width: 30, fontWeight: "bold" }}>{s}</span>
              {Object.keys(tracks).map(instName => 
                tracks[instName]
                  .filter(b => b.string === i)
                  .map(b => {
                    const isActive = instName === instrument;
                    return (
                      <div 
                        key={b.id} 
                        className={`block ${isPlaying && activeStep >= Math.floor(b.x / STEP_WIDTH) && activeStep < Math.floor((b.x + b.length) / STEP_WIDTH) ? 'playing' : ''}`}
                        data-id={b.id}
                        onMouseEnter={() => setHoveredBlockId(b.id)}
                        onMouseLeave={() => setHoveredBlockId(null)}
                        onMouseDown={(e) => {
                          handleSelectBlock(e, b, instName);
                          if (instName === instrument) {
                            if (selectedBlockIds.has(b.id)) handleGroupDragStart(e, b);
                            isDraggingRef.current = true;
                            startDrag(b, e);
                          }
                        }}
                        onDoubleClick={() => {
                          if (instName !== instrument) return;
                          setTracks(prev => ({
                            ...prev,
                            [instrument]: prev[instrument].map(it => it.id === b.id ? { ...it, velocity: (it.velocity || 1) <= 0.5 ? 1 : 0.5 } : it)
                          }));
                        }}
                        onTouchStart={(e) => {
                          handleSelectBlock(e, b, instName);
                          if (instName === instrument) handleTouchStart(e, b, false);
                        }}
                        onTouchMove={(e) => {
                          if (instName === instrument) handleTouchMove(e);
                        }}
                        onTouchEnd={handleTouchEnd}
                        onContextMenu={(e) => { 
                          e.preventDefault(); 
                          if (instName !== instrument) return;
                          setTracks(prev => ({...prev, [instrument]: prev[instrument].filter(it => it.id !== b.id)}));
                          setSelectedBlockIds(prev => { const ns = new Set(prev); ns.delete(b.id); return ns; });
                        }} 
                        style={{
                          position: "absolute",
                          left: b.x,
                          width: b.length,
                          height: 45,
                          backgroundColor: instName === instrument ? getColor(b.fret) : "rgba(100, 100, 100, 0.2)",
                          boxShadow: instName === instrument ? `0 4px 0 rgba(0,0,0,0.5), 0 0 8px ${getColor(b.fret)}` : "none",
                          opacity: instName === instrument ? (b.velocity || 1) : 0.5,
                          border: instName === instrument ? "none" : "1px dashed rgba(255,255,255,0.2)",
                          outline: selectedBlockIds.has(b.id) ? "2px solid cyan" : "none",
                          outlineOffset: "2px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontWeight: "bold",
                          cursor: instName === instrument ? "grab" : "default",
                          zIndex: instName === instrument ? 10 : 5,
                          borderRadius: 8,
                          pointerEvents: "auto",
                          touchAction: "none",
                          transition: "all 0.05s linear"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span>{b.fret}</span>
                          {b.effect === 'click' && <span style={{ fontSize: "10px" }}>🔊</span>}
                          {b.effect === 'pop' && <span style={{ fontSize: "10px" }}>🎯</span>}
                          {b.effect === 'pixel' && <span style={{ fontSize: "10px" }}>🕹️</span>}
                          {b.effect === 'boom' && <span style={{ fontSize: "10px" }}>💥</span>}
                          {b.effect === 'chirp' && <span style={{ fontSize: "10px" }}>🐤</span>}
                        </div>
                        {instName === instrument && (
                          <div 
                            onMouseDown={(e) => startResize(b, e)}
                            onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e, b, true); }}
                            style={{ position: "absolute", right: 0, top: 0, width: 15, height: "100%", cursor: "ew-resize", background: "rgba(0,0,0,0.1)", borderRadius: "0 6px 6px 0" }} 
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
            style={{ position: "absolute", top: 0, width: 25, marginLeft: -11, height: "100%", cursor: "ew-resize", zIndex: 30, display: "flex", justifyContent: "center" }} 
          >
            <div style={{ width: 3, height: "100%", background: "#FF4D4D", pointerEvents: "none" }} />
          </div>
        </div>
      </div>
  
            
  
      <button className="controls-help-btn" onClick={() => setShowHelp(true)}>Controls Help</button>
  
      {showHelp && (
        <div className="custom-modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="custom-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>Controls Guide</h2><div className="header-line"></div></div>
            <div className="modal-content">
              <div className="help-section"><p><strong>🖱️ Mouse Controls</strong></p>
                <div className="control-item"><span>Mouse Wheel</span> — Change string / color</div>
                <div className="control-item"><span>Alt + Scroll</span> — Change note volume</div>
                <div className="control-item"><span>Right Click</span> — Delete block</div>
              </div>
              <div className="help-section"><p><strong>⌨️ Keyboard Shortcuts</strong></p>
                <div className="control-item"><span>Space</span> — Play / Pause</div>
                <div className="control-item"><span>S</span> — Stop</div>
                <div className="control-item"><span>Ctrl + Click</span> – Select multiple blocks</div>
                <div className="control-item"><span>Ctrl + C</span> — Copy selected blocks</div>
                <div className="control-item"><span>Ctrl + V</span> — Smart Paste </div>
                <div className="control-item"><span>Del / Backspace</span> — Delete selected blocks</div>
              </div>
            </div>
            <button className="close-modal-btn" onClick={() => setShowHelp(false)}>Let's Rock!</button>
          </div>
        </div>
      )}
  
      {showResetConfirm && (
        <div className="custom-modal-overlay warning-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="custom-modal warning-modal" onClick={(e) => e.stopPropagation()}>
            <div className="warning-icon">⚠</div>
            <h2>DANGER ZONE</h2>
            <p>Clear entire project? All notes will be permanently deleted.</p>
            <div className="modal-buttons">
              <button className="cancel-modal-btn" onClick={() => setShowResetConfirm(false)}>CANCEL</button>
              <button className="confirm-reset-btn" onClick={() => { handleResetAll(); setShowResetConfirm(false); }}>YES, RESET ALL</button>
            </div>
          </div>
        </div>
      )}
  
  {infoModal.visible && (
        <div className="custom-modal-overlay" onClick={() => setInfoModal({ visible: false, message: '' })}>
          <div className="custom-modal info-modal" onClick={(e) => e.stopPropagation()}>
            <div className="neon-icon">ℹ️</div>
            <h2 style={{ color: '#4D88FF', textShadow: '0 0 8px #4D88FF' }}>INFORMATION</h2>
            <p>{infoModal.message}</p>
            <div className="modal-buttons">
              <button className="cancel-modal-btn" onClick={() => setInfoModal({ visible: false, message: '' })}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;