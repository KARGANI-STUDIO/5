import React, { useState, useRef, useEffect, useMemo } from "react";
import * as Tone from "tone";
import "./style.css";
import { useGoogleLogin } from '@react-oauth/google';
import UserProfile from './UserProfile';
import { supabase } from './supabaseClient';
import * as MidiModule from '@tonejs/midi';
import Confetti from 'react-confetti';
// Автоматически определяем правильный конструктор
const Midi = MidiModule.Midi || MidiModule.default || MidiModule;
function App() {
  const [user, setUser] = useState(() => {
    // При загрузке страницы проверяем, есть ли сохраненный юзер в памяти браузера
    const savedUser = localStorage.getItem("struna_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [mode, setMode] = useState("landing");
  const strings = ["E1", "A1", "E", "A", "D", "G", "B", "e"];
  const [tracks, setTracks] = useState({ guitar: [], synth: [], drum: [], bass: [], chip: [] });
  const MAX_FRET = 60;
  const [instrument, setInstrument] = useState("guitar");
  const [showHelp, setShowHelp] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [infoModal, setInfoModal] = useState({ visible: false, message: '' });;
  const [bpm, setBpm] = useState(120);
  
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
    guitar: 1.0,
    synth: 1.0,
    drum: 1.0,
    bass: 1.0,
    chip: 1.0
  };
  // ===== ПОЗИЦИИ ИНСТРУМЕНТОВ В 3D-ПРОСТРАНСТВЕ =====
 const defaultPositions = {
  guitar: { x: -4, y: 0, z: -4 },
  synth:  { x:  4, y: 0, z: -4 },
  drum:   { x:  0, y: 0, z: -2 },
  bass:   { x:  0, y: 0, z: -5 },
  chip:   { x:  0, y: 3, z: -5 }
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
  const [showChangelog, setShowChangelog] = useState(false);
  // Состояние языка 
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem("struna_lang");
    return saved === "ru" ? "ru" : "en";
  });

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'ru' : 'en';
    setLang(newLang);
    localStorage.setItem("struna_lang", newLang);
  };

// Переводы для двух фраз
const translations = {
  en: {
    birthdayTitle: "🎉 Happy Birthday, Brother! 🎉",
    birthdaySubtitle: "May music always play in your heart!",
    birthdayBtn: "🎂 Play Birthday Song",
    tagline: "LIQUID GLASS",
    startBtn: "START CREATING",
    desktopOnly: "Desktop Version Only",
    // Верхняя панель (старые ключи, оставляем для совместимости)
    save: "SAVE",
    load: "LOAD",
    driveSave: "DRIVE SAVE",
    share: "SHARE",
    // Новые ключи для меню "МОЯ СТРУНА"
    myStruna: "MY STRUNA",
    theme: "Theme",
    saveProject: "💾 Save Project",
    loadProject: "📂 Load Project",
    driveSaveProject: "▲ Drive Save",
    shareProject: "🔗 Share Project",
    autosaveToggle: "💾 Autosave",
    logout: "🚪 Logout",
    info: "INFO",
    fx: "FX",
    "favorites": "Favorites",
    "favoritesTitle": "⭐ Favorites", 
    "noFavorites": "You have no favorite projects yet",
    saveToCloud: "☁️ Save to Cloud",
    "exportMIDI": "🎵 Export MIDI",
    "load": "Load",
    "delete": "Delete",
    "close": "Close",
    // Блок TEMPO
    tempo: "TEMPO",
    bpm: "BPM",
    setLoop: "SET LOOP",
    setEnd: "SET END",
    resetLoop: "RESET LOOP",
    loopOn: "LOOP ON",
    loopOff: "LOOP OFF",
    "metroOn": "🔔 ON",
    "metroOff": "🔔 OFF",
    "metroSoundClick": "Click",
    "metroSoundBeep": "Beep",
    "metroSoundDrum": "Drum",
    "metroSoundNoise": "Noise",
    "metroSoundBell": "Bell",
    // Блок ATTACH EFFECT
    attachEffect: "ATTACH EFFECT",
    selectBlock: "Select block(s) → choose effect",
    removeAllEffects: "REMOVE ALL EFFECTS",
    subOn: "SUB ON",
    subOff: "SUB OFF",
    // 3D SOUND
    "3dOn": "ON",
    "3dOff": "OFF",
    // AUTOSAVE (для кнопки)
    "autosaveOn": "AUTO ON",
    "autosaveOff": "AUTO OFF",
    // Блок MASTER VOL
    masterVol: "MASTER VOL",
    master: "MASTER",
    vu: "VU",
    wave: "WAVE",
    // Блок FX
    volume: "VOLUME",
    fxVol: "FX VOL",
    cutoff: "CUTOFF",
    q: "Q (RES)",
    chorus: "CHORUS",
    reverb: "REVERB",
    reset: "Reset",
    resetAll: "RESET",
    controlsHelp: "Controls Help",
    // Модальные окна
    infoTitle: "INFORMATION",
    infoNoNotes: "There are no notes on the grid. Add blocks to start playback.",
    infoSetLoop: "Please set the loop area first",
    infoOk: "OK",
    dangerTitle: "DANGER ZONE",
    dangerMessage: "Clear entire project? All notes will be permanently deleted.",
    cancel: "CANCEL",
    confirmReset: "YES, RESET ALL",
    // Controls Help
    controls: {
      title: "CONTROLS GUIDE",
      mouse: {
        title: "Mouse Controls",
        wheel: "Mouse Wheel — Change string / color",
        altScroll: "Alt + Scroll — Change note volume",
        rightClick: "Right Click — Delete block"
      },
      keyboard: {
        title: "Keyboard Shortcuts",
        space: "Space — Play / Pause",
        s: "S — Stop",
        r: "R — Start / Stop recording",
        ctrlClick: "Ctrl + Click – Select multiple blocks",
        ctrlD: "Ctrl + D — Duplicate selected blocks",
        del: "Del / Backspace — Delete selected blocks"
      },
      letsRock: "LET'S ROCK!"
    },
    // Кнопка "Что нового" и список новинок (ОБНОВЛЕНО)
    changelogBtn: "What's New",
changelogTitle: "✨ What's New (v1.5.3.3-Beta)",
changelogText: [
  "• Liquid Glass design style",
  "• 3D sound support with spatial positioning",
  "• Added metronome",
  "• Personal account with unified control menu (MY STRUNA)",
  "• Favorites: save your projects and quick access from personal account",
  "• Cloud update: use 'Save to Cloud'",
  "• Autosave project for authorized users",
  "• MIDI export: open your tracks in any sequencer or DAW"
  
]
  },
  ru: {
    birthdayTitle: "🎉 С Днём Рождения, Брат! 🎉",
    birthdaySubtitle: "Пусть музыка всегда звучит в твоём сердце!",
    birthdayBtn: "🎂 Сыграть песню",
    tagline: "ЖИДКОЕ СТЕКЛО",
    startBtn: "НАЧАТЬ ТВОРИТЬ",
    desktopOnly: "Только для ПК",
    // Верхняя панель (старые ключи, оставляем для совместимости)
    save: "СОХРАНИТЬ",
    load: "ЗАГРУЗИТЬ",
    driveSave: "СОХРАНИТЬ НА ДИСК",
    share: "ПОДЕЛИТЬСЯ",
    // Новые ключи для меню "МОЯ СТРУНА"
    myStruna: "МОЯ СТРУНА",
    theme: "Тема",
    saveProject: "💾 Сохранить проект",
    loadProject: "📂 Загрузить проект",
    driveSaveProject: "▲ Сохранить на диск",
    shareProject: "🔗 Поделиться",
    autosaveToggle: "💾 Автосохранение",
    logout: "🚪 Выйти",
    info: "ИНФО",
    fx: "ЭФФЕКТЫ",
    "favorites": "Избранное",
    "favoritesTitle": "⭐ Избранное",
    saveToCloud: "☁️ Сохранить в облако",
    "exportMIDI": "🎵 Экспорт MIDI",
    "noFavorites": "У вас пока нет избранных проектов",
    "load": "Загрузить",
    "delete": "Удалить",
    "close": "Закрыть",
    // Блок TEMPO
    tempo: "ТЕМП",
    bpm: "BPM",
    setLoop: "УСТАНОВИТЬ ЛУП",
    setEnd: "УСТАНОВИТЬ КОНЕЦ",
    resetLoop: "СБРОСИТЬ ЛУП",
    loopOn: "ЛУП ВКЛ",
    loopOff: "ЛУП ВЫКЛ",
    "metroOn": "🔔 ВКЛ",
    "metroOff": "🔔 ВЫКЛ",
    "metroSoundClick": "Щелчок",
    "metroSoundBeep": "Бип",
    "metroSoundDrum": "Удар",
    "metroSoundNoise": "Шум",
    "metroSoundBell": "Колокол",
    // Блок ATTACH EFFECT
    attachEffect: "ПРИКРЕПИТЬ ЭФФЕКТ",
    selectBlock: "Выберите блок(и) → выберите эффект",
    removeAllEffects: "УДАЛИТЬ ВСЕ ЭФФЕКТЫ",
    subOn: "САБ ВКЛ",
    subOff: "САБ ВЫКЛ",
    // 3D SOUND
    "3dOn": "ВКЛ",
    "3dOff": "ВЫКЛ",
    // AUTOSAVE (для кнопки)
    "autosaveOn": "АВТО ВКЛ",
    "autosaveOff": "АВТО ВЫКЛ",
    // Блок MASTER VOL
    masterVol: "ОБЩАЯ ГРОМКОСТЬ",
    master: "ОБЩИЙ",
    vu: "ИЗМЕРИТЕЛЬ",
    wave: "ВОЛНА",
    // Блок FX
    volume: "ГРОМКОСТЬ",
    fxVol: "FX ГРОМК",
    cutoff: "СРЕЗ",
    q: "Q (РЕЗ)",
    chorus: "ХОРУС",
    reverb: "РЕВЕРБ",
    reset: "Сброс",
    resetAll: "СБРОС",
    controlsHelp: "ПОМОЩЬ",
    // Модальные окна
    infoTitle: "ИНФОРМАЦИЯ",
    infoNoNotes: "На сетке нет нот. Добавьте блоки для начала воспроизведения.",
    infoSetLoop: "Пожалуйста, сначала установите область лупа",
    infoOk: "ОК",
    dangerTitle: "ОПАСНАЯ ЗОНА",
    dangerMessage: "Очистить весь проект? Все ноты будут безвозвратно удалены.",
    cancel: "ОТМЕНА",
    confirmReset: "ДА, СБРОСИТЬ ВСЁ",
    // Controls Help
    controls: {
      title: "РУКОВОДСТВО ПО УПРАВЛЕНИЮ",
      mouse: {
        title: "Управление мышью",
        wheel: "Колесо мыши — изменить струну / цвет",
        altScroll: "Alt + Колесо — изменить громкость ноты",
        rightClick: "Правый клик — удалить блок"
      },
      keyboard: {
        title: "Горячие клавиши",
        space: "Пробел — Воспроизведение / Пауза",
        s: "S — Остановить",
        r: "R — Начать / Остановить запись",
        ctrlClick: "Ctrl + Клик — выбрать несколько блоков",
        ctrlD: "Ctrl + D — дублировать выбранные блоки",
        del: "Del / Backspace — удалить выбранные блоки"
      },
      letsRock: "ПОЕХАЛИ!"
    },
    // Кнопка "Что нового" и список новинок (ОБНОВЛЕНО)
    changelogBtn: "Что нового",
changelogTitle: "✨ Что нового (v1.5.3.3-Beta)",
changelogText: [
  "• Дизайн в стиле Liquid Glass",
  "• Поддержка 3D-звука с пространственным позиционированием",
  "• Добавлен метроном",
  "• Личный кабинет с единым меню управления (МОЯ СТРУНА)",
  "• Избранное: сохраняйте проекты и быстро загружайте их из личного кабинета",
  "• Обновление проектов в облаке",
  "• MIDI-экспорт: ваши треки теперь можно открывать в любом секвенсоре",
  
]
  }
};

const t = (key) => {
  const keys = key.split('.');
  let value = translations[lang];
  for (const k of keys) {
    if (value && value[k] !== undefined) {
      value = value[k];
    } else {
      // fallback на английский
      let fallback = translations.en;
      for (const fk of keys) {
        if (fallback && fallback[fk] !== undefined) {
          fallback = fallback[fk];
        } else {
          return key; // если нет перевода, возвращаем сам ключ
        }
      }
      return fallback;
    }
  }
  return value || key;
};
  // Режим сабвуфера для баса
const [subMode, setSubMode] = useState(() => {
  const saved = localStorage.getItem("struna_sub_mode");
  return saved === "true";
});
  const [previewLoopEnd, setPreviewLoopEnd] = useState(0);
  const [masterGainValue, setMasterGainValue] = useState(1.0);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("struna_theme");
    return saved === "light" ? "light" : "dark";
  });
  
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("struna_theme", newTheme);
    // Применяем стили напрямую
    applyThemeStyles(newTheme);
  };
  
  const applyThemeStyles = (newTheme) => {
    const isLight = newTheme === "light";
    
    // Устанавливаем класс на .app
    const appDiv = document.querySelector('.app');
    if (appDiv) {
      if (isLight) appDiv.classList.add('light-theme');
      else appDiv.classList.remove('light-theme');
    }
  
    // 1. Меняем фон всех контейнеров с инлайн-стилями
    const bgDark = isLight ? '#ffffff' : '#0a0e1a';
    const borderColor = isLight ? '#d0d0e0' : '#2a3a6e';
    const shadow = isLight ? '0 4px 12px rgba(0,0,0,0.1)' : '0 4px 12px rgba(0,0,0,0.3)';
  
    document.querySelectorAll('div[style*="background: #0a0e1a"], div[style*="background:#0a0e1a"], div[style*="background-color: #0a0e1a"]').forEach(el => {
      el.style.background = bgDark;
      el.style.borderColor = borderColor;
      el.style.boxShadow = shadow;
    });
  
    // 2. Меняем цвет текста
    const textColor = isLight ? '#0066ff' : '#4D88FF';
    document.querySelectorAll('div[style*="color: #4D88FF"]').forEach(el => {
      el.style.color = textColor;
    });
  
    const brightColor = isLight ? '#27ae60' : '#4DFF88';
    document.querySelectorAll('div[style*="color: #4DFF88"]').forEach(el => {
      el.style.color = brightColor;
    });
  
    // 3. Кнопки инструментов
    const btnBg = isLight ? '#ffffff' : '#1e2a50';
    const btnColor = isLight ? '#1a1a2e' : 'rgba(255, 255, 255, 0.5)';
    document.querySelectorAll('.inst-btn').forEach(el => {
      el.style.background = btnBg;
      el.style.color = btnColor;
      el.style.borderColor = isLight ? '#ccc' : 'rgba(255,255,255,0.1)';
    });
    // Активные кнопки
    document.querySelectorAll('.inst-btn.active').forEach(el => {
      el.style.color = isLight ? '#0066ff' : '#ffaa00'; // или другой цвет
      el.style.borderColor = isLight ? '#0066ff' : 'currentColor';
    });
  
    // 4. Сетка
    const scrollBg = isLight ? '#ffffff' : '#050814';
    const scrollContainer = document.querySelector('.scroll-container');
    if (scrollContainer) scrollContainer.style.background = scrollBg;
  
    // 5. Модальные окна (если открыты)
    document.querySelectorAll('.custom-modal').forEach(el => {
      el.style.background = isLight ? 'rgba(255,255,255,0.85)' : '#0d0d12';
    });
  };
  const [show3D, setShow3D] = useState(false);
  // ===== ИЗБРАННОЕ =====
  const [projectId, setProjectId] = useState(null); // ID текущего проекта в БД
  const [favoritesList, setFavoritesList] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [autosaveEnabled, setAutosaveEnabled] = useState(() => {
    const saved = localStorage.getItem('struna_autosave_enabled');
    return saved !== null ? saved === 'true' : true; // по умолчанию включено
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false); 
  const [positions3D, setPositions3D] = useState(defaultPositions);
  const [is3DEnabled, setIs3DEnabled] = useState(true);
  const [metroOn, setMetroOn] = useState(false);
  const [metroVolume, setMetroVolume] = useState(0.7);
  const [metroSound, setMetroSound] = useState('click');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState('idle');
  const statusTimerRef = useRef(null);
  const birthdaySynthRef = useRef(null);
  const birthdayTimeoutRef = useRef(null);

  const userMenuRef = useRef(null); 
  const metroOnRef = useRef(metroOn);
  const metroVolumeRef = useRef(metroVolume);
  const metroSoundRef = useRef(metroSound);
  const metroSynthRef = useRef(null);
  useEffect(() => {
    metroOnRef.current = metroOn;
    metroVolumeRef.current = metroVolume;
    metroSoundRef.current = metroSound;
  }, [metroOn, metroVolume, metroSound]);

  const pannerRefs = useRef({}); // для хранения ссылок на Panner3D
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
  const isPlayheadDraggingRef = useRef(false);
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
  const lastStartTimeMapRef = useRef(new Map());
  const demoRef = useRef(null); // ссылка на текущий демо-синтезатор
  const dragFrameRef = useRef(null);
  const pendingTracksRef = useRef(null);
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

// ==================== playBirthdaySong ====================
const playBirthdaySong = async () => {
  if (Tone.context.state !== 'running') {
    await Tone.start();
  }

  // 1. МГНОВЕННОЕ ПРЕРЫВАНИЕ СТАРОГО ТРЕКА (при повторном клике)
  if (birthdaySynthRef.current) {
    try {
      birthdaySynthRef.current.releaseAll();
      birthdaySynthRef.current.disconnect();
      birthdaySynthRef.current.dispose();
    } catch (e) {
      console.error(e);
    }
    birthdaySynthRef.current = null;
  }
  
  if (birthdayTimeoutRef.current) {
    clearTimeout(birthdayTimeoutRef.current);
    birthdayTimeoutRef.current = null;
  }

  // 2. СОЗДАНИЕ СИНТЕЗАТОРА С ОПТИМАЛЬНЫМ РЕЛИЗОМ
  // release: 0.2 не позволяет голосам накапливаться и вызывать баг залипания
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.2 }
  });
  
  birthdaySynthRef.current = synth;

  if (masterGainRef.current) {
    synth.connect(masterGainRef.current);
  } else {
    synth.toDestination();
  }

  const notes = [
    // Первый куплет
    { note: 'C4', duration: '8n' }, { note: 'C4', duration: '8n' },
    { note: 'D4', duration: '4n' }, { note: 'C4', duration: '4n' },
    { note: 'F4', duration: '4n' }, { note: 'E4', duration: '2n' },
    { note: 'C4', duration: '8n' }, { note: 'C4', duration: '8n' },
    { note: 'D4', duration: '4n' }, { note: 'C4', duration: '4n' },
    { note: 'G4', duration: '4n' }, { note: 'F4', duration: '2n' },
    { note: 'C4', duration: '8n' }, { note: 'C4', duration: '8n' },
    { note: 'C5', duration: '4n' }, { note: 'A4', duration: '4n' },
    { note: 'F4', duration: '4n' }, { note: 'E4', duration: '4n' },
    { note: 'D4', duration: '4n' }, { note: 'Bb4', duration: '8n' },
    { note: 'Bb4', duration: '8n' }, { note: 'A4', duration: '4n' },
    { note: 'F4', duration: '4n' }, { note: 'G4', duration: '4n' },
    { note: 'F4', duration: '2n' },
    // Второй куплет
    { note: 'C4', duration: '8n' }, { note: 'C4', duration: '8n' },
    { note: 'D4', duration: '4n' }, { note: 'C4', duration: '4n' },
    { note: 'F4', duration: '4n' }, { note: 'E4', duration: '2n' },
    { note: 'C4', duration: '8n' }, { note: 'C4', duration: '8n' },
    { note: 'D4', duration: '4n' }, { note: 'C4', duration: '4n' },
    { note: 'G4', duration: '4n' }, { note: 'F4', duration: '2n' },
    { note: 'C4', duration: '8n' }, { note: 'C4', duration: '8n' },
    { note: 'C5', duration: '4n' }, { note: 'A4', duration: '4n' },
    { note: 'F4', duration: '4n' }, { note: 'E4', duration: '4n' },
    { note: 'D4', duration: '4n' }, { note: 'Bb4', duration: '8n' },
    { note: 'Bb4', duration: '8n' }, { note: 'A4', duration: '4n' },
    { note: 'F4', duration: '4n' }, { note: 'G4', duration: '4n' },
    { note: 'F4', duration: '4n' }
  ];

  // 3. ПОСЛЕДОВАТЕЛЬНОЕ ПЛАНИРОВАНИЕ
  const now = Tone.now();
  let time = now;
  
  notes.forEach(({ note, duration }) => {
    synth.triggerAttackRelease(note, duration, time);
    time += Tone.Time(duration).toSeconds();
  });

  // Финальный аккорд
  const chordDuration = '2n';
  synth.triggerAttackRelease(['C4', 'E4', 'G4'], chordDuration, time);
  time += Tone.Time(chordDuration).toSeconds();

  // Жесткая команда расписанию Tone.js: принудительно выключить ВСЕ звуки в эту секунду
  synth.releaseAll(time);

  // 4. АВТОМАТИЧЕСКАЯ УТИЛИЗАЦИЯ ПОСЛЕ ФИНАЛА
  birthdayTimeoutRef.current = setTimeout(() => {
    if (birthdaySynthRef.current === synth) {
      try {
        synth.releaseAll();
        synth.disconnect(); // Полностью отключаем от мастер-канала
        synth.dispose();    // Удаляем из памяти устройства
      } catch(e) {}
      birthdaySynthRef.current = null;
    }
  }, (time - now) * 1000 + 500); 
};

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
  
// Вставьте после объявления scrollRef, scrollSpeedRef, rafRef, но до autoScrollIfNeeded
const startScrollLoop = () => {
  if (rafRef.current) return; // уже запущен

  const loop = () => {
    const el = scrollRef.current;
    if (!el) {
      rafRef.current = null;
      return;
    }

    // Если скорость очень маленькая, останавливаемся
    if (Math.abs(scrollSpeedRef.current) < 0.05) {
      scrollSpeedRef.current = 0;
      rafRef.current = null;
      return;
    }

    // Применяем скорость
    el.scrollLeft += scrollSpeedRef.current;

    // Продолжаем цикл
    rafRef.current = requestAnimationFrame(loop);
  };

  rafRef.current = requestAnimationFrame(loop);
};

const autoScrollIfNeeded = (clientX) => {
  const el = scrollRef.current;
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const edge = 80;
  const distRight = rect.right - clientX;
  const distLeft = clientX - rect.left;
  const maxSpeed = 12;
  const deadZone = 20;

  let direction = 0;
  let raw = 0;

  if (distRight < edge - deadZone) {
    direction = 1;
    raw = (edge - deadZone - distRight) / (edge - deadZone);
  } else if (distLeft < edge - deadZone) {
    direction = -1;
    raw = (edge - deadZone - distLeft) / (edge - deadZone);
  }

  const rawClamped = Math.max(0, Math.min(1, raw));
  const power = rawClamped * rawClamped * rawClamped * (rawClamped * (6 * rawClamped - 15) + 10);
  const minSpeed = 0.5;
  const dynamicMinSpeed = minSpeed * (0.5 + rawClamped * 0.5);
  const baseSpeed = power * maxSpeed;
  const boostedSpeed = rawClamped > 0.02 ? Math.max(baseSpeed, dynamicMinSpeed) : 0;
  const targetSpeed = direction * Math.max(-maxSpeed, Math.min(maxSpeed, boostedSpeed));

  const easing = 0.15;
  scrollSpeedRef.current += (targetSpeed - scrollSpeedRef.current) * easing;

  if (Math.abs(scrollSpeedRef.current) < 0.05 && Math.abs(targetSpeed) < 0.05) {
    scrollSpeedRef.current = 0;
  }

  if (Math.abs(scrollSpeedRef.current) > 0.01) {
    startScrollLoop();
  }
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
    
      const currentInst = instrument;
      const newTracks = { ...tracks };
      newTracks[currentInst] = newTracks[currentInst].map(b => {
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
      });
    
      pendingTracksRef.current = newTracks;
    
      if (!dragFrameRef.current) {
        dragFrameRef.current = requestAnimationFrame(() => {
          if (pendingTracksRef.current) {
            setTracks(pendingTracksRef.current);
            pendingTracksRef.current = null;
          }
          dragFrameRef.current = null;
        });
      }
    
      autoScrollIfNeeded(e.clientX);
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
    
      // ДОБАВЬТЕ ЭТОТ БЛОК
      if (dragFrameRef.current) {
        cancelAnimationFrame(dragFrameRef.current);
        dragFrameRef.current = null;
      }
      if (pendingTracksRef.current) {
        setTracks(pendingTracksRef.current);
        pendingTracksRef.current = null;
      }
    
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

    let targetScroll = grid.scrollLeft;
    let lastAssignedScroll = grid.scrollLeft; // Фикс для ползунка
    let animationFrameId = null;
    let isScrolling = false;

    // Функция плавной интерполяции (Lerp)
    const smoothScroll = () => {
      // Если пользователь потянул нижний ползунок вручную, отключаем анимацию колесика
      if (Math.abs(grid.scrollLeft - lastAssignedScroll) > 1.5) {
        isScrolling = false;
        return;
      }

      const distance = targetScroll - grid.scrollLeft;

      if (Math.abs(distance) < 0.5) {
        grid.scrollLeft = targetScroll;
        lastAssignedScroll = grid.scrollLeft;
        isScrolling = false;
        return;
      }

      grid.scrollLeft += distance * 0.15;
      lastAssignedScroll = grid.scrollLeft; 
      animationFrameId = requestAnimationFrame(smoothScroll);
    };

    const handleWheel = (e) => {
      const targetBlock = e.target.closest('.block');
      
      // Если курсор находится над блоком ноты
      if (targetBlock) {
        const blockId = Number(targetBlock.dataset.id);
        
        // РЕДАКТИРОВАНИЕ: Меняем параметры только если этот блок сейчас ВЫДЕЛЕН
        if (selectedBlockIds.has(blockId)) {
          e.preventDefault(); // Блокируем скролл сетки, так как редактируем ноту
          
          setTracks(prev => {
            return {
              ...prev,
              [instrument]: prev[instrument].map((it) => {
                if (it.id === blockId) {
                  if (e.altKey) {
                    // Alt + Колесо = Изменение громкости (velocity)
                    const volDelta = e.deltaY > 0 ? -0.1 : 0.1;
                    const currentVel = it.velocity ?? 1;
                    const newVelocity = Math.max(0.1, Math.min(1.5, currentVel + volDelta));
                    return { ...it, velocity: newVelocity };
                  } else {
                    // Просто колесо (БЕЗ Shift) = Изменение лада / струны
                    const fretDelta = e.deltaY > 0 ? -1 : 1;
                    const newFret = Math.max(0, Math.min(MAX_FRET, (it.fret || 0) + fretDelta));
                    return { ...it, fret: newFret };
                  }
                }
                return it;
              })
            };
          });
          return; // Выходим из обработчика, скролл не срабатывает
        }
      }

      // ГОРЗОНТАЛЬНЫЙ СКРОЛЛ КОЛЕСИКОМ
      // Срабатывает на пустом месте сетки ИЛИ если курсор над НЕвыделенным блоком
      e.preventDefault();

      if (!isScrolling) {
        targetScroll = grid.scrollLeft;
        lastAssignedScroll = grid.scrollLeft;
        isScrolling = true;
        animationFrameId = requestAnimationFrame(smoothScroll);
      }

      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 33;
      else if (e.deltaMode === 2) delta *= 100;

      targetScroll += delta * 1.2;

      const maxScroll = grid.scrollWidth - grid.clientWidth;
      targetScroll = Math.max(0, Math.min(maxScroll, targetScroll));
    };

    grid.addEventListener("wheel", handleWheel, { passive: false });
    
    return () => {
      grid.removeEventListener("wheel", handleWheel);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [instrument, selectedBlockIds]);
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
  }).toDestination();

  // 2. Лимитер для защиты от перегрузки
  const limiter = new Tone.Limiter(-3).connect(masterCompressor);

  // 3. Мастер-гейн (общая громкость)
  const master = new Tone.Gain(1.0).connect(limiter);
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

  // ===== МЕТРОНОМ (синтезатор для кликов) =====
  const metroSynth = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 }
  }).toDestination(); // подключаем напрямую к выходу
  metroSynthRef.current = metroSynth;

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

  ["guitar", "synth", "drum", "bass", "chip"].forEach((type) => {
    let volume = volumes[type];
    let cutoffFreq = type === 'bass' ? 1200 : (type === 'guitar' ? 3500 : (type === 'synth' ? 6000 : (type === 'chip' ? 10000 : 8000)));

    const gain = new Tone.Gain(volume).connect(master);
    const filter = new Tone.Filter(cutoffFreq, "lowpass");

    // ----- 3D-паннер вместо обычного -----
    const pos = defaultPositions[type];
    const panner3D = new Tone.Panner3D({
      panningModel: "HRTF",
      positionX: pos.x,
      positionY: pos.y,
      positionZ: pos.z
    }).connect(gain);

    pannerRefs.current[type] = panner3D;

    // Эффекты (chorus, reverb)
    const chorus = new Tone.Chorus(2, 1.5, 0.3).start();
    const reverb = new Tone.Reverb({ decay: 1.2, wet: 1 });
    const chorusGain = new Tone.Gain(0);
    const reverbGain = new Tone.Gain(0);

    fxRef.current[type] = { chorus, reverb, chorusGain, reverbGain };

    // Подключаем эффекты к 3D-паннеру
    filter.connect(chorus);
    chorus.connect(chorusGain);
    chorusGain.connect(panner3D);

    filter.connect(reverb);
    reverb.connect(reverbGain);
    reverbGain.connect(panner3D);

    // Основной сигнал
    filter.connect(panner3D);

    gainsRef.current[type] = gain;
    filtersRef.current[type] = filter;

    // --- Создание синтезаторов ---
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
        harmonicity: 2,
        modulationIndex: 10,
        oscillator: { type: "triangle" },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 1.5 },
        modulationEnvelope: { attack: 0.1, decay: 0.2, sustain: 1, release: 0.8 }
      }).connect(filter);
    } else if (type === "drum") {
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
    } else if (type === "chip") {
      const chipSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "square" },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0.1, release: 0.05 }
      });
      const bitCrusher = new Tone.BitCrusher(8);
      if (bitCrusher.frequency) bitCrusher.frequency.value = 8000;
      chipSynth.connect(bitCrusher);
      bitCrusher.connect(filter);
      synthsRef.current[type] = chipSynth;
    } else {
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

    // Очистка метронома
    if (metroSynthRef.current) {
      metroSynthRef.current.dispose();
      metroSynthRef.current = null;
    }

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
      const params = new URLSearchParams(window.location.search);
      const projectIdFromUrl = params.get('project');
  
      if (projectIdFromUrl) {
        console.log("Обнаружен ID проекта в ссылке, загружаю...");
  
        const { data, error } = await supabase
          .from('projects')
          .select('grid_data')
          .eq('id', projectIdFromUrl)
          .single();
  
        if (error) {
          console.error('Ошибка загрузки по ссылке:', error.message);
          return;
        }
  
        if (data && data.grid_data) {
          const p = data.grid_data;
          if (p.bpm) setBpm(p.bpm);
          if (p.tracks) setTracks(p.tracks);
          if (p.filters) setFilters(p.filters);
          if (p.fx) setFx(p.fx);
          if (p.volumes) setVolumes(p.volumes);
          if (p.positions3D) setPositions3D(p.positions3D);
          if (p.loopActive !== undefined) setLoopActive(p.loopActive);
          if (p.loopStart !== undefined) setLoopStart(p.loopStart);
          if (p.loopEnd !== undefined) setLoopEnd(p.loopEnd);
          if (p.masterGainValue !== undefined) setMasterGainValue(p.masterGainValue);
          if (p.fxVolume !== undefined) setFxVolume(p.fxVolume);
  
          setProjectId(Number(projectIdFromUrl));
          if (user?.email) {
            loadFavorites(); // перезагружаем избранное для проверки
          }
          alert("Проект успешно загружен по вашей ссылке! Нажмите PLAY.");
        }
      }
    };
  
    loadFromUrl();
  }, [user]);
  
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
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = masterGainValue;
    }
  }, [masterGainValue]);
  useEffect(() => {
    loopStartRef.current = loopStart;
    loopEndRef.current = loopEnd;
  }, [loopStart, loopEnd]);
  useEffect(() => {
    const appDiv = document.querySelector('.app');
    if (appDiv) {
      if (theme === "light") appDiv.classList.add('light-theme');
      else appDiv.classList.remove('light-theme');
    }
  }, [theme]);
  useEffect(() => {
    // Обновляем все инструменты при изменении позиций или режима 3D
    Object.entries(pannerRefs.current).forEach(([type, panner]) => {
      if (!panner) return;
      const pos = is3DEnabled ? positions3D[type] : { x: 0, y: 0, z: 0 };
      panner.positionX.rampTo(pos.x, 0.1);
      panner.positionY.rampTo(pos.y, 0.1);
      panner.positionZ.rampTo(pos.z, 0.1);
    });
  }, [positions3D, is3DEnabled]);

  // ===== ЗАГРУЗКА АВТОСОХРАНЕНИЯ (ПЕРВЫЙ) =====
useEffect(() => {
  // Если пользователь не залогинен или автосохранение выключено – просто разрешаем работу
  if (!user?.email || !autosaveEnabled) {
    setIsDataLoaded(true);
    return;
  }

  const key = `struna_autosave_${user.email}`;
  const saved = localStorage.getItem(key);

  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.tracks) setTracks(data.tracks);
      if (data.bpm) setBpm(data.bpm);
      if (data.filters) setFilters(data.filters);
      if (data.fx) setFx(data.fx);
      if (data.volumes) setVolumes(data.volumes);
      if (data.positions3D) setPositions3D(data.positions3D);
      if (data.loopActive !== undefined) setLoopActive(data.loopActive);
      if (data.loopStart !== undefined) setLoopStart(data.loopStart);
      if (data.loopEnd !== undefined) setLoopEnd(data.loopEnd);
      console.log('✅ Автосохранение загружено');
    } catch (e) {
      console.warn('Ошибка загрузки автосохранения:', e);
    }
  }

  setIsDataLoaded(true);
}, [user, autosaveEnabled]);

// ===== АВТОСОХРАНЕНИЕ (ВТОРОЙ) =====
useEffect(() => {
  // Если данные ещё не загружены, пользователь не залогинен или автосохранение выключено – пропускаем
  if (!isDataLoaded || !user?.email || !autosaveEnabled) return;

  const key = `struna_autosave_${user.email}`;
  const data = {
    tracks,
    bpm,
    filters,
    fx,
    volumes,
    positions3D,
    loopActive,
    loopStart,
    loopEnd
  };
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Автосохранение не удалось:', e);
  }
}, [isDataLoaded, user, tracks, bpm, filters, fx, volumes, positions3D, loopActive, loopStart, loopEnd, autosaveEnabled]);

// Сохраняем состояние автокнопки в localStorage при изменении
useEffect(() => {
  localStorage.setItem('struna_autosave_enabled', String(autosaveEnabled));
}, [autosaveEnabled]);

const handleShare = async () => {
  if (!user?.email) {
    alert("Войдите в аккаунт.");
    return;
  }
  try {
    let targetProjectId = projectId;
    const projectData = getProjectData();

    if (!targetProjectId) {
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          user_email: user.email,
          tempo: bpm,
          grid_data: projectData,
          name: projectData.name
        }])
        .select();
      if (error) throw error;
      targetProjectId = data[0].id;
      setProjectId(targetProjectId);
    } else {
      const { error } = await supabase
        .from('projects')
        .update({
          tempo: bpm,
          grid_data: projectData
        })
        .eq('id', targetProjectId)
        .eq('user_email', user.email);
      if (error) throw error;
    }

    const shareUrl = `${window.location.origin}?project=${targetProjectId}`;
    await navigator.clipboard.writeText(shareUrl);
    alert('Ссылка на проект скопирована!');
  } catch (error) {
    alert('Не удалось создать ссылку: ' + error.message);
  }
};

// ===== СОХРАНЕНИЕ / ОБНОВЛЕНИЕ ПРОЕКТА В БД =====
const handleSaveProjectToCloud = async () => {
  if (!user?.email) {
    alert("Войдите в аккаунт.");
    return;
  }
  const projectData = getProjectData();
  try {
    if (projectId) {
      // Обновляем существующий проект
      const { error } = await supabase
        .from('projects')
        .update({
          tempo: bpm,
          grid_data: projectData
        })
        .eq('id', projectId)
        .eq('user_email', user.email);
      if (error) throw error;
      alert("Проект обновлён в облаке!");
    } else {
      // Создаём новый проект
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          user_email: user.email,
          tempo: bpm,
          grid_data: projectData,
          name: projectData.name
        }])
        .select();
      if (error) throw error;
      setProjectId(data[0].id);
      alert("Новый проект сохранён в облаке!");
    }
  } catch (e) {
    alert('Ошибка сохранения: ' + e.message);
  }
};

const getProjectData = () => ({
  tracks,
  bpm,
  filters,
  fx,
  volumes,
  positions3D,
  loopActive,
  loopStart,
  loopEnd,
  masterGainValue,
  fxVolume,
  name: `Проект ${new Date().toLocaleString()}`
});

  // ===== ФУНКЦИИ ДЛЯ ИЗБРАННОГО =====
const loadFavorites = async () => {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('project_id, created_at, projects(grid_data)')
      .eq('user_email', user.email);
    if (error) throw error;
    setFavoritesList(data || []);
  } catch (e) {
    console.error('Ошибка загрузки избранного:', e);
  }
};
// ===== ОБНОВЛЕНИЕ НАЗВАНИЯ ПРОЕКТА =====
const renameFavorite = async (projectId, newName) => {
  if (!projectId || !newName.trim()) return;

  try {
    const { error } = await supabase
      .from('projects')
      .update({ name: newName.trim() })
      .eq('id', projectId);

    if (error) throw error;

    // Обновляем локальный список избранного
    setFavoritesList(prev =>
      prev.map(fav => {
        if (fav.project_id === projectId) {
          return {
            ...fav,
            projects: {
              ...fav.projects,
              grid_data: {
                ...fav.projects?.grid_data,
                name: newName.trim()
              }
            }
          };
        }
        return fav;
      })
    );
  } catch (e) {
    console.error('Ошибка переименования:', e);
    alert('Не удалось переименовать проект');
  }
};

const loadFavoriteProject = async (projectId) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('grid_data')
      .eq('id', projectId)
      .single();
    if (error) throw error;
    if (data && data.grid_data) {
      const p = data.grid_data;
      if (p.bpm) setBpm(p.bpm);
      if (p.tracks) setTracks(p.tracks);
      if (p.filters) setFilters(p.filters);
      if (p.fx) setFx(p.fx);
      if (p.volumes) setVolumes(p.volumes);
      if (p.positions3D) setPositions3D(p.positions3D);
      if (p.loopActive !== undefined) setLoopActive(p.loopActive);
      if (p.loopStart !== undefined) setLoopStart(p.loopStart);
      if (p.loopEnd !== undefined) setLoopEnd(p.loopEnd);
      if (p.masterGainValue !== undefined) setMasterGainValue(p.masterGainValue);
      if (p.fxVolume !== undefined) setFxVolume(p.fxVolume);

      setProjectId(projectId);
      setShowFavoritesModal(false);
      const isFav = favoritesList.some(f => f.project_id === projectId);
      setIsFavorite(isFav);
    }
  } catch (e) {
    console.error('Ошибка загрузки избранного проекта:', e);
    alert('Не удалось загрузить проект');
  }
};

// ===== ИЗБРАННОЕ: ВСЕГДА СОЗДАЁМ НОВУЮ ВЕРСИЮ ПРОЕКТА =====
const handleFavoriteToggle = async () => {
  if (!user?.email) {
    alert("Пожалуйста, войдите в аккаунт.");
    return;
  }
  const totalBlocks = Object.values(tracks).flat().length;
  if (totalBlocks === 0) {
    alert("Добавьте ноты, прежде чем добавлять в избранное!");
    return;
  }

  try {
    let currentProjectId = projectId;
    const projectData = getProjectData();

    // Если проект ещё не сохранён в БД – сначала сохраняем
    if (!currentProjectId) {
      const { data, error: insertError } = await supabase
        .from('projects')
        .insert([{
          user_email: user.email,
          tempo: bpm,
          grid_data: projectData,
          name: projectData.name
        }])
        .select();
      if (insertError) throw insertError;
      currentProjectId = data[0].id;
      setProjectId(currentProjectId);
    } else {
      // Если проект уже есть в БД, и мы добавляем в избранное (isFavorite === false),
      // обновляем проект актуальными данными
      if (!isFavorite) {
        const { error: updateError } = await supabase
          .from('projects')
          .update({
            tempo: bpm,
            grid_data: projectData
          })
          .eq('id', currentProjectId)
          .eq('user_email', user.email);
        if (updateError) throw updateError;
      }
      // Если isFavorite === true, мы просто удалим из избранного (ниже), проект не трогаем
    }

    // Теперь работаем с ярлыком (favorites)
    if (isFavorite) {
      // Удаляем ярлык
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_email', user.email)
        .eq('project_id', currentProjectId);
      if (error) throw error;
      setIsFavorite(false);
      setFavoritesList(prev => prev.filter(f => f.project_id !== currentProjectId));
    } else {
      // Добавляем ярлык
      const { error: favError } = await supabase
        .from('favorites')
        .insert([{ user_email: user.email, project_id: currentProjectId }]);
      if (favError) throw favError;
      setIsFavorite(true);
      setFavoritesList(prev => [
        ...prev,
        { project_id: currentProjectId, created_at: new Date().toISOString() }
      ]);
    }
  } catch (e) {
    console.error('Ошибка при работе с избранным:', e);
    alert('Не удалось обновить статус избранного');
  }
};

// ===== ЭКСПОРТ В MIDI =====
const exportMIDI = () => {
  const allBlocks = Object.values(tracks).flat();
  if (allBlocks.length === 0) {
    setInfoModal({ visible: true, message: t('infoNoNotes') });
    return;
  }

  try {
    const midi = new Midi();
    midi.header.setTempo(bpm);

    Object.entries(tracks).forEach(([instrumentName, blocks]) => {
      if (blocks.length === 0) return;
      const track = midi.addTrack();
      track.name = instrumentName;

      blocks.forEach((block) => {
        if (block.x === undefined || block.length === undefined ||
            block.fret === undefined || block.string === undefined) return;

        const stepTime = 60 / bpm / 4;
        const startTime = (block.x / STEP_WIDTH) * stepTime;
        const duration = (block.length / STEP_WIDTH) * stepTime;

        const freq = OPEN_STRINGS[block.string] * Math.pow(2, block.fret / 12);
        if (!isFinite(freq)) return;
        let midiNote = Math.round(12 * Math.log2(freq / 440) + 69);
        midiNote = Math.max(0, Math.min(127, midiNote));

        const velocity = Math.min(1, Math.max(0, block.velocity ?? 1));
        track.addNote({ midi: midiNote, time: startTime, duration, velocity });
      });
    });

    // Универсальное получение ArrayBuffer
    let arrayBuffer;
    if (typeof midi.toArrayBuffer === 'function') {
      arrayBuffer = midi.toArrayBuffer();
    } else if (typeof midi.toBytes === 'function') {
      const bytes = midi.toBytes();
      arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    } else if (typeof midi.encode === 'function') {
      const encoded = midi.encode();
      arrayBuffer = encoded instanceof ArrayBuffer ? encoded :
                    encoded instanceof Uint8Array ? encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength) :
                    null;
    } else if (typeof midi.toBase64 === 'function') {
      const base64 = midi.toBase64();
      const binaryString = atob(base64);
      arrayBuffer = new ArrayBuffer(binaryString.length);
      const bytes = new Uint8Array(arrayBuffer);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    } else {
      // Fallback-генератор (можно оставить, если он у вас есть)
      arrayBuffer = generateFallbackMIDI(tracks, bpm);
    }

    if (!arrayBuffer) throw new Error('Не удалось получить MIDI-данные');

    const blob = new Blob([arrayBuffer], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `struna_project_${Date.now()}.mid`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Экспорт MIDI:', error);
    alert('Ошибка экспорта: ' + error.message);
  }
};

const generateFallbackMIDI = (tracksData, tempo) => {
  // Простой генератор MIDI Type 0 (только один трек)
  // Возвращает ArrayBuffer
  const trackChunks = [];
  let ticksPerQuarter = 96; // стандарт
  let time = 0;

  // Собираем все ноты в один массив
  const allNotes = [];
  Object.values(tracksData).forEach(blocks => {
    blocks.forEach(block => {
      if (block.x === undefined || block.fret === undefined || block.string === undefined) return;
      const stepTime = 60 / tempo / 4;
      const startTime = (block.x / STEP_WIDTH) * stepTime;
      const duration = (block.length / STEP_WIDTH) * stepTime;
      const freq = OPEN_STRINGS[block.string] * Math.pow(2, block.fret / 12);
      const midiNote = Math.round(12 * Math.log2(freq / 440) + 69);
      const velocity = Math.round((block.velocity || 1) * 127);
      allNotes.push({ start: startTime, duration, midiNote, velocity });
    });
  });

  // Сортируем по времени
  allNotes.sort((a, b) => a.start - b.start);

  // Формируем MIDI-события (упрощённо)
  const events = [];
  allNotes.forEach(note => {
    // Note On
    events.push({ delta: note.start - time, status: 0x90, note: note.midiNote, velocity: note.velocity });
    time = note.start;
    // Note Off
    events.push({ delta: note.duration, status: 0x80, note: note.midiNote, velocity: 0 });
    time = note.start + note.duration;
  });

  // Заголовок MIDI (SMF Type 0)
  const header = new Uint8Array([
    0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, // header chunk
    0x00, 0x00, // format 0
    0x00, 0x01, // tracks 1
    (tempo >> 8) & 0xFF, tempo & 0xFF, 0x00 // division (ticks per quarter)
  ]);

  // Строим трек
  let trackData = [];
  let runningStatus = 0;
  let currentTime = 0;
  events.forEach(ev => {
    let deltaTicks = Math.round(ev.delta * ticksPerQuarter);
    let deltaBytes = [];
    if (deltaTicks < 0) deltaTicks = 0;
    // variable-length
    let v = deltaTicks;
    if (v === 0) deltaBytes.push(0);
    else {
      while (v > 0) {
        let byte = v & 0x7F;
        v >>= 7;
        if (v > 0) byte |= 0x80;
        deltaBytes.push(byte);
      }
    }
    // status byte with running status
    let status = ev.status;
    if (status === runningStatus) {
      // running status – пропускаем
    } else {
      trackData.push(...deltaBytes);
      trackData.push(status);
      runningStatus = status;
      deltaBytes = []; // уже записали
    }
    // данные ноты
    trackData.push(ev.note);
    trackData.push(ev.velocity);
    // обновляем время
    currentTime += ev.delta;
  });

  // Конец трека
  trackData.push(0x00, 0xFF, 0x2F, 0x00);

  // Длина трека
  const trackLength = trackData.length;
  const trackChunk = new Uint8Array(8 + trackLength);
  trackChunk.set([0x4D, 0x54, 0x72, 0x6B], 0); // "MTrk"
  trackChunk[4] = (trackLength >> 24) & 0xFF;
  trackChunk[5] = (trackLength >> 16) & 0xFF;
  trackChunk[6] = (trackLength >> 8) & 0xFF;
  trackChunk[7] = trackLength & 0xFF;
  trackChunk.set(trackData, 8);

  // Объединяем заголовок и трек
  const full = new Uint8Array(header.length + trackChunk.length);
  full.set(header, 0);
  full.set(trackChunk, header.length);

  return full.buffer;
};

// Проверяем, находится ли текущий проект в избранном
useEffect(() => {
  if (projectId && favoritesList.length > 0) {
    const found = favoritesList.some(f => f.project_id === projectId);
    setIsFavorite(found);
  } else {
    setIsFavorite(false);
  }
}, [projectId, favoritesList]);

  // ===== ПЕРЕСОЗДАНИЕ СИНТЕЗАТОРА МЕТРОНОМА ПРИ СМЕНЕ ЗВУКА =====
  useEffect(() => {
    if (metroSynthRef.current) {
      metroSynthRef.current.dispose();
    }
    let synth;
    switch (metroSound) {
      case 'click':
        synth = new Tone.Synth({
          oscillator: { type: 'square' },
          envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 }
        });
        break;
      case 'beep':
        synth = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.002, decay: 0.1, sustain: 0, release: 0.05 }
        });
        break;
      case 'drum':
        synth = new Tone.MembraneSynth({
          pitchDecay: 0.02,
          octaves: 2,
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 }
        });
        break;
      case 'noise':
        synth = new Tone.NoiseSynth({
          noise: { type: 'white' },
          envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 }
        });
        break;
      case 'bell':
        synth = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.3, sustain: 0.1, release: 0.5 }
        });
        break;
      default:
        synth = new Tone.Synth({
          oscillator: { type: 'square' },
          envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 }
        });
    }
    synth.toDestination();
    metroSynthRef.current = synth;
  }, [metroSound]);

  // Закрытие меню при клике вне
useEffect(() => {
  const handleClickOutside = (e) => {
    if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
      setIsUserMenuOpen(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

// ===== ЗАГРУЗКА ИЗБРАННОГО =====
useEffect(() => {
  if (user?.email) {
    loadFavorites();
  } else {
    setFavoritesList([]);
    setIsFavorite(false);
  }
}, [user]);

useEffect(() => {
  if (!autosaveEnabled || !user?.email || !isDataLoaded) return;

  // Очищаем предыдущие таймеры
  if (statusTimerRef.current) {
    clearTimeout(statusTimerRef.current);
    clearTimeout(statusTimerRef.currentSaved);
  }

  setAutosaveStatus('saving');

  const timer1 = setTimeout(() => {
    setAutosaveStatus('saved');
  }, 2000);

  const timer2 = setTimeout(() => {
    setAutosaveStatus('idle');
  }, 2500);

  statusTimerRef.current = timer1;
  statusTimerRef.currentSaved = timer2;

  return () => {
    clearTimeout(timer1);
    clearTimeout(timer2);
  };
}, [
  tracks,
  bpm,
  filters,
  fx,
  volumes,
  positions3D,
  loopActive,
  loopStart,
  loopEnd,
  autosaveEnabled,
  user,
  isDataLoaded
]);
  
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
    // Не перетаскиваем, если клик был по блоку
    if (e.target.closest(".block")) return;
    
    e.preventDefault();
    const grid = scrollRef.current;
    const startClientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    
    isPlayheadDraggingRef.current = true; // <- флаг, что перетаскиваем
  
    const onMove = (moveEvent) => {
      const currentClientX = moveEvent.type.includes('touch') ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const rect = grid.getBoundingClientRect();
      const xInView = currentClientX - rect.left;
      const xInGrid = xInView + grid.scrollLeft;
      const boundedX = Math.max(0, xInGrid);
      playheadXRef.current = boundedX;
      if (loopStart !== 0 && loopEnd === 0) {
        setPreviewLoopEnd(boundedX);
      }
      if (playheadRef.current) {
        playheadRef.current.style.transform = `translateX(${Math.round(boundedX)}px)`;
      }
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
      isPlayheadDraggingRef.current = false; // <- сбрасываем флаг
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
    
    let frameCount = 0; // счётчик для уменьшения частоты обновления стейта
  
    const loop = () => {
      const now = Tone.now();
      const stepTime = 60 / bpm / 4;
      let elapsed = now - startTimeRef.current;
      const allBlocks = Object.values(tracks).flat();
  
      // Глобальная логика окончания трека (если есть блоки и луп выключен)
      if (allBlocks.length > 0) {
        const lastBlockEndPX = Math.max(...allBlocks.map(b => b.x + b.length));
        const globalLoopEndTime = (lastBlockEndPX / STEP_WIDTH) * stepTime;
  
        // Обновляем позицию (текущий такт/доля) только каждый второй кадр
        if (frameCount % 2 === 0) {
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
        }
  
        // Сброс трека, если конец и луп не активен
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
  // ========== МЕТРОНОМ ==========
if (metroOnRef.current && metroSynthRef.current) {
  const beatDuration = 60 / bpm;
  const currentBeatIndex = Math.floor(elapsed / beatDuration);
  const metroKey = `metro_${currentBeatIndex}`;
  if (elapsed >= currentBeatIndex * beatDuration && !triggeredRef.current.has(metroKey)) {
    const isFirstBeat = currentBeatIndex % 4 === 0;
    const freq = isFirstBeat ? 'A5' : 'A4';
    const velocity = isFirstBeat ? 0.8 : 0.4;

    // Для шума вызываем без частоты
    if (metroSoundRef.current === 'noise') {
      metroSynthRef.current.triggerAttackRelease('16n', now + 0.01, metroVolumeRef.current * velocity);
    } else {
      metroSynthRef.current.triggerAttackRelease(freq, '16n', now + 0.01, metroVolumeRef.current * velocity);
    }

    triggeredRef.current.add(metroKey);
  }
}

      // ========== ОБРАБОТКА НОТ (критично для звука – каждый кадр) ==========
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
              const pools = synth;
              if (!pools || !pools.membranePool) return;
              const durationSec = duration;
              const velocityAdjusted = Math.min(1, velocity * 1.2);
              const timeShift = (Math.abs(b.id) % 1000) * 0.0001;
              const startTime = now + 0.01 + timeShift;
              if (typeof pools.currentIndex !== 'number') pools.currentIndex = 0;
              const index = pools.currentIndex;
              pools.currentIndex = (pools.currentIndex + 1) % pools.membranePool.length;
              const membraneSynth = pools.membranePool[index];
              const noiseSynth = pools.noisePool[index];
              if (!membraneSynth || !noiseSynth) return;
              const drumIdx = (b.fret % 20) + (b.string % 3) * 20;
              const typeIdx = drumIdx % 20;
              noiseSynth.noise.type = "white";
              noiseSynth.envelope.decay = 0.2;
              membraneSynth.pitchDecay = 0.05;
              if (typeIdx >= 0 && typeIdx <= 7) {
                const pitchMap = ["C2", "D2", "E2", "F2", "G2", "A2", "B2", "C3"];
                membraneSynth.triggerAttackRelease(pitchMap[typeIdx], durationSec, startTime, velocityAdjusted);
              } else {
                switch (typeIdx) {
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
              }
            } else if (type === "bass") {
              synth.triggerAttackRelease(freq, duration, now + 0.01, velocity);
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
  
      // ========== ВИЗУАЛЬНЫЕ ОБНОВЛЕНИЯ (обновляем реже) ==========
      const x = (elapsed / stepTime) * STEP_WIDTH;
      playheadXRef.current = x;
  
      // activeStep – только каждый второй кадр
      if (frameCount % 2 === 0) {
        const currentStep = Math.floor(x / STEP_WIDTH);
        if (activeStep !== currentStep) setActiveStep(currentStep);
      }
  
      // Позиция плейхеда – обновляем всегда, кроме случаев, когда пользователь перетаскивает
if (!isPlayheadDraggingRef.current && playheadRef.current) {
  playheadRef.current.style.transform = `translateX(${Math.round(x)}px)`;
}
      
  
      // Автоскролл – всегда
      if (scrollRef.current) {
        const target = Math.max(0, x - FOLLOW_OFFSET);
        scrollRef.current.scrollLeft += (target - scrollRef.current.scrollLeft) * 0.08;
      }
  
      // VU-метр и амплитуда – только каждый второй кадр
      if (frameCount % 2 === 0 && meterRef.current) {
        const level = meterRef.current.getValue();
        let normalized = (level + 60) / 60;
        normalized = Math.min(1, Math.max(0, normalized));
        setMasterVolume(normalized);
        setWaveAmp(5 + normalized * 30);
      }
  
      // Увеличиваем счётчик кадров
      frameCount++;
  
      animationRef.current = requestAnimationFrame(loop);
    };
  
    loop();
  };

  const handleTogglePlay = async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start();
      console.log("Audio Context started!");
    }
    
    // Подсчитываем общее количество блоков (нот) на сетке
    const totalBlocks = Object.values(tracks).flat().length;
    
    // Если пытаемся запустить воспроизведение, а блоков нет – показываем предупреждение
    if (!isPlaying && totalBlocks === 0) {
      setInfoModal({
        visible: true,
        message: t('infoNoNotes')
      });
      return;
    }
    
    if (isPlaying) {
      // Остановка воспроизведения
      const now = Tone.now();
      cancelAnimationFrame(animationRef.current);
      pauseOffsetRef.current = now - startTimeRef.current; 
      setIsPlaying(false);
      
      setMasterVolume(0);
      if (window.__sidechain?.kickLoop) {
        window.__sidechain.kickLoop.stop();
      }
      Object.values(synthsRef.current).forEach(s => { 
        try { 
          if (s.releaseAll) s.releaseAll(); 
          else if (s.triggerRelease) s.triggerRelease(); 
        } catch(e) {} 
      });
    } else {
      // Запуск воспроизведения (блоки есть)
      await Tone.start();
      const now = Tone.now();
      startTimeRef.current = now - pauseOffsetRef.current;
      triggeredRef.current.clear();
      setIsPlaying(true);
      
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
    playheadXRef.current = 0;
    loopStartRef.current = 0;
    loopEndRef.current = 0;
  
    // ===== СБРОС SUB-РЕЖИМА (Bass) =====
    if (subMode) {
      setSubMode(false);
      localStorage.setItem("struna_sub_mode", "false");
      
      if (synthsRef.current.bass) {
        const oldSynth = synthsRef.current.bass;
        const filterNode = filtersRef.current.bass;
        const sidechainComp = window.__sidechain?.bassSidechainComp;
  
        const normalSynth = new Tone.MonoSynth({
          oscillator: { type: "fatsawtooth", count: 3, spread: 20 },
          envelope: { attack: 0.03, decay: 0.4, sustain: 0.8, release: 0.6 }
        });
  
        if (sidechainComp) {
          normalSynth.connect(sidechainComp);
          sidechainComp.connect(filterNode);
        } else {
          normalSynth.connect(filterNode);
        }
  
        oldSynth.dispose();
        synthsRef.current.bass = normalSynth;
      }
    }
    // Сброс 3D-позиций
    setPositions3D(defaultPositions);
  
    // ===== СБРОС ГЛОБАЛЬНОЙ ГРОМКОСТИ (MASTER VOL) =====
    setMasterGainValue(1.0);
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = 1.0;
    }
  
    // ===== НОВОЕ: СБРАСЫВАЕМ ID ПРОЕКТА И СТАТУС ИЗБРАННОГО =====
    setProjectId(null);
    setIsFavorite(false);
  };
  
  const generateAIPattern = () => {
    const inst = instrument;
    if (!inst) return;
  
    // Останавливаем текущее воспроизведение
    if (isPlaying) {
      cancelAnimationFrame(animationRef.current);
      setIsPlaying(false);
      if (window.__sidechain?.kickLoop) window.__sidechain.kickLoop.stop();
      Object.values(synthsRef.current).forEach(s => {
        try { s.releaseAll?.(); s.triggerRelease?.(); } catch(e) {}
      });
    }
  
    // Очищаем треки текущего инструмента
    setTracks(prev => ({ ...prev, [inst]: [] }));
  
    const now = Date.now();
    const stepSize = 20;
    // Длительность 20 секунд
    const TARGET_DURATION_SEC = 20;
    const stepDurationSec = 60 / bpm / 4;
    let numSteps = Math.ceil(TARGET_DURATION_SEC / stepDurationSec);
    numSteps = Math.min(numSteps, 256); // максимум 256 шагов
  
    const newBlocks = [];
    const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  
    // ========== ПАСХАЛКА: SUPER MARIO ДЛЯ CHIP (расширенная аранжировка) ==========
    if (inst === 'chip' && Math.random() < 0.15) {
      const melodyStr = 7;   // e (высокая)
      const harmonyStr = 5;  // D (средняя)
      const bassStr = 2;     // A (низкая)

      // Основная мелодия
      const melodyNotes = [
        { step: 0,  fret: 12, length: 1 }, { step: 2,  fret: 12, length: 1 }, { step: 6,  fret: 12, length: 1 },
        { step: 8,  fret: 8,  length: 1 }, { step: 10, fret: 12, length: 1 }, { step: 12, fret: 15, length: 2 },
        { step: 20, fret: 3,  length: 2 }, { step: 32, fret: 8,  length: 2 }, { step: 38, fret: 3,  length: 2 },
        { step: 44, fret: 0,  length: 2 }, { step: 50, fret: 5,  length: 1 }, { step: 54, fret: 7,  length: 1 },
        { step: 56, fret: 6,  length: 1 }, { step: 58, fret: 5,  length: 2 }, { step: 60, fret: 3,  length: 1 },
        { step: 64, fret: 12, length: 1 }, { step: 66, fret: 15, length: 1 }, { step: 68, fret: 17, length: 2 },
        { step: 72, fret: 13, length: 1 }, { step: 74, fret: 15, length: 1 }, { step: 76, fret: 12, length: 2 },
        { step: 80, fret: 8,  length: 1 }, { step: 82, fret: 10, length: 1 }, { step: 84, fret: 7,  length: 2 },
        { step: 92, fret: 5,  length: 2 }, { step: 96, fret: 3,  length: 2 }, { step: 100, fret: 8,  length: 2 },
        { step: 104, fret: 7,  length: 2 }, { step: 108, fret: 5,  length: 2 }, { step: 112, fret: 3,  length: 2 },
        { step: 116, fret: 0,  length: 4 },
      ];

      const harmonyNotes = melodyNotes.map(n => {
        let harmonyFret = n.fret;
        if (n.length > 0) {
          harmonyFret = Math.min(MAX_FRET, n.fret + 3); 
          if (harmonyFret > MAX_FRET) harmonyFret = n.fret - 3;
          if (harmonyFret < 0) harmonyFret = n.fret + 5;
        }
        return { ...n, fret: harmonyFret };
      });

      const bassNotes = melodyNotes.filter((_, i) => i % 2 === 0).map(n => {
        let bassFret = Math.max(0, n.fret - 12); 
        if (bassFret < 0) bassFret = 0;
        return { ...n, fret: bassFret, length: n.length * 2 }; 
      });

      const addNotes = (notes, stringIdx) => {
        notes.forEach((note, idx) => {
          if (note.step >= numSteps) return;
          const fret = Math.min(MAX_FRET, Math.max(0, note.fret));
          const x = note.step * stepSize;
          const lengthPx = note.length * stepSize * 1.5;
          const velocity = 0.85 + Math.random() * 0.15;
          newBlocks.push({
            id: now + idx + Math.random() + stringIdx * 1000,
            string: stringIdx,
            x: x,
            length: lengthPx,
            fret: fret,
            velocity: velocity,
            effect: null
          });
        });
      };

      addNotes(melodyNotes, melodyStr);
      addNotes(harmonyNotes, harmonyStr);
      addNotes(bassNotes, bassStr);

      setTracks(prev => ({ ...prev, [inst]: newBlocks }));
      if (uiSoundsEnabled) uiSounds.playClick();
      return; 
    }
  
    // -------------------------------------------------------------
    // ПАТТЕРНЫ
    // -------------------------------------------------------------
    const drumPatterns = [
      { steps: [0,4,8,12, 2,6,10,14] },  // Rock
      { steps: [0,6,10,12, 2,7,11,14] }, // Funk
      { steps: [0,4,8,12, 3,7,11,15] },  // Disco
      { steps: [0,4,8,12, 1,5,9,13] }    // Electronic
    ];
  
    const bassPatterns = [
      { steps: [0,4,8,12], frets: [0,2,4,5] },
      { steps: [0,3,6,10,12], frets: [0,3,5,7,5] },
      { steps: [0,6,12], frets: [0,3,5] },
      { steps: [0,4,8,12, 2,6,10,14], frets: [0,0,0,0, 2,2,2,2] }
    ];
  
    // -------------------------------------------------------------
    // МЕЛОДИЧЕСКАЯ ПЕНТАТОНИКА И ФУНКЦИИ
    // -------------------------------------------------------------
    const pentatonicMinor = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22];
  
    const generateMotif = (length, startFret) => {
      let motif = [];
      let prev = startFret;
      for (let i = 0; i < length; i++) {
        let interval;
        const r = Math.random();
        if (r < 0.6) interval = [0, 2, 3, 4][Math.floor(Math.random() * 4)]; 
        else if (r < 0.85) interval = 5; 
        else interval = 7; 
        let direction = Math.random() > 0.5 ? 1 : -1;
        let newFret = prev + direction * interval;
        newFret = Math.min(22, Math.max(0, newFret));
        let closest = pentatonicMinor.reduce((a, b) => Math.abs(b - newFret) < Math.abs(a - newFret) ? b : a);
        motif.push(closest);
        prev = closest;
      }
      return motif;
    };
  
    // -------------------------------------------------------------
    // ГЕНЕРАЦИЯ ДЛЯ БАРАБАНОВ
    // -------------------------------------------------------------
    if (inst === 'drum') {
      const KICK    = { fret: 0, string: 0 };
      const SNARE   = { fret: 4, string: 0 };
      const HIHAT_C = { fret: 8, string: 1 };
      const HIHAT_O = { fret: 12, string: 1 };
      const CRASH   = { fret: 16, string: 1 };
  
      const kickPatterns = [
        [0, 8], [0, 4, 8, 12], [0, 7, 10], [0, 8, 11], [0, 10],
        [0, 8, 10, 14], [0, 3, 8], [0, 4, 8, 12, 15], [0, 2, 8, 10], [0, 7, 8, 15]
      ];
      const snarePatterns = [
        [4, 12], [8], [4, 12, 15], [3, 6, 11, 14], [4, 10, 12],
        [4, 7, 12], [2, 6, 10, 14], [4, 12, 13, 14], [8, 14, 15], [4, 9, 12]
      ];
      const hatPatterns = [
        [0, 2, 4, 6, 8, 10, 12, 14], [2, 6, 10, 14], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        [0, 4, 8, 12], [0, 2, 4, 6, 8, 9, 10, 12, 14, 15], [0, 2, 3, 4, 6, 8, 10, 11, 12, 14],
        [0, 4, 8, 10, 12], [0, 3, 6, 9, 12], [2, 4, 6, 10, 12, 14], [0, 2, 8, 10]
      ];
  
      const currentKick = randomPick(kickPatterns);
      const currentSnare = randomPick(snarePatterns);
      const currentHat = randomPick(hatPatterns);
  
      for (let step = 0; step < numSteps; step++) {
        const stepInBar = step % 16;
        const x = step * stepSize;
  
        if (currentKick.includes(stepInBar)) {
          newBlocks.push({ id: now + step + Math.random(), string: KICK.string, x, length: stepSize, fret: KICK.fret, velocity: 0.85 + Math.random() * 0.15, effect: null });
        }
        if (currentSnare.includes(stepInBar)) {
          newBlocks.push({ id: now + step + Math.random() + 1000, string: SNARE.string, x, length: stepSize, fret: SNARE.fret, velocity: 0.8 + Math.random() * 0.2, effect: null });
        }
        if (currentHat.includes(stepInBar)) {
          const isOpen = Math.random() > 0.85 && stepInBar % 4 !== 0;
          const hat = isOpen ? HIHAT_O : HIHAT_C;
          newBlocks.push({ id: now + step + Math.random() + 2000, string: hat.string, x, length: stepSize, fret: hat.fret, velocity: 0.4 + Math.random() * 0.4, effect: null });
        }
        if (step % 32 === 0) {
          newBlocks.push({ id: now + step + Math.random() + 3000, string: CRASH.string, x, length: stepSize, fret: CRASH.fret, velocity: 1.0, effect: null });
        }
      }
    }
    // -------------------------------------------------------------
    // ГЕНЕРАЦИЯ ДЛЯ БАСА
    // -------------------------------------------------------------
    else if (inst === 'bass') {
      const pattern = randomPick(bassPatterns);
      const baseSteps = pattern.steps;
      let baseFrets = pattern.frets;

      const trans = Math.floor(Math.random() * 7) - 3;
      let frets = baseFrets.map(f => Math.min(22, Math.max(0, f + trans)));
      frets = frets.map(f => pentatonicMinor.reduce((a, b) => Math.abs(b - f) < Math.abs(a - f) ? b : a));
  
      for (let step = 0; step < numSteps; step++) {
        const patternStepIdx = step % baseSteps.length;
        const stepPos = baseSteps[patternStepIdx] + Math.floor(step / baseSteps.length) * 16;
        if (stepPos >= numSteps) continue;
        const fret = frets[patternStepIdx % frets.length];
        const stringIdx = Math.floor(Math.random() * 3);
        const lengthPx = 4 * stepSize;
        const x = stepPos * stepSize;
        const velocity = 0.7 + Math.random() * 0.3;
        newBlocks.push({
          id: now + step + Math.random(),
          string: stringIdx,
          x: x,
          length: lengthPx,
          fret: fret,
          velocity: velocity,
          effect: null
        });
      }
    }
    // -------------------------------------------------------------
    // ГЕНЕРАЦИЯ ДЛЯ МЕЛОДИЧЕСКИХ ИНСТРУМЕНТОВ
    // -------------------------------------------------------------
    else {
      const motifLength = Math.floor(Math.random() * 3) + 4; 
      const startFret = pentatonicMinor[Math.floor(Math.random() * pentatonicMinor.length)];
      const motif = generateMotif(motifLength, startFret);
  
      const motifDurationSteps = 8; 
      const repetitions = Math.ceil(numSteps / motifDurationSteps);
  
      const fullMelody = [];
      for (let rep = 0; rep < repetitions; rep++) {
        for (let i = 0; i < motif.length; i++) {
          let note = motif[i];
          if (Math.random() < 0.2) {
            note += (Math.random() > 0.5 ? 12 : -12);
            note = Math.min(24, Math.max(0, note));
            note = pentatonicMinor.reduce((a, b) => Math.abs(b - note) < Math.abs(a - note) ? b : a);
          }
          fullMelody.push(note);
        }
      }
  
      const totalNotes = fullMelody.length;
      const stepInterval = numSteps / totalNotes;
      const steps = [];
      for (let i = 0; i < totalNotes; i++) {
        let step = Math.floor(i * stepInterval);
        if (Math.random() > 0.7) {
          step += Math.floor(Math.random() * 3) - 1;
        }
        step = Math.min(numSteps - 1, Math.max(0, step));
        if (!steps.includes(step)) steps.push(step);
      }
      steps.sort((a,b)=>a-b);
  
      steps.forEach((step, idx) => {
        const fret = fullMelody[idx % fullMelody.length];
        let stringIdx;
        if (inst === 'guitar') stringIdx = Math.floor(Math.random() * 6) + 2;
        else stringIdx = Math.floor(Math.random() * strings.length);
        const lengthSteps = (Math.random() > 0.7) ? 2 : 1;
        const lengthPx = lengthSteps * stepSize;
        const x = step * stepSize;
        const velocity = 0.6 + Math.random() * 0.4;
        newBlocks.push({
          id: now + idx + Math.random(),
          string: stringIdx,
          x: x,
          length: lengthPx,
          fret: fret,
          velocity: velocity,
          effect: null
        });
      });
    }
  
    setTracks(prev => ({ ...prev, [inst]: newBlocks }));
    if (uiSoundsEnabled) uiSounds.playClick();
  };

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
  let offset = (maxEndX - minX) || STEP_WIDTH;
  if (offset === 0) offset = STEP_WIDTH;
  
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
  setSelectedBlockIds(new Set(nextClipboard.map(item => item.block.id)));
  copiedBlocksRef.current = nextClipboard;
  
  // Если воспроизведение активно, сбрасываем triggeredRef и перезапускаем движок
  if (isPlaying) {
    triggeredRef.current.clear();
    cancelAnimationFrame(animationRef.current);
    startEngine();
  }
  
  console.log("Вставлено последовательно", nextClipboard);
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
    // Горячие клавиши для выбора инструмента (1-5)
  if (e.code >= 'Digit1' && e.code <= 'Digit5') {
    const index = parseInt(e.code.replace('Digit', '')) - 1;
    const instruments = ['guitar', 'synth', 'drum', 'bass', 'chip'];
    if (instruments[index]) {
      e.preventDefault();
      setInstrument(instruments[index]);
      // опционально: короткий звуковой сигнал или вспышка
    }
    return;
  }

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
    // Горячая клавиша R — запись (Record)
    if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
     e.preventDefault();
     handleRecord();
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
    // 5. Клавиша D (при зажатом Ctrl) – дублировать выделенные блоки
 if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyD' || e.key === 'd' || e.key === 'в')) {
  e.preventDefault();
  if (selectedBlockIds.size > 0) {
    // Сначала копируем, затем вставляем (используя существующие функции)
    copySelectedBlocks();
    pasteBlocks();
  }
  return;
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
  if (user?.email) {
    localStorage.removeItem(`struna_autosave_${user.email}`);
  }
  localStorage.removeItem("struna_user");
  setUser(null);
  setMode("landing");
};
  const toggleSubMode = async () => {
    const newMode = !subMode;
    setSubMode(newMode);
    localStorage.setItem("struna_sub_mode", newMode);
  
    // Если синтезатор баса ещё не создан – ничего не делаем
    if (!synthsRef.current.bass) return;
  
    const oldSynth = synthsRef.current.bass;
    const filterNode = filtersRef.current.bass;
    const sidechainComp = window.__sidechain?.bassSidechainComp;
  
    let newSynth;
    if (newMode) {
      // САБВУФЕРНЫЙ РЕЖИМ: чистая синусоида + низкий фильтр
      newSynth = new Tone.MonoSynth({
        oscillator: { type: "sine" },
        filter: { type: "lowpass", frequency: 120, Q: 8, rolloff: -12 },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.9, release: 1.0 },
        filterEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.5, baseFrequency: 60, octaves: 2 }
      });
    } else {
      // ОБЫЧНЫЙ РЕЖИМ
      newSynth = new Tone.MonoSynth({
        oscillator: { type: "fatsawtooth", count: 3, spread: 20 },
        envelope: { attack: 0.03, decay: 0.4, sustain: 0.8, release: 0.6 }
      });
    }
  
    if (sidechainComp) {
      newSynth.connect(sidechainComp);
      sidechainComp.connect(filterNode);
    } else {
      newSynth.connect(filterNode);
    }
  
    oldSynth.dispose();
    synthsRef.current.bass = newSynth;
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
    const newFret = Math.max(0, Math.min(MAX_FRET, state.initialFret + fretChange));
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
  const labelStyle = { fontSize: "11px", fontWeight: "bold", color: "#AAB3C2", textAlign: "center", lineHeight: 1.2 };

const menuItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '100%',
  padding: '10px 16px',
  background: 'transparent',
  border: 'none',
  color: 'var(--text-primary)',
  fontSize: '12px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  textAlign: 'left',
  fontFamily: 'inherit'
};
  // ========== ДОБАВЬТЕ ЭТУ ФУНКЦИЮ ПРЯМО СЮДА ==========
  const getInstrumentColor = (inst) => {
    switch(inst) {
      case 'guitar': return '#FFB84D';
      case 'synth':  return '#4DC3FF';
      case 'drum':   return '#FF4D4D';
      case 'bass':   return '#BD00FF';
      case 'chip':   return '#4DFF88';
      default:       return '#4D88FF';
    }
  };
  
  if (mode === "landing") {
    return (
      <div className={`app landing ${theme === 'light' ? 'light-theme' : ''}`}>
        <div className="landing-content" style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",  // ← растягиваем по вертикали
          minHeight: "100vh",
          width: "100%",
          padding: "16px 20px",             // ← уменьшили отступы
          paddingTop: "4vh",                // ← убрали большой отступ сверху
          paddingBottom: "2vh",
          boxSizing: "border-box"
        }}>
          {/* ===== КОНФЕТТИ ===== */}
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            numberOfPieces={120}             // ← чуть меньше для производительности
            recycle={true}
            gravity={0.1}
            colors={['#ff0080', '#ff8c00', '#ffff00', '#00ff80', '#00bfff', '#8a2be2', '#ff4d4d', '#4dc3ff']}
            style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, pointerEvents: 'none' }}
          />
  
          {/* ===== ВОЗДУШНЫЕ ШАРИКИ ===== */}
          <div className="balloon-container">
            {[...Array(8)].map((_, i) => {   // ← меньше шариков
              const colors = ['#ff4d4d', '#4dc3ff', '#ffb84d', '#4dff88', '#bd00ff', '#ff4dfc', '#ffaa00', '#00d2ff'];
              const left = Math.random() * 100;
              const duration = 10 + Math.random() * 15;
              const delay = Math.random() * 10;
              const size = 30 + Math.random() * 35;
              return (
                <div
                  key={i}
                  className="balloon"
                  style={{
                    left: `${left}%`,
                    width: `${size}px`,
                    height: `${size * 1.2}px`,
                    backgroundColor: colors[i % colors.length],
                    animationDuration: `${duration}s`,
                    animationDelay: `${delay}s`,
                    borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%',
                    boxShadow: `inset -5px -5px 15px rgba(0,0,0,0.2), 0 0 10px ${colors[i % colors.length]}`
                  }}
                />
              );
            })}
          </div>
  
          {/* ===== ВЕРХНИЕ КНОПКИ (тема, гугл, язык) ===== */}
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            <button onClick={toggleTheme} className="top-btn">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <div 
              onClick={() => login()}
              style={{
                background: 'rgba(255,255,255,0.07)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.15)',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            </div>
            <button onClick={toggleLang} className="top-btn">
              {lang === 'en' ? 'EN' : 'RU'}
            </button>
          </div>
  
          {/* ===== ЛОГОТИП ===== */}
          <div className="logo-wrapper" style={{ marginTop: "10px" }}>
            <h1 className="neon-struna" style={{ marginBottom: "0px", fontSize: "clamp(48px, 12vw, 100px)" }}>STRUNA</h1>
          </div>
  
          {/* ===== ПОЗДРАВЛЕНИЕ ===== */}
          <div style={{ marginTop: "5px", marginBottom: "10px", textAlign: "center" }}>
            <h2 style={{
              fontSize: "clamp(20px, 3.5vw, 34px)",
              fontWeight: "bold",
              background: "linear-gradient(135deg, #ff0080, #ff8c00, #ffff00, #00ff80, #00bfff, #8a2be2)",
              backgroundSize: "300% 300%",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "neonFlowSmooth 4s ease-in-out infinite",
              margin: "0 0 4px 0",
              letterSpacing: "1px"
            }}>
              {t('birthdayTitle')}
            </h2>
            <p style={{
              fontSize: "clamp(12px, 1.4vw, 18px)",
              color: "var(--text-accent)",
              textShadow: "0 0 10px var(--text-accent)",
              margin: "0",
              fontWeight: "300",
              letterSpacing: "1.5px"
            }}>
              {t('birthdaySubtitle')}
            </p>
          </div>
  
          {/* ===== КНОПКА ===== */}
          <button
            onClick={() => handleStartCreating("guitar")}
            className="start-btn"
            style={{
              marginTop: "5px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              padding: "10px 24px"
            }}
          >
            <span style={{ fontSize: "inherit", lineHeight: 1.2 }}>{t('startBtn')}</span>
            <span style={{
              fontSize: "9px",
              opacity: 0.8,
              letterSpacing: "1.5px",
              color: "rgba(255,255,255,0.8)",
              fontWeight: "500"
            }}>
              🎧 3D SOUND
            </span>
          </button>
   {/* ===== НОВАЯ КНОПКА "С ДНЁМ РОЖДЕНИЯ" ===== */}
   <button
          onClick={playBirthdaySong}
          className="birthday-btn"
          style={{
            marginTop: "10px",
            padding: "8px 20px",
            borderRadius: "30px",
            border: "2px solid var(--text-accent)",
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(8px)",
            color: "var(--text-accent)",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "all 0.3s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 0 15px rgba(77,136,255,0.2)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(77,136,255,0.2)";
            e.currentTarget.style.boxShadow = "0 0 30px rgba(77,136,255,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.boxShadow = "0 0 15px rgba(77,136,255,0.2)";
          }}
        >
          {t('birthdayBtn')}
        </button>
          {/* ===== ПРЕВЬЮ (список инструментов) ===== */}
          <div className="preview" style={{ marginTop: "15px", width: "340px" }}>
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
  
          {/* ===== ПОДВАЛ ===== */}
          <div style={{
            textAlign: "center",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            marginTop: "auto",
            position: "relative",
            zIndex: 2,
            paddingBottom: "8px"
          }}>
            <p
              className="powered-by-text"
              style={{
                fontSize: "9px",
                letterSpacing: "3px",
                textTransform: "uppercase",
                margin: 0,
                fontFamily: "sans-serif"
              }}
            >
              Powered By <span className="neon-kargani" style={{ fontWeight: "bold" }}>KARGANI STUDIO</span>
            </p>
            <span style={{
              fontSize: "8px",
              color: "#4D88FF",
              opacity: 0.6,
              letterSpacing: "1px",
              textTransform: "uppercase",
              padding: "2px 8px",
              border: "1px solid rgba(77, 136, 255, 0.2)",
              borderRadius: "4px"
            }}>
              {t('desktopOnly')}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`app ${theme === 'light' ? 'light-theme' : ''}`}>
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
        color: "var(--text-primary)",
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
        e.currentTarget.style.color = "var(--text-primary)";
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
        <span style={{ fontSize: "10px", color: "#4D88FF", opacity: 0.7 }}>v1.5.3.3-BETA</span>
      </div>
    </div>
  </div>

  {/* ===== ПРАВАЯ ЧАСТЬ ===== */}
  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    {user ? (
      // ===== АВТОРИЗОВАННЫЙ ПОЛЬЗОВАТЕЛЬ: меню «МОЯ СТРУНА» =====
      <div style={{ position: 'relative' }} ref={userMenuRef}>
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="user-profile-btn"
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4D88FF, #8A2BE2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            {user.picture ? (
              <img src={user.picture} alt="avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              user.email?.[0]?.toUpperCase() || 'U'
            )}
          </div>
          <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: 'var(--text-accent)' }}>
            {t('myStruna')}
          </span>
          <span style={{ 
            fontSize: '10px', 
            color: 'var(--text-secondary)', 
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
            transform: isUserMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' 
          }}>
            ▲
          </span>
        </button>

        {isUserMenuOpen && (
          <div className="liquid-glass-menu">
            <div className="user-info">
              <div className="user-name">{user.name || user.email}</div>
              <div className="user-email">{user.email}</div>
            </div>
           {/* 👇 ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ С ПЕРЕВОДОМ */}
<div className="menu-item theme-toggle-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 24px' }}>
  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
    {theme === 'dark' ? '🌙' : '☀️'} {t('theme')}
  </span>
  <label className="theme-switch">
    <input type="checkbox" checked={theme === 'light'} onChange={toggleTheme} />
    <span className="slider"></span>
  </label>
</div>

            <button className="menu-item" onClick={() => { handleSaveProject(); setIsUserMenuOpen(false); }}>
              {t('saveProject')}
            </button>
            <button className="menu-item" onClick={() => { fileInputRef.current.click(); setIsUserMenuOpen(false); }}>
              {t('loadProject')}
            </button>
            <button className="menu-item" onClick={() => { handleDriveSave(); setIsUserMenuOpen(false); }}>
              {t('driveSaveProject')}
            </button>
            <button className="menu-item" onClick={() => { handleSaveProjectToCloud(); setIsUserMenuOpen(false); }}>
              {t('saveToCloud')}
            </button>
            <button className="menu-item" onClick={() => { handleShare(); setIsUserMenuOpen(false); }}>
              {t('shareProject')}
            </button>
            <button className="menu-item" onClick={() => { exportMIDI(); setIsUserMenuOpen(false); }}>
              {t('exportMIDI')}
            </button>
            
            <button className="menu-item" onClick={() => { setShowFavoritesModal(true); setIsUserMenuOpen(false); }}>
              ⭐ {t('favorites')}
            </button>

            <div className="divider" />

            <button className="menu-item autosave-item" onClick={() => { setAutosaveEnabled(!autosaveEnabled); setIsUserMenuOpen(false); }}>
  <span>{t('autosaveToggle')}</span>
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <div className={`custom-checkbox ${autosaveEnabled ? 'checked' : ''}`}></div>
    {autosaveEnabled && autosaveStatus === 'saved' && (
      <span style={{ color: '#4DFF88', fontSize: '14px' }}>✓</span>
    )}
    {autosaveEnabled && autosaveStatus === 'saving' && (
      <span className="fav-status-spinner" style={{ color: '#FFB84D', fontSize: '14px' }}>⟳</span>
    )}
  </div>
</button>

            <div className="divider" />

            <button className="menu-item logout" onClick={() => { handleLogout(); setIsUserMenuOpen(false); }}>
              {t('logout')}
            </button>
          </div>
        )}
      </div>
    ) : (
      // ===== НЕАВТОРИЗОВАННЫЙ ПОЛЬЗОВАТЕЛЬ: кнопки SAVE и LOAD =====
      <>
        <button onClick={handleSaveProject} className="save-btn">💾 {t('save')}</button>
        <button onClick={() => fileInputRef.current.click()} className="load-btn">📂 {t('load')}</button>
        <UserProfile user={user} onLogout={handleLogout} />
      </>
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
      <span className="inst-text" style={{ fontSize: "9px" }}>{t('info')}</span>
      {isTempoMasterVisible && <div className="active-glow"></div>}
    </button>
    <button
      onClick={() => setShowFX(!showFX)}
      className={`inst-btn fx-toggle-btn ${showFX ? "fx-active" : ""}`}
      style={{ borderRadius: "0 20px 20px 0" }}
    >
      <span className="inst-icon">⚙️</span>
      <span className="inst-text" style={{ fontSize: "9px" }}>{t('fx')}</span>
      {showFX && <div className="active-glow"></div>}
    </button>
    <button
  onClick={() => setShow3D(!show3D)}
  className={`inst-btn fx-toggle-btn ${show3D ? "fx-active" : ""}`}
  style={{ borderRadius: "0 20px 20px 0" }}
>
  <span className="inst-icon">🎛️</span>
  <span className="inst-text" style={{ fontSize: "9px" }}>3D</span>
  {show3D && <div className="active-glow"></div>}
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

    {/* ========== БЛОК TEMPO ========== */}
<div style={{
  background: "var(--bg-card)",
  padding: "15px",
  borderRadius: "12px",
  border: "1px solid var(--border-color)",
  boxShadow: "var(--shadow)",
  width: "200px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  boxSizing: "border-box"
}}>
  <div>
    <div style={{ fontSize: "12px", color: "var(--text-accent)", marginBottom: "6px" }}>{t('tempo')}</div>
    <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--text-bright)" }}>{bpm}</div>
    <div style={{ fontSize: "10px", color: "var(--text-accent)", marginBottom: "12px" }}>{t('bpm')}</div>

    {/* ===== КНОПКА МЕТРОНОМА ===== */}
    <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
      <button
        onClick={() => {
          if (!metroOn) Tone.start();
          setMetroOn(!metroOn);
        }}
        style={{
          background: metroOn ? 'rgba(77, 255, 136, 0.15)' : 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: `2px solid ${metroOn ? 'var(--text-bright)' : 'var(--border-color)'}`,
          borderRadius: '20px',
          padding: '4px 12px',
          color: metroOn ? 'var(--text-bright)' : 'var(--text-secondary)',
          fontSize: '9px',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          boxShadow: metroOn ? '0 0 15px rgba(77,255,136,0.2)' : 'none',
          width: '100%',
          maxWidth: '120px',
          letterSpacing: '0.5px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {metroOn ? t('metroOn') : t('metroOff')}
      </button>
    </div>

    {/* ===== УПРАВЛЕНИЕ МЕТРОНОМОМ (громкость + звук) ===== */}
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      marginBottom: "12px",
      width: "100%",
      alignItems: "center"
    }}>
      {/* Ползунок громкости */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center", width: "100%" }}>
        <span style={{ fontSize: "9px", color: "var(--text-secondary)" }}>🔊</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={metroVolume}
          onChange={(e) => setMetroVolume(parseFloat(e.target.value))}
          style={{
            flex: 1,
            height: "4px",
            cursor: "pointer",
            maxWidth: "100px",
            background: metroOn ? "var(--text-bright)" : "var(--border-color)"
          }}
        />
        <span style={{ fontSize: "8px", color: "var(--text-bright)", minWidth: "24px" }}>
          {Math.round(metroVolume * 100)}%
        </span>
      </div>

      {/* ===== ВЫБОР ЗВУКА (стеклянный select с переводом) ===== */}
<div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "center", width: "100%", position: "relative" }}>
  <span style={{ fontSize: "9px", color: "var(--text-secondary)" }}>🎵</span>
  <div style={{ position: "relative", width: "100%", maxWidth: "120px" }}>
    <select
      value={metroSound}
      onChange={(e) => setMetroSound(e.target.value)}
      className="glass-select"
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid var(--border-color)",
        borderRadius: "12px",
        padding: "4px 28px 4px 12px",
        color: "var(--text-primary)",
        fontSize: "9px",
        fontWeight: "bold",
        cursor: "pointer",
        outline: "none",
        width: "100%",
        transition: "all 0.25s ease"
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
    >
      <option value="click" style={{ background: "var(--bg-card)" }}>🎵 {t('metroSoundClick')}</option>
      <option value="beep" style={{ background: "var(--bg-card)" }}>🔔 {t('metroSoundBeep')}</option>
      <option value="drum" style={{ background: "var(--bg-card)" }}>🥁 {t('metroSoundDrum')}</option>
      <option value="noise" style={{ background: "var(--bg-card)" }}>🎛️ {t('metroSoundNoise')}</option>
      <option value="bell" style={{ background: "var(--bg-card)" }}>🔔 {t('metroSoundBell')}</option>
    </select>
    {/* Кастомная стрелка */}
    <div style={{
      position: "absolute",
      right: "8px",
      top: "50%",
      transform: "translateY(-50%)",
      pointerEvents: "none",
      color: "var(--text-secondary)",
      fontSize: "8px"
    }}>
      ▼
    </div>
  </div>
</div>
    </div>
  </div>

  <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
    {/* Строка кнопок SET LOOP и LOOP ON/OFF */}
    <div style={{ 
      display: "flex", 
      gap: "8px", 
      marginBottom: "16px", 
      alignItems: "stretch", 
      justifyContent: "center",
      width: "100%"
    }}>
      <button onClick={() => {
        const currentX = playheadXRef.current;
        if (loopStart === 0 && loopEnd === 0) {
          setLoopStart(currentX);
          setLoopEnd(0);
          setPreviewLoopEnd(currentX);
        } else if (loopStart !== 0 && loopEnd === 0) {
          let endX = (previewLoopEnd > loopStart) ? previewLoopEnd : currentX;
          if (endX <= loopStart) {
            endX = loopStart + STEP_WIDTH;
          }
          setLoopEnd(endX);
          setPreviewLoopEnd(0);
          setLoopActive(true);
        } else {
          setLoopStart(0);
          setLoopEnd(0);
          setPreviewLoopEnd(0);
          setLoopActive(false);
        }
      }} style={{
        flex: 1,
        background: "var(--bg-card)",
        border: `2px solid ${loopStart === 0 ? "var(--text-bright)" : (loopEnd === 0 ? "#FFA500" : "var(--warning-border)")}`,
        borderRadius: "20px",
        padding: "4px",
        color: loopStart === 0 ? "var(--text-bright)" : (loopEnd === 0 ? "#FFA500" : "var(--warning-border)"),
        fontSize: "8px",
        fontWeight: "bold",
        cursor: "pointer",
        minWidth: 0,
        whiteSpace: "normal", 
        lineHeight: "1.1",
        letterSpacing: '0.2px',
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center"
      }}>
        {loopStart === 0 ? t('setLoop') : (loopEnd === 0 ? t('setEnd') : t('resetLoop'))}
      </button>

      <button onClick={() => {
        if (loopStart !== 0 && loopEnd !== 0 && loopEnd > loopStart) setLoopActive(!loopActive);
        else setInfoModal({ visible: true, message: t('infoSetLoop') });
      }} style={{
        flex: 1,
        background: loopActive ? "var(--text-bright)" : "var(--bg-card)",
        border: `2px solid ${loopActive ? "var(--text-bright)" : "var(--warning-border)"}`,
        borderRadius: "20px",
        padding: "4px",
        color: loopActive ? "var(--bg-card)" : "var(--warning-border)",
        fontSize: "8px",
        fontWeight: "bold",
        cursor: "pointer",
        minWidth: 0,
        whiteSpace: "normal",
        lineHeight: "1.1",
        letterSpacing: '0.2px',
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center"
      }}>
        {loopActive ? t('loopOn') : t('loopOff')}
      </button>
    </div>

    <input 
      type="range" 
      min="60" 
      max="200" 
      value={bpm} 
      onChange={(e) => setBpm(Number(e.target.value))} 
      style={{ width: "100%", cursor: "pointer", boxSizing: "border-box" }} 
    />
  </div>
</div>
    {/* ========== БЛОК ATTACH EFFECT ========== */}
    <div style={{
  background: "var(--bg-card)",
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid var(--border-color)",
  boxShadow: "var(--shadow)",
  width: "200px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between"
}}>
  <div>
  <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
  {[
    { name: 'click', icon: '🔊', play: () => uiSounds.playClick() },
    { name: 'pop', icon: '🎯', play: () => uiSounds.playPop() },
    { name: 'pixel', icon: '🕹️', play: () => uiSounds.playPixel() },
    { name: 'boom', icon: '💥', play: () => uiSounds.playBoom() },
    { name: 'chirp', icon: '🐤', play: () => uiSounds.playChirp() }
  ].map(effect => (
    <button
      key={effect.name}
      onClick={(e) => {
        const btn = e.currentTarget;
        btn.classList.add('btn-flash');
        setTimeout(() => btn.classList.remove('btn-flash'), 150);
        applyEffectToSelectedBlocks(effect.name);
        effect.play();
      }}
      style={{
        background: "var(--btn-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: "20px",
        padding: "6px 8px",
        color: "var(--text-accent)",
        cursor: "pointer",
        fontSize: "12px",
        transition: "all 0.05s linear"
      }}
    >
      {effect.icon}
    </button>
  ))}
  <button
    onClick={(e) => {
      const btn = e.currentTarget;
      btn.classList.add('btn-flash-red');
      setTimeout(() => btn.classList.remove('btn-flash-red'), 150);
      applyEffectToSelectedBlocks(null);
    }}
    style={{
      background: "var(--btn-bg)",
      border: "1px solid var(--border-color)",
      borderRadius: "20px",
      padding: "6px 8px",
      color: "#FFB84D",
      cursor: "pointer",
      fontSize: "12px",
      transition: "all 0.05s linear"
    }}
  >
    ❌
  </button>
</div>
    <div style={{ fontSize: "9px", color: "var(--text-secondary)", marginBottom: "8px" }}>{t('selectBlock')}</div>
    <button
      onClick={(e) => {
        const btn = e.currentTarget;
        btn.classList.add('btn-flash-red');
        setTimeout(() => btn.classList.remove('btn-flash-red'), 200);
        removeAllEffects();
      }}
      style={{ backgroundColor: "var(--btn-bg)", border: "1px solid var(--warning-border)", borderRadius: "20px", padding: "6px 8px", width: "100%", color: "var(--warning-border)", cursor: "pointer", fontSize: "10px", fontWeight: "bold", marginBottom: "8px", transition: "all 0.05s linear" }}
    >
      {t('removeAllEffects')}
    </button>
  </div>
  <div>
    <button
      onClick={toggleSubMode}
      style={{ background: "rgba(77,136,255,0.1)", border: `2px solid ${subMode ? "#bd00ff" : "var(--text-accent)"}`, borderRadius: "20px", padding: "6px 12px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", transition: "all 0.1s ease" }}
    >
      <span style={{ fontSize: "14px" }}>🔊</span>
      <span style={{ fontSize: "10px", fontWeight: "bold", color: subMode ? "#bd00ff" : "var(--text-accent)" }}>
        {subMode ? t('subOn') : t('subOff')}
      </span>
    </button>
  </div>
</div>

    {/* ========== БЛОК MASTER VOL ========== */}
    <div style={{
  background: "var(--bg-card)",
  padding: "15px",
  borderRadius: "12px",
  border: "1px solid var(--border-color)",
  boxShadow: "var(--shadow)",
  width: "200px",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between"
}}>
  <div>
    <div style={{ fontSize: "10px", color: "var(--text-accent)", marginBottom: "4px" }}>{t('masterVol')}</div>
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
      <span style={{ fontSize: "12px" }}>🔊</span>
      <input type="range" min="0" max="1" step="0.01" value={masterGainValue} onChange={(e) => { const val = parseFloat(e.target.value); setMasterGainValue(val); if (masterGainRef.current) masterGainRef.current.gain.rampTo(val, 0.05); }} style={{ flex: 1, height: "4px" }} />
    </div>
    <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--text-bright)", textShadow: "0 0 8px var(--text-bright)", marginBottom: "12px" }}>
      {Math.round(masterGainValue * 100)}%
    </div>
  </div>
  <div>
    <div style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
      <button onClick={() => setMasterDisplayMode("vu")} style={{ background: masterDisplayMode === "vu" ? "var(--text-bright)" : "transparent", border: `1px solid ${masterDisplayMode === "vu" ? "var(--text-bright)" : "var(--text-accent)"}`, borderRadius: "20px", padding: "4px 8px", fontSize: "8px", color: masterDisplayMode === "vu" ? "var(--bg-card)" : "var(--text-accent)", fontWeight: "bold", cursor: "pointer" }}>{t('vu')}</button>
      <span style={{ fontSize: "10px", color: "var(--text-accent)" }}>{t('master')}</span>
      <button onClick={() => setMasterDisplayMode("wave")} style={{ background: masterDisplayMode === "wave" ? "var(--text-bright)" : "transparent", border: `1px solid ${masterDisplayMode === "wave" ? "var(--text-bright)" : "var(--text-accent)"}`, borderRadius: "20px", padding: "4px 8px", fontSize: "8px", color: masterDisplayMode === "wave" ? "var(--bg-card)" : "var(--text-accent)", fontWeight: "bold", cursor: "pointer" }}>{t('wave')}</button>
    </div>
    {masterDisplayMode === "vu" ? (
      <div style={{ marginBottom: "8px" }}>
        <div style={{ display: "flex", gap: "3px", justifyContent: "center", alignItems: "flex-end", height: "35px" }}>
          {[...Array(20)].map((_, idx) => {
            const intensity = idx / 20;
            const isActive = masterVolume > intensity;
            let color = "var(--text-bright)";
            if (intensity > 0.7) color = "#FFB84D";
            if (intensity > 0.9) color = "var(--warning-border)";
            return <div key={idx} style={{ width: "5px", height: `${6 + intensity * 25}px`, backgroundColor: isActive ? color : "rgba(var(--bg-card-rgb), 0.2)", borderRadius: "2px", transition: "height 0.05s" }} />;
          })}
        </div>
      </div>
    ) : (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "55px", marginBottom: "8px" }}>
        <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: `radial-gradient(circle, ${masterVolume < 0.33 ? "rgba(77,255,136,0.4)" : masterVolume < 0.66 ? "rgba(255,184,77,0.4)" : "rgba(255,77,77,0.4)"}, transparent)`, border: `2px solid ${masterVolume < 0.33 ? "var(--text-bright)" : masterVolume < 0.66 ? "#FFB84D" : "var(--warning-border)"}`, transform: `scale(${0.4 + masterVolume * 0.8})`, transition: "all 0.05s" }} />
      </div>
    )}
    <div style={{ fontSize: "14px", fontWeight: "bold", color: "var(--text-bright)", marginTop: "6px" }}>{currentPosition.seconds.toFixed(1)}s</div>
    <div style={{ fontSize: "9px", color: "var(--text-accent)" }}>({currentPosition.bar}.{currentPosition.beat})</div>
  </div>
</div>

  </div>
</div>

{/* FX-панель (ползунки) – выровнена по высоте */}
<div style={{ maxHeight: showFX ? "300px" : "0px", opacity: showFX ? 1 : 0, overflow: "hidden", transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)", marginBottom: showFX ? 30 : 0, width: "640px" }}>
  <div style={{
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "12px",
    boxShadow: "var(--shadow)",
    padding: "15px 20px 20px 20px",
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: "16px",
    width: "100%",
    boxSizing: "border-box"
  }}>
    <div style={{ gridColumn: "span 6", textAlign: "center", marginBottom: "6px", fontSize: "11px", fontWeight: "bold", letterSpacing: "2px", color: getInstrumentColor(instrument) }}>
      {instrument.toUpperCase()}
    </div>

    {/* VOLUME */}
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", minHeight: "100px" }}>
      <div style={{ textAlign: "center", fontSize: "9px", fontWeight: "bold", color: "var(--text-secondary)", lineHeight: 1.2 }}>
        {t('volume')}<br/><span style={{ fontSize: "12px", color: "var(--text-bright)" }}>{volumes[instrument].toFixed(2)}</span>
      </div>
      <input type="range" min="0" max="1" step="0.01" value={volumes[instrument]} onChange={(e) => setVolumes(prev => ({ ...prev, [instrument]: Number(e.target.value) }))} style={{ width: "90%", margin: "4px 0" }} />
      <button style={{ ...resetBtnStyle, fontSize: "9px", padding: "2px 8px" }} onClick={() => setVolumes(prev => ({ ...prev, [instrument]: 1.0 }))}>{t('reset')}</button>
    </div>
    {/* FX VOLUME */}
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", minHeight: "100px" }}>
      <div style={{ textAlign: "center", fontSize: "9px", fontWeight: "bold", color: "var(--text-secondary)", lineHeight: 1.2 }}>
        {t('fxVol')}<br/><span style={{ fontSize: "12px", color: "var(--text-bright)" }}>{fxVolume.toFixed(2)}</span>
      </div>
      <input type="range" min="0" max="1" step="0.01" value={fxVolume} onChange={(e) => setFxVolume(parseFloat(e.target.value))} style={{ width: "90%", margin: "4px 0" }} />
      <button style={{ ...resetBtnStyle, fontSize: "9px", padding: "2px 8px" }} onClick={() => setFxVolume(0.5)}>{t('reset')}</button>
    </div>
    {/* CUTOFF */}
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", minHeight: "100px" }}>
      <div style={{ textAlign: "center", fontSize: "9px", fontWeight: "bold", color: "var(--text-secondary)", lineHeight: 1.2 }}>
        {t('cutoff')}<br/><span style={{ fontSize: "12px", color: "var(--text-bright)" }}>{filters[instrument].cutoff}</span>
      </div>
      <input type="range" min="200" max="10000" value={filters[instrument].cutoff} onChange={(e) => setFilters(p => ({ ...p, [instrument]: { ...p[instrument], cutoff: Number(e.target.value) } }))} style={{ width: "90%", margin: "4px 0" }} />
      <button style={{ ...resetBtnStyle, fontSize: "9px", padding: "2px 8px" }} onClick={() => setFilters(p => ({ ...p, [instrument]: { ...p[instrument], cutoff: 8000 } }))}>{t('reset')}</button>
    </div>
    {/* Q (RES) */}
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", minHeight: "100px" }}>
      <div style={{ textAlign: "center", fontSize: "9px", fontWeight: "bold", color: "var(--text-secondary)", lineHeight: 1.2 }}>
        {t('q')}<br/><span style={{ fontSize: "12px", color: "var(--text-bright)" }}>{filters[instrument].q}</span>
      </div>
      <input type="range" min="0.1" max="20" step="0.1" value={filters[instrument].q} onChange={(e) => setFilters(p => ({ ...p, [instrument]: { ...p[instrument], q: Number(e.target.value) } }))} style={{ width: "90%", margin: "4px 0" }} />
      <button style={{ ...resetBtnStyle, fontSize: "9px", padding: "2px 8px" }} onClick={() => setFilters(p => ({ ...p, [instrument]: { ...p[instrument], q: 1 } }))}>{t('reset')}</button>
    </div>
    {/* CHORUS */}
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", minHeight: "100px" }}>
      <div style={{ textAlign: "center", fontSize: "9px", fontWeight: "bold", color: "var(--text-secondary)", lineHeight: 1.2 }}>
        {t('chorus')}<br/><span style={{ fontSize: "12px", color: "var(--text-bright)" }}>{fx[instrument].chorus.toFixed(2)}</span>
      </div>
      <input type="range" min="0" max="1" step="0.01" value={fx[instrument].chorus} onChange={(e) => setFx(p => ({ ...p, [instrument]: { ...p[instrument], chorus: Number(e.target.value) } }))} style={{ width: "90%", margin: "4px 0" }} />
      <button style={{ ...resetBtnStyle, fontSize: "9px", padding: "2px 8px" }} onClick={() => setFx(p => ({ ...p, [instrument]: { ...p[instrument], chorus: 0.3 } }))}>{t('reset')}</button>
    </div>
    {/* REVERB */}
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", minHeight: "100px" }}>
      <div style={{ textAlign: "center", fontSize: "9px", fontWeight: "bold", color: "var(--text-secondary)", lineHeight: 1.2 }}>
        {t('reverb')}<br/><span style={{ fontSize: "12px", color: "var(--text-bright)" }}>{fx[instrument].reverb.toFixed(2)}</span>
      </div>
      <input type="range" min="0" max="1" step="0.01" value={fx[instrument].reverb} onChange={(e) => setFx(p => ({ ...p, [instrument]: { ...p[instrument], reverb: Number(e.target.value) } }))} style={{ width: "90%", margin: "4px 0" }} />
      <button style={{ ...resetBtnStyle, fontSize: "9px", padding: "2px 8px" }} onClick={() => setFx(p => ({ ...p, [instrument]: { ...p[instrument], reverb: 0.25 } }))}>{t('reset')}</button>
    </div>
  </div>
</div>
{/* ===== НОВАЯ ПАНЕЛЬ 3D (одна строка с цветным инструментом) ===== */}
<div style={{
  overflow: "hidden",
  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  maxHeight: show3D ? "150px" : "0px",
  opacity: show3D ? 1 : 0,
  marginBottom: show3D ? "30px" : "0px",
  width: "640px"
}}>
  <div style={{
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "12px",
    boxShadow: "var(--shadow)",
    padding: "15px 20px 20px 20px",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    width: "100%",
    boxSizing: "border-box"
  }}>
    {/* Шапка: одна строка "3D + инструмент" */}
    <div style={{
  width: "100%",
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  marginBottom: "4px",
  gap: "8px"
}}>
  {/* Левая колонка (пусто, чтобы центрировать среднюю) */}
  <div></div>
  
  {/* Центральная колонка: 3D + инструмент */}
  <div style={{ textAlign: "center" }}>
    <span style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-accent)", letterSpacing: "2px" }}>
      🎧 3D
    </span>
    <span style={{
      fontSize: "11px",
      fontWeight: "bold",
      letterSpacing: "2px",
      color: getInstrumentColor(instrument),
      marginLeft: "4px"
    }}>
      {instrument.toUpperCase()}
    </span>
  </div>

  {/* Правая колонка: кнопка ON/OFF */}
  <div style={{ textAlign: "right" }}>
    <button
      onClick={() => setIs3DEnabled(!is3DEnabled)}
      style={{
        fontSize: "9px",
        fontWeight: "bold",
        padding: "2px 10px",
        borderRadius: "12px",
        border: `1px solid ${is3DEnabled ? "var(--text-bright)" : "var(--text-secondary)"}`,
        background: is3DEnabled ? "rgba(77,255,136,0.2)" : "transparent",
        color: is3DEnabled ? "var(--text-bright)" : "var(--text-secondary)",
        cursor: "pointer",
        transition: "all 0.2s ease"
      }}
    >
      {is3DEnabled ? t('3dOn') : t('3dOff')}
    </button>
  </div>
</div>

    {/* X */}
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-secondary)", width: "16px" }}>X</span>
      <input
        type="range"
        min="-10"
        max="10"
        step="0.1"
        value={positions3D[instrument]?.x ?? 0}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          setPositions3D(prev => ({
            ...prev,
            [instrument]: { ...prev[instrument], x: val }
          }));
        }}
        style={{ width: "100px", cursor: "pointer" }}
      />
      <span style={{ fontSize: "11px", color: "var(--text-bright)", minWidth: "30px" }}>
        {positions3D[instrument]?.x.toFixed(1) ?? 0}
      </span>
      <button
        style={{ ...resetBtnStyle, fontSize: "9px", padding: "2px 8px" }}
        onClick={() => {
          const defaultPos = defaultPositions[instrument];
          setPositions3D(prev => ({
            ...prev,
            [instrument]: { ...prev[instrument], x: defaultPos.x }
          }));
        }}
      >
        {t('reset')}
      </button>
    </div>

    {/* Y */}
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-secondary)", width: "16px" }}>Y</span>
      <input
        type="range"
        min="-10"
        max="10"
        step="0.1"
        value={positions3D[instrument]?.y ?? 0}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          setPositions3D(prev => ({
            ...prev,
            [instrument]: { ...prev[instrument], y: val }
          }));
        }}
        style={{ width: "100px", cursor: "pointer" }}
      />
      <span style={{ fontSize: "11px", color: "var(--text-bright)", minWidth: "30px" }}>
        {positions3D[instrument]?.y.toFixed(1) ?? 0}
      </span>
      <button
        style={{ ...resetBtnStyle, fontSize: "9px", padding: "2px 8px" }}
        onClick={() => {
          const defaultPos = defaultPositions[instrument];
          setPositions3D(prev => ({
            ...prev,
            [instrument]: { ...prev[instrument], y: defaultPos.y }
          }));
        }}
      >
        {t('reset')}
      </button>
    </div>

    {/* Z */}
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-secondary)", width: "16px" }}>Z</span>
      <input
        type="range"
        min="-10"
        max="10"
        step="0.1"
        value={positions3D[instrument]?.z ?? -5}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          setPositions3D(prev => ({
            ...prev,
            [instrument]: { ...prev[instrument], z: val }
          }));
        }}
        style={{ width: "100px", cursor: "pointer" }}
      />
      <span style={{ fontSize: "11px", color: "var(--text-bright)", minWidth: "30px" }}>
        {positions3D[instrument]?.z.toFixed(1) ?? -5}
      </span>
      <button
        style={{ ...resetBtnStyle, fontSize: "9px", padding: "2px 8px" }}
        onClick={() => {
          const defaultPos = defaultPositions[instrument];
          setPositions3D(prev => ({
            ...prev,
            [instrument]: { ...prev[instrument], z: defaultPos.z }
          }));
        }}
      >
        {t('reset')}
      </button>
    </div>
  </div>
</div>

      {/* Блок транспорта (над сеткой) */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "20px", marginBottom: "20px" }}>
  {/* Play/Pause */}
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

  {/* Stop */}
  <button onClick={handleStop} className="stop-btn">
    <svg viewBox="0 0 24 24" width="24" height="24">
      <rect x="6" y="6" width="12" height="12" rx="1" fill="#ff4d4d" />
    </svg>
  </button>

  {/* AI (между Stop и Record) */}
  <button
  onClick={generateAIPattern}
  className="ai-btn"
  style={{
    width: "55px",
    height: "50px",
    background: "rgba(var(--bg-card-rgb), 0.5)",
    border: "1px solid rgba(189, 0, 255, 0.4)",
    color: "rgba(189, 0, 255, 0.5)",
    borderRadius: "10px",
    fontSize: "18px",
    fontWeight: "bold",
    letterSpacing: "2px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }}
>
  AI
</button>

  {/* Record */}
  <button
  onClick={handleRecord}
  className={`record-square-btn ${isRecording ? 'recording-active' : ''}`}
>
  <div className="record-dot" style={{ width: "8px", height: "8px", backgroundColor: isRecording ? "#ffffff" : "#ff4d4d", borderRadius: "50%" }}></div>
  {isRecording ? 'REC' : 'REC'}
</button>
{/* Кнопка избранного (только для авторизованных) */}
{user && (
  <button
    onClick={handleFavoriteToggle}
    className={`favorite-btn ${isFavorite ? 'active' : ''} ${Object.values(tracks).flat().length === 0 ? 'disabled' : ''}`}
  >
    {isFavorite ? '❤️' : '🤍'}
  </button>
)}

  {/* Reset с marginLeft: auto, чтобы прижать к правому краю */}
  <button onClick={() => setShowResetConfirm(true)} className="reset-btn" style={{ marginLeft: "auto" }}>{t('resetAll')}</button>
</div>
  
      {/* Сетка (scroll-container) */}
      <div 
        ref={scrollRef}
        
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
                          transition: "none"
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
  
            
  
    {/* Кнопки внизу: Помощь и Что нового */}
<div style={{ display: "flex", gap: "10px", justifyContent: "center", margin: "20px 0" }}>
  <button className="controls-help-btn" onClick={() => setShowHelp(true)}>
    {t('controlsHelp')}
  </button>
  <button 
    className="controls-help-btn" 
    onClick={() => setShowChangelog(true)} 
    style={{ borderColor: "#4DFF88", color: "#4DFF88" }}
  >
    {t('changelogBtn')}
  </button>
</div>

{/* Модальное окно "Помощь" */}
{showHelp && (
  <div className="custom-modal-overlay" onClick={() => setShowHelp(false)}>
    <div className="custom-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header"><h2>{t('controls.title')}</h2><div className="header-line"></div></div>
      <div className="modal-content">
        <div className="help-section">
          <p><strong>🖱️ {t('controls.mouse.title')}</strong></p>
          <div className="control-item"><span>{t('controls.mouse.wheel').split(' — ')[0]}</span> — {t('controls.mouse.wheel').split(' — ')[1]}</div>
          <div className="control-item"><span>{t('controls.mouse.altScroll').split(' — ')[0]}</span> — {t('controls.mouse.altScroll').split(' — ')[1]}</div>
          <div className="control-item"><span>{t('controls.mouse.rightClick').split(' — ')[0]}</span> — {t('controls.mouse.rightClick').split(' — ')[1]}</div>
        </div>
        <div className="help-section">
          <p><strong>⌨️ {t('controls.keyboard.title')}</strong></p>
          <div className="control-item"><span>{t('controls.keyboard.space').split(' — ')[0]}</span> — {t('controls.keyboard.space').split(' — ')[1]}</div>
          <div className="control-item"><span>{t('controls.keyboard.s').split(' — ')[0]}</span> — {t('controls.keyboard.s').split(' — ')[1]}</div>
          <div className="control-item"><span>{t('controls.keyboard.r').split(' — ')[0]}</span> — {t('controls.keyboard.r').split(' — ')[1]}</div>
          <div className="control-item"><span>{t('controls.keyboard.ctrlClick').split(' — ')[0]}</span> — {t('controls.keyboard.ctrlClick').split(' — ')[1]}</div>
          <div className="control-item"><span>{t('controls.keyboard.ctrlD').split(' — ')[0]}</span> — {t('controls.keyboard.ctrlD').split(' — ')[1]}</div>
          <div className="control-item"><span>{t('controls.keyboard.del').split(' — ')[0]}</span> — {t('controls.keyboard.del').split(' — ')[1]}</div>
        </div>
      </div>
      <button className="close-modal-btn" onClick={() => setShowHelp(false)}>{t('controls.letsRock')}</button>
    </div>
  </div>
)}

{/* Модальное окно "Что нового" */}
{showChangelog && (
  <div className="custom-modal-overlay" onClick={() => setShowChangelog(false)}>
    <div className="custom-modal changelog-modal" onClick={(e) => e.stopPropagation()}>
      <div className="neon-icon">📢</div>
      <h2 className="changelog-title">{t('changelogTitle')}</h2>
      <div style={{ textAlign: "left", margin: "20px 0", lineHeight: "1.8", fontSize: "14px", color: "var(--text-secondary)" }}>
        {t('changelogText').map((item, idx) => (
          <div key={idx} style={{ padding: "4px 0" }}>{item}</div>
        ))}
      </div>
      <div className="modal-buttons">
        <button className="close-modal-btn" onClick={() => setShowChangelog(false)}>{t('infoOk')}</button>
      </div>
    </div>
  </div>
)}
  
  {showResetConfirm && (
  <div className="custom-modal-overlay warning-overlay" onClick={() => setShowResetConfirm(false)}>
    <div className="custom-modal warning-modal" onClick={(e) => e.stopPropagation()}>
      <div className="warning-icon">⚠</div>
      <h2>{t('dangerTitle')}</h2>
      <p>{t('dangerMessage')}</p>
      <div className="modal-buttons">
        <button className="cancel-modal-btn" onClick={() => setShowResetConfirm(false)}>{t('cancel')}</button>
        <button className="confirm-reset-btn" onClick={() => { handleResetAll(); setShowResetConfirm(false); }}>{t('confirmReset')}</button>
      </div>
    </div>
  </div>
)}
{/* ===== МОДАЛЬНОЕ ОКНО ИЗБРАННОГО (обновлённый стиль) ===== */}
{showFavoritesModal && (
  <div className="custom-modal-overlay" onClick={() => setShowFavoritesModal(false)}>
    <div className="custom-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', textAlign: 'center' }}>
    <h2 style={{ color: 'var(--text-accent)', marginBottom: '20px' }}>{t('favoritesTitle')}</h2>
      {favoritesList.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>{t('noFavorites')}</p>
      ) : (
        <div style={{ maxHeight: '400px', overflowY: 'auto', textAlign: 'left' }}>
          {favoritesList.map((fav) => {
            const projectName = fav.projects?.grid_data?.name || 'Без названия';
            return (
              <div key={fav.project_id} className="favorite-item">
                {/* Левая часть: название + дата */}
                <div style={{ flex: 1, marginRight: '12px', minWidth: 0 }}>
                  <input
                    type="text"
                    defaultValue={projectName}
                    className="fav-name-input"
                    onBlur={(e) => {
                      const newName = e.target.value.trim();
                      if (newName && newName !== projectName) {
                        renameFavorite(fav.project_id, newName);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.target.blur();
                      }
                    }}
                  />
                  <div className="fav-date">
                    {new Date(fav.created_at).toLocaleString()}
                  </div>
                </div>

                {/* Правая часть: кнопки */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    className="fav-load-btn"
                    onClick={() => loadFavoriteProject(fav.project_id)}
                  >
                    {t('load')}
                  </button>
                  <button
                    className="fav-delete-btn"
                    onClick={async () => {
                      try {
                        const { error } = await supabase
                          .from('favorites')
                          .delete()
                          .eq('user_email', user.email)
                          .eq('project_id', fav.project_id);
                        if (error) throw error;
                        setFavoritesList(prev => prev.filter(f => f.project_id !== fav.project_id));
                        if (fav.project_id === projectId) setIsFavorite(false);
                      } catch (e) {
                        console.error('Ошибка удаления из избранного:', e);
                        alert('Не удалось удалить');
                      }
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <button className="close-modal-btn" onClick={() => setShowFavoritesModal(false)} style={{ marginTop: '20px' }}>
        {t('close')}
      </button>
    </div>
  </div>
)}
  
  {infoModal.visible && (
        <div className="custom-modal-overlay" onClick={() => setInfoModal({ visible: false, message: '' })}>
          <div className="custom-modal info-modal" onClick={(e) => e.stopPropagation()}>
            <div className="neon-icon">ℹ️</div>
            <h2 style={{ color: 'var(--text-accent)', textShadow: '0 0 8px var(--text-accent)' }}>{t('infoTitle')}</h2>
            <p>{infoModal.message}</p>
            <div className="modal-buttons">
            <button className="cancel-modal-btn" onClick={() => setInfoModal({ visible: false, message: '' })}>{t('infoOk')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;