import React, { useState, useRef, useEffect, useMemo } from "react";
import * as Tone from "tone";
import "./style.css";
import { useGoogleLogin } from '@react-oauth/google';
import UserProfile from './UserProfile';
import { supabase } from './supabaseClient';
import * as MidiModule from '@tonejs/midi';
// Автоматически определяем правильный конструктор
const Midi = MidiModule.Midi || MidiModule.default || MidiModule;

// 🎨 Палитры свечения фона (dark = для тёмной темы, light = для светлой)
const BG_PALETTES = [
  {
    name: 'Neon', icon: '🌈',
    dark:  { g1a: 'rgba(180, 60, 255, 0.5)',  g1b: 'rgba(255, 0, 128, 0.35)',  g1c: 'rgba(0, 200, 255, 0.25)',  g2a: 'rgba(255, 200, 0, 0.2)',   g2b: 'rgba(255, 100, 200, 0.15)', g2c: 'rgba(0, 200, 255, 0.1)' },
    light: { g1a: 'rgba(0, 122, 255, 0.45)',  g1b: 'rgba(175, 82, 222, 0.35)',  g1c: 'rgba(255, 45, 85, 0.25)',  g2a: 'rgba(255, 200, 0, 0.35)',  g2b: 'rgba(255, 100, 200, 0.25)', g2c: 'rgba(0, 200, 255, 0.15)' }
  },
  {
    name: 'Sunset', icon: '🌅',
    dark:  { g1a: 'rgba(255, 94, 0, 0.55)',   g1b: 'rgba(255, 45, 85, 0.4)',    g1c: 'rgba(255, 200, 0, 0.3)',   g2a: 'rgba(200, 50, 150, 0.25)', g2b: 'rgba(255, 94, 0, 0.2)',    g2c: 'rgba(255, 45, 85, 0.15)' },
    light: { g1a: 'rgba(255, 140, 50, 0.45)', g1b: 'rgba(255, 80, 120, 0.35)', g1c: 'rgba(255, 220, 100, 0.3)', g2a: 'rgba(255, 100, 180, 0.3)', g2b: 'rgba(255, 140, 50, 0.2)', g2c: 'rgba(255, 80, 120, 0.15)' }
  },
  {
    name: 'Ocean', icon: '🌊',
    dark:  { g1a: 'rgba(0, 180, 255, 0.55)',  g1b: 'rgba(0, 255, 200, 0.4)',    g1c: 'rgba(100, 100, 255, 0.3)', g2a: 'rgba(0, 100, 200, 0.3)',  g2b: 'rgba(0, 255, 180, 0.2)',  g2c: 'rgba(50, 150, 255, 0.15)' },
    light: { g1a: 'rgba(0, 150, 230, 0.45)', g1b: 'rgba(0, 220, 180, 0.35)', g1c: 'rgba(80, 80, 230, 0.3)',   g2a: 'rgba(0, 100, 200, 0.3)',  g2b: 'rgba(0, 220, 180, 0.2)',  g2c: 'rgba(50, 150, 255, 0.15)' }
  },
  {
    name: 'Forest', icon: '🌿',
    dark:  { g1a: 'rgba(0, 220, 130, 0.5)',   g1b: 'rgba(150, 255, 50, 0.35)',  g1c: 'rgba(0, 180, 200, 0.25)', g2a: 'rgba(200, 255, 100, 0.2)', g2b: 'rgba(0, 200, 150, 0.2)',  g2c: 'rgba(100, 255, 50, 0.15)' },
    light: { g1a: 'rgba(0, 180, 110, 0.45)', g1b: 'rgba(130, 220, 50, 0.35)', g1c: 'rgba(0, 160, 180, 0.25)', g2a: 'rgba(180, 230, 80, 0.3)',  g2b: 'rgba(0, 180, 140, 0.2)',  g2c: 'rgba(90, 220, 50, 0.15)' }
  },
  {
    name: 'Fire', icon: '🔥',
    dark:  { g1a: 'rgba(255, 50, 0, 0.55)',   g1b: 'rgba(255, 150, 0, 0.4)',    g1c: 'rgba(255, 220, 0, 0.3)',  g2a: 'rgba(200, 30, 0, 0.3)',   g2b: 'rgba(255, 100, 0, 0.25)', g2c: 'rgba(255, 200, 50, 0.15)' },
    light: { g1a: 'rgba(255, 80, 30, 0.45)', g1b: 'rgba(255, 170, 30, 0.35)', g1c: 'rgba(255, 220, 0, 0.3)',   g2a: 'rgba(220, 50, 20, 0.3)',   g2b: 'rgba(255, 120, 20, 0.25)', g2c: 'rgba(255, 210, 60, 0.15)' }
  },
  {
    name: 'Aurora', icon: '🌌',
    dark:  { g1a: 'rgba(100, 255, 200, 0.5)', g1b: 'rgba(150, 100, 255, 0.4)',  g1c: 'rgba(255, 100, 200, 0.3)', g2a: 'rgba(50, 200, 255, 0.25)', g2b: 'rgba(200, 100, 255, 0.2)', g2c: 'rgba(100, 255, 180, 0.15)' },
    light: { g1a: 'rgba(80, 220, 180, 0.45)', g1b: 'rgba(130, 80, 230, 0.35)', g1c: 'rgba(230, 80, 180, 0.3)',  g2a: 'rgba(50, 180, 230, 0.3)',  g2b: 'rgba(180, 80, 230, 0.25)', g2c: 'rgba(80, 220, 180, 0.15)' }
  },
  {
    name: 'Candy', icon: '🍬',
    dark:  { g1a: 'rgba(255, 100, 200, 0.55)', g1b: 'rgba(200, 100, 255, 0.4)', g1c: 'rgba(100, 200, 255, 0.3)', g2a: 'rgba(255, 150, 100, 0.25)', g2b: 'rgba(255, 100, 200, 0.2)', g2c: 'rgba(150, 100, 255, 0.15)' },
    light: { g1a: 'rgba(230, 80, 180, 0.45)', g1b: 'rgba(180, 80, 230, 0.35)', g1c: 'rgba(80, 180, 230, 0.3)',  g2a: 'rgba(230, 130, 80, 0.3)',  g2b: 'rgba(230, 80, 180, 0.2)',  g2c: 'rgba(130, 80, 230, 0.15)' }
  },
  {
    name: 'Cyberpunk', icon: '⚡',
    dark:  { g1a: 'rgba(255, 0, 200, 0.55)',   g1b: 'rgba(255, 255, 0, 0.4)',   g1c: 'rgba(0, 255, 255, 0.3)',  g2a: 'rgba(0, 255, 200, 0.25)', g2b: 'rgba(255, 0, 150, 0.2)',  g2c: 'rgba(255, 255, 0, 0.15)' },
    light: { g1a: 'rgba(220, 0, 180, 0.45)', g1b: 'rgba(220, 200, 0, 0.35)', g1c: 'rgba(0, 200, 200, 0.3)',   g2a: 'rgba(0, 200, 160, 0.3)',  g2b: 'rgba(220, 0, 130, 0.2)',  g2c: 'rgba(220, 200, 0, 0.15)' }
  },
  {
    name: 'Silver', icon: '🌫️',
    dark:  { g1a: 'rgba(180, 180, 220, 0.4)', g1b: 'rgba(120, 120, 180, 0.3)',  g1c: 'rgba(200, 200, 255, 0.2)', g2a: 'rgba(150, 150, 200, 0.2)', g2b: 'rgba(200, 200, 240, 0.15)', g2c: 'rgba(100, 100, 160, 0.1)' },
    light: { g1a: 'rgba(140, 140, 190, 0.35)', g1b: 'rgba(100, 100, 150, 0.25)', g1c: 'rgba(180, 180, 220, 0.2)', g2a: 'rgba(130, 130, 170, 0.2)', g2b: 'rgba(180, 180, 210, 0.15)', g2c: 'rgba(90, 90, 140, 0.1)' }
  }
];

const NoteBlock = React.memo(({
  block: b,
  instName,
  instrument,
  isSelected,
  isActive,
  getColor,
  handleSelectBlock,
  handleGroupDragStart,
  startDrag,
  startResize,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  isDraggingRef,
  setTracks,
  setSelectedBlockIds
}) => {
  const isActiveInstrument = instName === instrument;
  
  return (
    <div
      className={`block ${isActive ? 'playing' : ''}`}
      data-id={b.id}
      onMouseDown={(e) => {
        handleSelectBlock(e, b, instName);
        if (isActiveInstrument) {
          isDraggingRef.current = true;
          if (isSelected) {
            handleGroupDragStart(e, b); // ✅ Тянем как группу
          } else {
            startDrag(b, e); // ✅ Тянем как одиночную
          }
        }
      }}
      onDoubleClick={() => {
        if (!isActiveInstrument) return;
        setTracks(prev => ({
          ...prev,
          [instrument]: prev[instrument].map(it => it.id === b.id ? { ...it, velocity: (it.velocity || 1) <= 0.5 ? 1 : 0.5 } : it)
        }));
      }}
      onTouchStart={(e) => {
        handleSelectBlock(e, b, instName);
        if (isActiveInstrument) handleTouchStart(e, b, false);
      }}
      onTouchMove={(e) => {
        if (isActiveInstrument) handleTouchMove(e);
      }}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!isActiveInstrument) return;
        setTracks(prev => ({ ...prev, [instrument]: prev[instrument].filter(it => it.id !== b.id) }));
        setSelectedBlockIds(prev => { const ns = new Set(prev); ns.delete(b.id); return ns; });
      }}
      style={{
        position: "absolute",
        left: b.x,
        width: b.length,
        height: 45,
        backgroundColor: isActiveInstrument ? getColor(b.fret) : "rgba(100, 100, 100, 0.2)",
        boxShadow: isActiveInstrument ? `0 4px 0 rgba(0,0,0,0.5), 0 0 8px ${getColor(b.fret)}` : "none",
        opacity: isActiveInstrument ? (b.velocity || 1) : 0.5,
        border: isActiveInstrument ? "none" : "1px dashed rgba(255,255,255,0.2)",
        outline: isSelected ? "2px solid cyan" : "none",
        outlineOffset: "2px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontWeight: "bold",
        cursor: isActiveInstrument ? "grab" : "default",
        zIndex: isActiveInstrument ? 10 : 5,
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
      {isActiveInstrument && (
        <div
          onMouseDown={(e) => startResize(b, e)}
          onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e, b, true); }}
          style={{ position: "absolute", right: 0, top: 0, width: 15, height: "100%", cursor: "ew-resize", background: "rgba(0,0,0,0.1)", borderRadius: "0 6px 6px 0" }}
        />
      )}
    </div>
  );
}, (prev, next) => {
  // Функция сравнения: если всё совпадает, React НЕ перерисовывает нотку
  return (
    prev.block === next.block &&
    prev.isSelected === next.isSelected &&
    prev.isActive === next.isActive &&
    prev.instrument === next.instrument &&
    prev.instName === next.instName
  );
});
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
  // 🔄 Состояние для инверсии струн
  const [isReversed, setIsReversed] = useState(() => {
    return localStorage.getItem('struna_reverse_strings') === 'true';
  });

  const toggleReverseStrings = () => {
    const newVal = !isReversed;
    setIsReversed(newVal);
    localStorage.setItem('struna_reverse_strings', String(newVal));
    if (uiSoundsEnabled) uiSounds.playClick();
  };
  const [showHelp, setShowHelp] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [infoModal, setInfoModal] = useState({ visible: false, message: '', title: '' });
  const [bpm, setBpm] = useState(120);
  const [currentAITonality, setCurrentAITonality] = useState(null); // Память для AI
  
  const [demoPlaying, setDemoPlaying] = useState(null); // имя инструмента или null
  const [isTempoMasterVisible, setIsTempoMasterVisible] = useState(false);
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
  const [showFX, setShowFX] = useState(false);
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
    tagline: "UNBOUND SOUND",
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
    bgPalette: "Background Color",
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
    reverseStrings: "Reverse Strings",
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
    clearInstrument: "Clear Instrument",
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
    tutorialTitle: "Welcome to STRUNA! 🎸",
tutorialMessage: "Click on the grid to add a note. Use mouse wheel to change pitch. Press Space to play. Start creating!",
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
        ctrlA: "Ctrl + A — Select all blocks on current instrument",
        ctrlD: "Ctrl + D — Duplicate selected blocks",
        del: "Del / Backspace — Delete selected blocks"
      },
      letsRock: "LET'S ROCK!"
    },
    // Кнопка "Что нового" и список новинок (ОБНОВЛЕНО)
    changelogBtn: "What's New",
changelogTitle: "✨ What's New (v2.0)",
changelogText: [
  "• Brand new GEN engine: Instantly generate complete tracks in 12 unique music styles.",
  "• Completely new Liquid Glass design with smooth animations.",
  "• Dynamic background palettes and seamless light/dark themes.",
  "• Revamped audio engine and major global performance boost.",
  "• Perfect seamless loops and rock-solid metronome.",
  "• String inversion feature and improved grid controls."
]
  },
  ru: {
    tagline: "ЗВУК БЕЗ ГРАНИЦ",
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
    bgPalette: "Цвет фона",
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
    reverseStrings: "Инверсия струн",
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
    clearInstrument: "Очистить инструмент",
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
    tutorialTitle: "Добро пожаловать в STRUNA! 🎸",
tutorialMessage: "Кликни по сетке — появится нота. Колесико мыши меняет высоту. Нажмите Пробел для воспроизведения. Начинайте творить!",
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
        ctrlA: "Ctrl + A — Выделить все блоки на текущем инструменте",
        ctrlD: "Ctrl + D — дублировать выбранные блоки",
        del: "Del / Backspace — удалить выбранные блоки"
      },
      letsRock: "ПОЕХАЛИ!"
    },
    // Кнопка "Что нового" и список новинок (ОБНОВЛЕНО)
    changelogBtn: "Что нового",
changelogTitle: "✨ Что нового (v2.0)",
changelogText: [
  "• Новый GEN-движок: генерация полноценных битов в 12 разных стилях.",
  "• Новый дизайн в стиле Liquid Glass и плавные анимации.",
  "• Динамические палитры фона и бесшовная смена тем.",
  "• Обновлённый аудиодвижок и глобальная оптимизация.",
  "• Идеальный луп и ровный метроном для бесшовного ритма.",
  "• Инверсия струн и улучшенное управление сеткой."
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
  
  const [bgPaletteIndex, setBgPaletteIndex] = useState(() => {
    const saved = localStorage.getItem('struna_bg_palette');
    const idx = saved !== null ? parseInt(saved, 10) : 0;
    return Number.isInteger(idx) && idx >= 0 && idx < BG_PALETTES.length ? idx : 0;
  });

  const randomizeBgPalette = () => {
    if (BG_PALETTES.length <= 1) return;
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * BG_PALETTES.length);
    } while (newIndex === bgPaletteIndex);
    setBgPaletteIndex(newIndex);
    localStorage.setItem('struna_bg_palette', String(newIndex));
    if (uiSoundsEnabled) uiSounds.playChirp();
  };

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
  const maxEndPXRef = useRef(0);
  const scheduledIdsRef = useRef([]);
  const vuBarRefs = useRef([]);
    // Ссылки для хранения актуальных данных без пересоздания слушателей
    const selectedBlockIdsRef = useRef(selectedBlockIds);
    const tracksRef = useRef(tracks);
    const instrumentRef = useRef(instrument);
    const funcsRef = useRef({});
  
    // Синхронизируем данные при каждом их изменении
    useEffect(() => {
      selectedBlockIdsRef.current = selectedBlockIds;
      tracksRef.current = tracks;
      instrumentRef.current = instrument;
      // Сохраняем ссылки на функции, чтобы внутри обработчика они были свежими
      funcsRef.current = {
        handleTogglePlay,
        handleStop,
        handleRecord,
        copySelectedBlocks,
        pasteBlocks,
        deleteSelectedBlocks
      };
    });
  const secondsRef = useRef(null);
  const barBeatRef = useRef(null);
  const waveCircleRef = useRef(null);
  const masterDisplayModeRef = useRef(masterDisplayMode);
  
    // Чтобы цикл анимации знал, какой режим сейчас включен (VU или WAVE)
    useEffect(() => {
      masterDisplayModeRef.current = masterDisplayMode;
    }, [masterDisplayMode]);
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
  playEffect: (effectName, velocity = 1, time = Tone.now() + 0.01) => {
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
    synth.triggerAttackRelease(freq, duration, time + shift, velocity);
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
      let stringDelta = Math.round(deltaY / 60);
      if (isReversed) stringDelta = -stringDelta;
    
      const currentInst = instrumentRef.current;
      const newTracks = { ...tracksRef.current };
      newTracks[currentInst] = newTracks[currentInst].map(b => {
        if (dragStartInfo.initialBlocks.has(b.id)) {
          const initial = dragStartInfo.initialBlocks.get(b.id);
          let newX = initial.x + deltaX;
          newX = Math.round(newX / STEP_WIDTH) * STEP_WIDTH;
          newX = Math.max(0, newX);
          
          let newString = initial.string + stringDelta; // ✅ ИСПОЛЬЗУЕМ stringDelta С РЕВЕРСОМ
          
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
    }, [isGroupDragging, dragStartInfo, isReversed]); // ✅ Добавили isReversed
  
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
        if (selectedBlockIdsRef.current.has(blockId)) {
          e.preventDefault(); 
          setTracks(prev => {
            return {
              ...prev,
              [instrumentRef.current]: prev[instrumentRef.current].map((it) => {
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
  }, [mode]);

  const getColor = (fret) => {
    const colors = ["#FF4D4D", "#FF7A4D", "#FFB84D", "#FFD84D", "#E6FF4D", "#A8FF4D", "#4DFF88", "#4DFFD2", "#4DC3FF", "#4D88FF", "#7A4DFF", "#C84DFF", "#FF4DA6"];
    return colors[fret % colors.length];
  };
  // --- AUDIO INIT ---
useEffect(() => {
  // ===== НАСТРОЙКА НОВОГО ДВИЖКА TONE.TRANSPORT =====
  Tone.getTransport().bpm.value = bpm;
  Tone.context.lookAhead = 0.2; // Увеличиваем буфер (защита от треска при лагах ПК)
  Tone.getTransport().PPQ = 192; // Высокая точность (Pulses Per Quarter)

    // 1. Мастер-компрессор (идёт в самый конец цепи)
    const masterCompressor = new Tone.Compressor({
      threshold: -18, // ✅ Снизили порог, чтобы лучше ловить пики
      ratio: 4,       // ✅ Увеличили степень сжатия
      attack: 0.01,
      release: 0.2,
      knee: 10
    }).toDestination();
  
    // 2. Лимитер для защиты от перегрузки (кирпичная стена)
    const limiter = new Tone.Limiter(-1).connect(masterCompressor); // ✅ Подняли до -1 dB

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
      panningModel: "equalpower",
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
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.8 }, // ✅ Уменьшили release с 1.5 до 0.8
        modulationEnvelope: { attack: 0.1, decay: 0.2, sustain: 1, release: 0.5 }
      });
      synthsRef.current[type].maxPolyphony = 16; // ✅ Ограничили полифонию
      synthsRef.current[type].connect(filter);
    
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
        envelope: { attack: 0.001, decay: 0.05, sustain: 0.1, release: 0.1 } // ✅ Оставили коротким
      });
      chipSynth.maxPolyphony = 8; // ✅ Ограничили полифонию для чипа
      const bitCrusher = new Tone.BitCrusher(8);
      if (bitCrusher.frequency) bitCrusher.frequency.value = 8000;
      chipSynth.connect(bitCrusher);
      bitCrusher.connect(filter);
      synthsRef.current[type] = chipSynth;
    } else {
      synthsRef.current[type] = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.15, decay: 0.2, sustain: 0.4, release: 1.0 } // ✅ Уменьшили release с 2.0 до 1.0
      });
      synthsRef.current[type].maxPolyphony = 16; // ✅ Ограничили полифонию
      synthsRef.current[type].connect(filter);
    }
  });

    // ===== НОВЫЙ МЕТРОНОМ НА БАЗЕ TRANSPORT =====
    const metroLoop = new Tone.Loop((time) => {
      if (!metroOnRef.current || !metroSynthRef.current) return;
      
      // Вычисляем, какая это доля (чтобы выделить первую)
      const ticks = Tone.getTransport().getTicksAtTime(time);
      const beatIndex = Math.floor(ticks / Tone.getTransport().PPQ);
      const isFirstBeat = beatIndex % 4 === 0;
      
      const freq = isFirstBeat ? 'A5' : 'A4';
      const velocity = isFirstBeat ? 0.8 : 0.4;
      
      if (metroSoundRef.current === 'noise') {
        metroSynthRef.current.triggerAttackRelease('16n', time, metroVolumeRef.current * velocity);
      } else {
        metroSynthRef.current.triggerAttackRelease(freq, '16n', time, metroVolumeRef.current * velocity);
      }
    }, "4n"); // Играть каждую четверть
  
    metroLoop.start(0); // Запускаем цикл

  // Cleanup function (очистка при размонтировании компонента)
  return () => {
    metroLoop.dispose();
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
    Tone.getTransport().bpm.value = bpm; // Обновляем темп Транспорта
    if (isPlaying) {
      // Перезапускаем визуальный движок (звук перестроится сам)
      cancelAnimationFrame(animationRef.current);
      syncNotesToTransport(); 
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

// 🎨 Применяем цветовую палитру фона
useEffect(() => {
  const appEl = document.querySelector('.app');
  if (!appEl) return;
  const palette = BG_PALETTES[bgPaletteIndex] || BG_PALETTES[0];
  const c = theme === 'light' ? palette.light : palette.dark;
  appEl.style.setProperty('--bg-glow1-a', c.g1a);
  appEl.style.setProperty('--bg-glow1-b', c.g1b);
  appEl.style.setProperty('--bg-glow1-c', c.g1c);
  appEl.style.setProperty('--bg-glow2-a', c.g2a);
  appEl.style.setProperty('--bg-glow2-b', c.g2b);
  appEl.style.setProperty('--bg-glow2-c', c.g2c);
}, [bgPaletteIndex, theme, mode]); // mode — чтобы палитра переприменялась при смене landing ↔ app

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

// ===== АВТОСОХРАНЕНИЕ (дебаунс 800ms + индикатор) =====
useEffect(() => {
  if (!isDataLoaded || !user?.email || !autosaveEnabled) return;

  const key = `struna_autosave_${user.email}`;
  const data = {
    tracks, bpm, filters, fx, volumes, positions3D,
    loopActive, loopStart, loopEnd
  };

  const saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      setAutosaveStatus('saved');
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      statusTimerRef.current = setTimeout(() => setAutosaveStatus('idle'), 1500);
    } catch (e) {
      console.warn('Автосохранение не удалось:', e);
    }
  }, 800);

  return () => clearTimeout(saveTimer);
}, [isDataLoaded, user, tracks, bpm, filters, fx, volumes, positions3D, loopActive, loopStart, loopEnd, autosaveEnabled]);
  
  // Обновляем звуки при изменении нот (с задержкой, чтобы не лагало при перетаскивании)
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setTimeout(() => {
      syncNotesToTransport();
    }, 150); // Ждем 150мс после последнего изменения

    return () => clearTimeout(timer);
  }, [tracks, loopActive, loopStart, loopEnd, isPlaying]);

useEffect(() => {
  // Показываем туториал только если мы в режиме приложения и ещё не показывали
  if (mode === "app" && !localStorage.getItem('struna_tutorial_shown')) {
    setInfoModal({
      visible: true,
      title: t('tutorialTitle'),
      message: t('tutorialMessage')
    });
  }
}, [mode]);

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
      let visualString = Math.floor(relativeY / 60);
      let newString = isReversed ? strings.length - 1 - visualString : visualString;
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
    
    isPlayheadDraggingRef.current = true;
  
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
  
      // Автоскролл с ускорением у краёв
      autoScrollIfNeeded(currentClientX);
  
            // Обновляем время воспроизведения
            const stepTime = 60 / bpm / 4;
            const newTime = (boundedX / STEP_WIDTH) * stepTime;
            
            // Ставим время в Транспорте!
            Tone.getTransport().seconds = newTime;
            triggeredRef.current.clear();
  
      // ===== ОБНОВЛЯЕМ ОТОБРАЖЕНИЕ ВРЕМЕНИ В БЛОКЕ MASTER VOL =====
      const secondsPerBeat = 60 / bpm;
      const beats = newTime / secondsPerBeat;
      const currentBar = Math.floor(beats / 4) + 1;
      const currentBeat = (Math.floor(beats) % 4) + 1;
      setCurrentPosition({
        bar: currentBar,
        beat: currentBeat,
        seconds: newTime
      });
    };
  
    const onUp = () => {
      isPlayheadDraggingRef.current = false;
      scrollSpeedRef.current = 0;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
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

    // ===== ФУНКЦИЯ РАСПИСАНИЯ НОТ =====
    const syncNotesToTransport = () => {
      const transport = Tone.getTransport();
      
       // Очищаем ТОЛЬКО старые ноты, не трогая метроном!
       if (scheduledIdsRef.current) {
        scheduledIdsRef.current.forEach(id => transport.clear(id));
        scheduledIdsRef.current = [];
      }
  
      const stepTime = 60 / bpm / 4;
  
      Object.entries(tracks).forEach(([type, blocks]) => {
        // ✅ 1. Сортируем блоки по времени (слева направо)
        const sortedBlocks = [...blocks].sort((a, b) => a.x - b.x);
        let lastBassTime = -1; // ✅ Защита для MonoSynth
  
        sortedBlocks.forEach((b) => {
          const startStep = Math.floor(b.x / STEP_WIDTH);
          const durationSteps = Math.max(1, Math.floor(b.length / STEP_WIDTH));
          let startTime = startStep * stepTime;
          const duration = durationSteps * stepTime;
  
          // ✅ 2. Если это БАС и время совпадает с предыдущей нотой — сдвигаем на 10мс
          if (type === "bass") {
            if (startTime <= lastBassTime) {
              startTime = lastBassTime + 0.01; // Сдвиг на 10 миллисекунд
            }
            lastBassTime = startTime;
          }
  
                  // Планируем звук и СОХРАНЯЕМ его ID
        const noteId = transport.schedule((time) => {
          const freq = OPEN_STRINGS[b.string] * Math.pow(2, b.fret / 12);
          const synth = synthsRef.current[type];
          const velocity = Math.min(1, Math.max(0, b.velocity ?? 1));

          if (!synth) return;

          // ✅ Универсальный микросдвиг для ВСЕХ инструментов (защита от одновременных нот)
          const microShift = (Math.abs(b.id) % 100) * 0.00005; 
          const triggerTime = time + microShift;

          if (type === "drum") {
            const pools = synth;
            if (!pools || !pools.membranePool) return;
            
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
            
            const velocityAdjusted = Math.min(1, velocity * 1.2);
            const timeShift = (Math.abs(b.id) % 1000) * 0.0001;
            const drumTriggerTime = triggerTime + timeShift;

            if (typeIdx >= 0 && typeIdx <= 7) {
              const pitchMap = ["C2", "D2", "E2", "F2", "G2", "A2", "B2", "C3"];
              membraneSynth.triggerAttackRelease(pitchMap[typeIdx], duration, drumTriggerTime, velocityAdjusted);
            } else {
              switch (typeIdx) {
                case 8: noiseSynth.envelope.decay = 0.12; noiseSynth.triggerAttackRelease(duration, drumTriggerTime, velocityAdjusted); break;
                case 9: noiseSynth.envelope.decay = 0.18; noiseSynth.triggerAttackRelease(duration, drumTriggerTime, velocityAdjusted); break;
                case 10: noiseSynth.envelope.decay = 0.25; noiseSynth.triggerAttackRelease(duration, drumTriggerTime, velocityAdjusted); break;
                case 11: noiseSynth.noise.type = "pink"; noiseSynth.envelope.decay = 0.15; noiseSynth.triggerAttackRelease(duration, drumTriggerTime, velocityAdjusted); break;
                default: membraneSynth.triggerAttackRelease("C2", duration, drumTriggerTime, velocityAdjusted);
              }
            }
          } else if (type === "bass") {
            // ✅ ИСПОЛЬЗУЕМ triggerTime ВМЕСТО time
            synth.triggerAttackRelease(freq, duration, triggerTime, velocity);
          } else {
            // ✅ ИСПОЛЬЗУЕМ triggerTime ВМЕСТО time
            synth.triggerAttackRelease(freq, duration, triggerTime, velocity);
          }

          // Спецэффекты
          if (b.effect && uiSoundsEnabled) {
            uiSounds.playEffect(b.effect, velocity);
          }
         }, startTime);

          scheduledIdsRef.current.push(noteId);
        });
      });
    };

  const startEngine = () => {
    const lastStartTimeMap = new Map();
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    
    let frameCount = 0; // счётчик для уменьшения частоты обновления стейта
  
    const loop = () => {
      const now = Tone.now();
      const stepTime = 60 / bpm / 4;
      // БЕРЕМ ВРЕМЯ ИЗ ТРАНСПОРТА
      let elapsed = Tone.getTransport().seconds;
      
      // (УДАЛЕНО: const allBlocks = Object.values(tracks).flat();)
  
      // Глобальная логика окончания трека (если есть блоки и луп выключен)
      if (maxEndPXRef.current > 0) { 
        const lastBlockEndPX = maxEndPXRef.current; 
        const globalLoopEndTime = (lastBlockEndPX / STEP_WIDTH) * stepTime;
  
                // Обновляем позицию (текущий такт/доля) только каждый второй кадр
                if (frameCount % 2 === 0) {
                  const secondsPerBeat = 60 / bpm;
                  const beats = elapsed / secondsPerBeat;
                  const currentBar = Math.floor(beats / 4) + 1;
                  const currentBeat = (Math.floor(beats) % 4) + 1;
                  
                  // ПРЯМОЕ ОБНОВЛЕНИЕ DOM (без setState)
                  if (secondsRef.current) {
                    secondsRef.current.textContent = `${elapsed.toFixed(1)}s`;
                  }
                  if (barBeatRef.current) {
                    barBeatRef.current.textContent = `(${currentBar}.${currentBeat})`;
                  }
                }
              }
  
      
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
      
              // ПРЯМОЕ ОБНОВЛЕНИЕ DOM (без setState)
              if (masterDisplayModeRef.current === "vu") {
                vuBarRefs.current.forEach((bar, idx) => {
                  if (!bar) return;
                  const intensity = idx / 20;
                  const isActive = normalized > intensity;
                  let color = "var(--text-bright)";
                  if (intensity > 0.7) color = "#FFB84D";
                  if (intensity > 0.9) color = "var(--warning-border)";
                  
                  bar.style.backgroundColor = isActive ? color : "rgba(var(--bg-card-rgb), 0.2)";
                });
              } 
              else if (masterDisplayModeRef.current === "wave" && waveCircleRef.current) {
                const color = normalized < 0.33 ? "rgba(77,255,136,0.4)" : normalized < 0.66 ? "rgba(255,184,77,0.4)" : "rgba(255,77,77,0.4)";
                const border = normalized < 0.33 ? "var(--text-bright)" : normalized < 0.66 ? "#FFB84D" : "var(--warning-border)";
                
                waveCircleRef.current.style.transform = `scale(${0.4 + normalized * 0.8})`;
                waveCircleRef.current.style.background = `radial-gradient(circle, ${color}, transparent)`;
                waveCircleRef.current.style.borderColor = border;
              }
            }
  
      // Увеличиваем счётчик кадров
      frameCount++;
  
      animationRef.current = requestAnimationFrame(loop);
    };
  
    loop();
  };

  // ===== ФУНКЦИЯ СБРОСА ВИЗУАЛЬНЫХ ЭЛЕМЕНТОВ =====
  const resetVisuals = () => {
    // 1. Сбрасываем VU-метр (полоски громкости)
    if (vuBarRefs.current) {
      vuBarRefs.current.forEach(bar => {
        if (bar) bar.style.backgroundColor = "rgba(var(--bg-card-rgb), 0.2)";
      });
    }
    // 2. Сбрасываем таймер
    if (secondsRef.current) secondsRef.current.textContent = "0.0s";
    if (barBeatRef.current) barBeatRef.current.textContent = "(1.1)";
    // 3. Сбрасываем круг WAVE
    if (waveCircleRef.current) {
      waveCircleRef.current.style.transform = "scale(0.4)";
      waveCircleRef.current.style.background = `radial-gradient(circle, rgba(77,255,136,0.4), transparent)`;
      waveCircleRef.current.style.borderColor = "var(--text-bright)";
    }
  };

  const handleTogglePlay = async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start();
      console.log("Audio Context started!");
    }
    
    const totalBlocks = Object.values(tracks).flat().length;
    if (!isPlaying && totalBlocks === 0) {
      setInfoModal({ visible: true, message: t('infoNoNotes') });
      return;
    }
    
    const transport = Tone.getTransport();

    if (isPlaying) {
      // ПАУЗА
      transport.pause();
      cancelAnimationFrame(animationRef.current);
      setIsPlaying(false);
      
      setMasterVolume(0);
      
      // ===== ГАСИМ VU-МЕТР И WAVE ПРИ ПАУЗЕ =====
      if (vuBarRefs.current) {
        vuBarRefs.current.forEach(bar => {
          if (bar) bar.style.backgroundColor = "rgba(var(--bg-card-rgb), 0.2)";
        });
      }
      if (waveCircleRef.current) {
        waveCircleRef.current.style.transform = "scale(0.4)";
        waveCircleRef.current.style.background = `radial-gradient(circle, rgba(77,255,136,0.4), transparent)`;
        waveCircleRef.current.style.borderColor = "var(--text-bright)";
      }
      // ==========================================

      if (window.__sidechain?.kickLoop) window.__sidechain.kickLoop.stop();
      Object.values(synthsRef.current).forEach(s => { 
        try { 
          if (s.releaseAll) s.releaseAll(); 
          else if (s.triggerRelease) s.triggerRelease(); 
        } catch(e) {} 
      });
    } else {
      // СТАРТ (или продолжение после паузы)
      await Tone.start();
      // Добавьте эту строку перед transport.start():
      syncNotesToTransport();
      transport.start(); // Запускаем виртуальные часы
      setIsPlaying(true);
      
      if (window.__sidechain?.kickLoop) {
        window.__sidechain.kickLoop.start(0);
      }
      startEngine(); // Запускаем визуал
    }
  };

  const handleStop = () => {
    const transport = Tone.getTransport();
    transport.stop();      // Останавливаем часы
    transport.position = 0; // Сбрасываем на начало
    
    cancelAnimationFrame(animationRef.current);
    triggeredRef.current.clear();
    setIsPlaying(false);
    
    setMasterVolume(0);
    setCurrentPosition({ bar: 1, beat: 1, seconds: 0 });
    
    // ===== СБРОС ВРЕМЕНИ И VU-МЕТРА =====
    if (secondsRef.current) secondsRef.current.textContent = "0.0s";
    if (barBeatRef.current) barBeatRef.current.textContent = "(1.1)";
    if (vuBarRefs.current) {
      vuBarRefs.current.forEach(bar => {
        if (bar) bar.style.backgroundColor = "rgba(var(--bg-card-rgb), 0.2)";
      });
    }
    if (waveCircleRef.current) {
      waveCircleRef.current.style.transform = "scale(0.4)";
    }
    // ====================================

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
    // ===== ДОБАВЛЕНО: Останавливаем сам Транспорт и сбрасываем его на 0 =====
    const transport = Tone.getTransport();
    transport.stop();
    transport.position = 0;
    // ========================================================================

    cancelAnimationFrame(animationRef.current);
    
    // ===== ДОБАВЛЕНО: Останавливаем sidechain (пульсацию баса) =====
    if (window.__sidechain?.kickLoop) window.__sidechain.kickLoop.stop();
    // ===============================================================
    
    Object.values(synthsRef.current).forEach(s => { 
      try { 
        if (s.releaseAll) s.releaseAll(); 
        else if (s.triggerRelease) s.triggerRelease(); 
      } catch(e) {} 
    });

    if (masterGainRef.current) {
      masterGainRef.current.gain.rampTo(0, 0.01); 
      setTimeout(() => {
        if (masterGainRef.current) {
          masterGainRef.current.gain.setTargetAtTime(0.8, Tone.now(), 0.1);
        }
      }, 100);
    }

    pauseOffsetRef.current = 0;
    triggeredRef.current.clear();
    setIsPlaying(false);
    setMasterVolume(0);
    
    // ===== СБРОС ВРЕМЕНИ =====
    setCurrentPosition({ bar: 1, beat: 1, seconds: 0 });
    if (secondsRef.current) secondsRef.current.textContent = "0.0s";
    if (barBeatRef.current) barBeatRef.current.textContent = "(1.1)";
    // ========================
    
    if (playheadRef.current) playheadRef.current.style.transform = "translateX(0px)";
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  };

  const handleResetAll = () => {
    if (isPlaying) {
      cancelAnimationFrame(animationRef.current);
      setIsPlaying(false);
    }
    if (window.__sidechain?.kickLoop) window.__sidechain.kickLoop.stop();
    
    Object.values(synthsRef.current).forEach(s => {
      try { s.releaseAll?.(); s.triggerRelease?.(); } catch(e) {}
    });
    
    pauseOffsetRef.current = 0;
    startTimeRef.current = Tone.now();
    triggeredRef.current.clear();
    
    if (playheadRef.current) playheadRef.current.style.transform = "translateX(0px)";
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
    
    setTracks({ guitar: [], synth: [], drum: [], bass: [], chip: [] });
    setFilters(defaultFilters);
    setFx(defaultFx);
    setVolumes(defaultVolumes);
    setBpm(120);
    setSelectedBlockIds(new Set());
    setMasterVolume(0);
    
    // ===== СБРОС ВРЕМЕНИ И VU-МЕТРА =====
    setCurrentPosition({ bar: 1, beat: 1, seconds: 0 });
    if (secondsRef.current) secondsRef.current.textContent = "0.0s";
    if (barBeatRef.current) barBeatRef.current.textContent = "(1.1)";
    if (vuBarRefs.current) {
      vuBarRefs.current.forEach(bar => {
        if (bar) bar.style.backgroundColor = "rgba(var(--bg-card-rgb), 0.2)";
      });
    }
    if (waveCircleRef.current) {
      waveCircleRef.current.style.transform = "scale(0.4)";
    }
    // ====================================

    setLoopStart(0);
    setLoopEnd(0);
    setPreviewLoopEnd(0);
    setLoopActive(false);
    playheadXRef.current = 0;
    loopStartRef.current = 0;
    loopEndRef.current = 0;
  
    if (subMode) {
      // ... (ваш код сброса сабвуфера)
    }
    
    setPositions3D(defaultPositions);
    setMasterGainValue(1.0);
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = 1.0;
    }
  
    setProjectId(null);
    setIsFavorite(false);
  };

  const clearCurrentInstrument = () => {
    const totalBlocks = tracks[instrument]?.length || 0;
    if (totalBlocks === 0) return; 
  
    if (isPlaying) {
      cancelAnimationFrame(animationRef.current); 
      const transport = Tone.getTransport();
      transport.stop();
      transport.position = 0;
      setIsPlaying(false);
      setMasterVolume(0);
      if (window.__sidechain?.kickLoop) window.__sidechain.kickLoop.stop();
      Object.values(synthsRef.current).forEach(s => {
        try { s.releaseAll?.(); s.triggerRelease?.(); } catch(e) {}
      });
    }
  
    if (playheadRef.current) {
      playheadRef.current.style.transform = "translateX(0px)";
    }
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
    playheadXRef.current = 0;
    
    // ===== СБРОС ВРЕМЕНИ И VU-МЕТРА =====
    setCurrentPosition({ bar: 1, beat: 1, seconds: 0 });
    if (secondsRef.current) secondsRef.current.textContent = "0.0s";
    if (barBeatRef.current) barBeatRef.current.textContent = "(1.1)";
    if (vuBarRefs.current) {
      vuBarRefs.current.forEach(bar => {
        if (bar) bar.style.backgroundColor = "rgba(var(--bg-card-rgb), 0.2)";
      });
    }
    // ====================================
  
    setLoopStart(0);
    setLoopEnd(0);
    setPreviewLoopEnd(0); 
    setLoopActive(false);
    Tone.getTransport().loop = false;
  
    setTracks(prev => ({
      ...prev,
      [instrument]: []
    }));
    setSelectedBlockIds(new Set()); 
  
    if (triggeredRef.current) triggeredRef.current.clear();
  
    pauseOffsetRef.current = 0;
    startTimeRef.current = Tone.now();
  
    if (uiSoundsEnabled) uiSounds.playClick();
  };

  const handleCloseInfoModal = () => {
    setInfoModal({ visible: false, message: '', title: '' });
    // Если туториал ещё не был показан – запоминаем, что показали
    if (!localStorage.getItem('struna_tutorial_shown')) {
      localStorage.setItem('struna_tutorial_shown', 'true');
    }
  };
  
  const generateAIPattern = () => {
    const inst = instrument;
    if (!inst) return;
  
    // Останавливаем воспроизведение при генерации
    if (isPlaying) {
      cancelAnimationFrame(animationRef.current);
      setIsPlaying(false);
      Tone.getTransport().stop();      // Полностью останавливаем часы
      Tone.getTransport().position = 0; // Сбрасываем на начало
      if (window.__sidechain?.kickLoop) window.__sidechain.kickLoop.stop();
      Object.values(synthsRef.current).forEach(s => {
        try { s.releaseAll?.(); s.triggerRelease?.(); } catch(e) {}
      });
    }
  
    const now = Date.now();
    const stepSize = STEP_WIDTH;
    const numSteps = Math.min(256, Math.ceil(20 / (60 / bpm / 4)));
    const stepsPerBar = 16;
    const numBars = Math.ceil(numSteps / stepsPerBar);
    
    // 🎼 1. ОПРЕДЕЛЯЕМ ТОНАЛЬНОСТЬ
    // Если тональности нет (первый запуск) - выбираем случайную
    const rootKey = currentAITonality !== null ? currentAITonality : Math.floor(Math.random() * 12);
    if (currentAITonality === null) setCurrentAITonality(rootKey);

    const progressions = [[0, 5, 3, 4], [0, 3, 4, 0], [0, 7, 5, 3]];
    const progression = progressions[Math.floor(Math.random() * progressions.length)];
    const minorScale = [0, 2, 3, 5, 7, 8, 10]; 
    
    const getChordTones = (degree) => [
      minorScale[degree % 7],
      minorScale[(degree + 2) % 7],
      minorScale[(degree + 4) % 7]
    ];

    const getNoteFret = (targetNote, preferredString) => {
      const openStringsMidi = [28, 33, 40, 45, 50, 55, 59, 64];
      let bestFret = 0;
      let bestString = preferredString || 0;
      let minDiff = 999;
      
      for (let s = Math.max(0, bestString - 2); s <= Math.min(7, bestString + 2); s += 1) {
        // ✅ Добавили Math.round, чтобы лад всегда был целым числом
        const fret = Math.round(targetNote - openStringsMidi[s]); 
        
        if (fret >= 0 && fret <= MAX_FRET) {
          const diff = Math.abs(fret - 5);
          if (diff < minDiff) {
            minDiff = diff;
            bestFret = fret;
            bestString = s;
          }
        }
      }
      return { string: bestString, fret: bestFret };
    };

    // Вспомогательные генераторы
    const generateDrums = () => {
      const blocks = [];
      for (let bar = 0; bar < numBars; bar++) {
        const barStart = bar * stepsPerBar;
        blocks.push({ id: now + barStart + Math.random(), string: 0, x: (barStart) * stepSize, length: stepSize, fret: 0, velocity: 1, effect: null });
        if (Math.random() > 0.3) blocks.push({ id: now + barStart + 8 + Math.random(), string: 0, x: (barStart + 8) * stepSize, length: stepSize, fret: 0, velocity: 0.9, effect: null });
        blocks.push({ id: now + barStart + 4 + Math.random(), string: 0, x: (barStart + 4) * stepSize, length: stepSize, fret: 4, velocity: 0.9, effect: null });
        blocks.push({ id: now + barStart + 12 + Math.random(), string: 0, x: (barStart + 12) * stepSize, length: stepSize, fret: 4, velocity: 0.9, effect: null });
        for (let i = 0; i < 16; i++) {
          if (i % 2 === 0 || Math.random() > 0.4) {
            const isAccent = i % 4 === 0;
            blocks.push({ id: now + barStart + i + Math.random(), string: 1, x: (barStart + i) * stepSize, length: stepSize, fret: 8, velocity: isAccent ? 0.7 : 0.3 + Math.random() * 0.2, effect: null });
          }
        }
      }
      return blocks;
    };

    const generateBass = () => {
      const blocks = [];
      for (let bar = 0; bar < numBars; bar++) {
        const barStart = bar * stepsPerBar;
        const chordDegree = progression[bar % progression.length];
        const chordTones = getChordTones(chordDegree);
        const rootNoteMidi = 36 + rootKey + chordTones[0]; 
        const mappedRoot = getNoteFret(rootNoteMidi, 0);

        blocks.push({ id: now + barStart + Math.random(), string: mappedRoot.string, x: barStart * stepSize, length: stepSize * 4, fret: mappedRoot.fret, velocity: 0.9, effect: null });
        if (Math.random() > 0.5) blocks.push({ id: now + barStart + 8 + Math.random(), string: mappedRoot.string, x: (barStart + 8) * stepSize, length: stepSize * 2, fret: mappedRoot.fret, velocity: 0.8, effect: null });
        if (Math.random() > 0.7) {
          const fifthNoteMidi = 36 + rootKey + chordTones[2];
          const mappedFifth = getNoteFret(fifthNoteMidi, mappedRoot.string);
          blocks.push({ id: now + barStart + 10 + Math.random(), string: mappedFifth.string, x: (barStart + 10) * stepSize, length: stepSize, fret: mappedFifth.fret, velocity: 0.7, effect: null });
        }
      }
      return blocks;
    };

    const generateMelody = (melodyInst) => {
      const blocks = [];
      const motifSteps = [0, 4, 8, 12];
      for (let bar = 0; bar < numBars; bar++) {
        const barStart = bar * stepsPerBar;
        const chordDegree = progression[bar % progression.length];
        const chordTones = getChordTones(chordDegree);
        
        let currentMotif = (bar % 2 === 0) 
          ? [chordTones[0], chordTones[1], chordTones[2], chordTones[0] + 12]
          : [chordTones[1], chordTones[2], chordTones[1], chordTones[2] + 12];

        for (let i = 0; i < 4; i++) {
          if (Math.random() > 0.8 && i !== 0) continue;
          const stepInBar = motifSteps[i];
          const targetMidi = 48 + rootKey + currentMotif[i];
          let prefString = melodyInst === 'guitar' ? 3 : 5; 
          const mapped = getNoteFret(targetMidi, prefString);
          const length = (Math.random() > 0.7) ? stepSize * 2 : stepSize;
          
          blocks.push({ id: now + barStart + i + Math.random(), string: mapped.string, x: (barStart + stepInBar) * stepSize, length: length, fret: mapped.fret, velocity: 0.7 + Math.random() * 0.3, effect: null });

          if (Math.random() > 0.6 && i < 3) {
            const nextStep = stepInBar + 2;
            const nextMidi = 48 + rootKey + currentMotif[i] + (Math.random() > 0.5 ? 1 : -1);
            const mappedNext = getNoteFret(nextMidi, mapped.string);
            blocks.push({ id: now + barStart + i + 10 + Math.random(), string: mappedNext.string, x: (barStart + nextStep) * stepSize, length: stepSize, fret: mappedNext.fret, velocity: 0.5 + Math.random() * 0.2, effect: null });
          }
        }
      }
      return blocks;
    };

    // 🔄 2. ЭВОЛЮЦИЯ (Если блоки уже есть)
    const currentBlocks = tracks[inst] || [];
    if (currentBlocks.length > 0) {
      const POPULATION_SIZE = 15;
      const SCALE = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22];

      const evaluateFitness = (blocks) => {
        let score = 100;
        blocks.forEach((b, i) => {
          const closest = SCALE.reduce((a, val) => Math.abs(val - b.fret) < Math.abs(a - b.fret) ? val : a);
          const deviation = Math.abs(b.fret - closest);
          if (deviation > 0) score -= deviation * 4;
          if (i > 0) {
            const jump = Math.abs(b.fret - blocks[i-1].fret);
            if (jump > 7) score -= (jump - 7) * 3;
          }
          const step = Math.round(b.x / stepSize) % 16;
          if (step % 4 === 0) score += 5;
        });
        return Math.max(0, score);
      };

      const createMutant = (baseBlocks) => {
        let mutant = baseBlocks.map(b => ({ ...b }));
        mutant.forEach(block => {
          if (Math.random() < 0.2) block.x = Math.max(0, Math.round((block.x + (Math.random() < 0.5 ? -1 : 1) * stepSize) / stepSize) * stepSize);
          if (Math.random() < 0.3) block.fret = Math.max(0, Math.min(MAX_FRET, block.fret + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.7 ? 1 : 2)));
          if (Math.random() < 0.1) block.length = Math.max(stepSize, Math.round((block.length + (Math.random() < 0.5 ? -1 : 1) * stepSize) / stepSize) * stepSize);
        });
        if (Math.random() < 0.15 && mutant.length > 2) mutant.splice(Math.floor(Math.random() * mutant.length), 1);
        if (Math.random() < 0.15 && mutant.length > 0) {
          const src = mutant[Math.floor(Math.random() * mutant.length)];
          mutant.push({ ...src, id: Date.now() + Math.random(), x: Math.max(0, src.x + (Math.random() - 0.5) * 4 * stepSize), fret: Math.max(0, Math.min(MAX_FRET, src.fret + (Math.random() - 0.5) * 4)) });
        }
        return mutant;
      };

      let population = [];
      for (let i = 0; i < POPULATION_SIZE; i++) {
        const mutant = createMutant(currentBlocks);
        population.push({ blocks: mutant, fitness: evaluateFitness(mutant) });
      }
      population.sort((a, b) => b.fitness - a.fitness);
      
      setTracks(prev => ({ ...prev, [inst]: population[0].blocks }));
      if (uiSoundsEnabled) uiSounds.playChirp();
      return;
    }

    // 🆕 3. ГЕНЕРАЦИЯ С НУЛЯ (Умный бит)
    // Проверяем, есть ли хоть какие-то ноты на других инструментах
    const totalBlocks = Object.values(tracks).flat().length;

    if (totalBlocks === 0) {
      // Если трек полностью пустой, генерируем ЦЕЛЫЙ ДЕМО-БИТ
      const newTracks = { guitar: [], synth: [], drum: [], bass: [], chip: [] };
      const demoType = Math.floor(Math.random() * 12); // ✅ Теперь 12 стилей!

      if (demoType === 0) {
        // 🎸 1. SYNTHWAVE (Am - F - C - G)
        const chordRoots = [45, 41, 48, 43];
        for (let bar = 0; bar < 4; bar++) {
          const root = chordRoots[bar];
          const barX = bar * 16 * stepSize;
          for (let i = 0; i < 16; i += 2) newTracks.drum.push({ id: Math.random(), string: 1, x: barX + i * stepSize, length: stepSize, fret: 8, velocity: i % 4 === 0 ? 0.8 : 0.4, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX, length: stepSize, fret: 0, velocity: 1, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 8 * stepSize, length: stepSize, fret: 0, velocity: 1, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 4 * stepSize, length: stepSize, fret: 4, velocity: 0.9, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 12 * stepSize, length: stepSize, fret: 4, velocity: 0.9, effect: null });
          for (let i = 0; i < 16; i += 2) {
            const mapped = getNoteFret(root - 12, 0);
            newTracks.bass.push({ id: Math.random(), string: mapped.string, x: barX + i * stepSize, length: stepSize, fret: mapped.fret, velocity: 0.8, effect: null });
          }
          const arp = [0, 3, 7, 12];
          for (let i = 0; i < 16; i++) {
            const mapped = getNoteFret(root + 12 + arp[i % 4], 4);
            newTracks.synth.push({ id: Math.random(), string: mapped.string, x: barX + i * stepSize, length: stepSize * 0.8, fret: mapped.fret, velocity: 0.6, effect: null });
          }
        }
        setBpm(115);

      } else if (demoType === 1) {
        // 🎧 2. LO-FI (Cmaj7 - Am7 - Dm7 - G7)
        const chords = [[48, 52, 55, 59], [45, 48, 52, 55], [50, 53, 57, 60], [43, 47, 50, 53]];
        for (let bar = 0; bar < 4; bar++) {
          const barX = bar * 16 * stepSize;
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX, length: stepSize, fret: 0, velocity: 1, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 3 * stepSize, length: stepSize, fret: 0, velocity: 0.8, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 10 * stepSize, length: stepSize, fret: 0, velocity: 0.8, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 4 * stepSize, length: stepSize, fret: 4, velocity: 0.7, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 12 * stepSize, length: stepSize, fret: 4, velocity: 0.7, effect: null });
          for (let i = 0; i < 16; i += 2) {
            if (i === 4 || i === 12) continue; 
            newTracks.drum.push({ id: Math.random(), string: 1, x: barX + i * stepSize, length: stepSize, fret: 8, velocity: 0.3, effect: null });
          }
          const mappedBass = getNoteFret(chords[bar][0] - 12, 0);
          newTracks.bass.push({ id: Math.random(), string: mappedBass.string, x: barX, length: stepSize * 6, fret: mappedBass.fret, velocity: 0.8, effect: null });
          newTracks.bass.push({ id: Math.random(), string: mappedBass.string, x: barX + 8 * stepSize, length: stepSize * 4, fret: mappedBass.fret, velocity: 0.7, effect: null });
          chords[bar].forEach((note, idx) => {
            const mapped = getNoteFret(note, 3);
            newTracks.guitar.push({ id: Math.random(), string: mapped.string, x: barX + idx * 0.5 * stepSize, length: stepSize * 3, fret: mapped.fret, velocity: 0.5, effect: null });
          });
          const melody = [0, 3, 7, 10];
          for (let i = 0; i < 4; i++) {
            const mapped = getNoteFret(chords[bar][0] + 12 + melody[i], 5);
            newTracks.chip.push({ id: Math.random(), string: mapped.string, x: barX + (4 + i * 2) * stepSize, length: stepSize, fret: mapped.fret, velocity: 0.5, effect: null });
          }
        }
        setBpm(85);

      } else if (demoType === 2) {
        // 🎬 3. EPIC CINEMATIC (Cm - Ab - Eb - Bb)
        const chords = [[48, 51, 55], [44, 48, 51], [51, 55, 58], [46, 50, 53]];
        for (let bar = 0; bar < 4; bar++) {
          const barX = bar * 16 * stepSize;
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX, length: stepSize, fret: 0, velocity: 1, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 8 * stepSize, length: stepSize, fret: 0, velocity: 1, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 4 * stepSize, length: stepSize, fret: 4, velocity: 1, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 12 * stepSize, length: stepSize, fret: 4, velocity: 1, effect: null });
          if (bar === 0) newTracks.drum.push({ id: Math.random(), string: 1, x: barX, length: stepSize, fret: 16, velocity: 1, effect: null });
          const mappedBass = getNoteFret(chords[bar][0] - 24, 0);
          newTracks.bass.push({ id: Math.random(), string: mappedBass.string, x: barX, length: stepSize * 8, fret: mappedBass.fret, velocity: 1, effect: null });
          newTracks.bass.push({ id: Math.random(), string: mappedBass.string, x: barX + 8 * stepSize, length: stepSize * 8, fret: mappedBass.fret, velocity: 0.9, effect: null });
          chords[bar].forEach(note => {
            const mapped = getNoteFret(note, 4);
            newTracks.synth.push({ id: Math.random(), string: mapped.string, x: barX, length: stepSize * 16, fret: mapped.fret, velocity: 0.6, effect: null });
          });
          const mappedLead = getNoteFret(chords[bar][0] + 12, 3);
          newTracks.guitar.push({ id: Math.random(), string: mappedLead.string, x: barX, length: stepSize * 4, fret: mappedLead.fret, velocity: 0.8, effect: null });
          newTracks.guitar.push({ id: Math.random(), string: mappedLead.string, x: barX + 8 * stepSize, length: stepSize * 2, fret: mappedLead.fret + 2, velocity: 0.8, effect: null });
          newTracks.guitar.push({ id: Math.random(), string: mappedLead.string, x: barX + 12 * stepSize, length: stepSize * 4, fret: mappedLead.fret + 3, velocity: 0.8, effect: null });
        }
        setBpm(75);

      } else if (demoType === 3) {
        // 🎉 4. HAPPY POP (C - G - Am - F) - BPM 126
        const chords = [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]];
        for (let bar = 0; bar < 4; bar++) {
          const barX = bar * 16 * stepSize;
          for (let i = 0; i < 16; i += 4) newTracks.drum.push({ id: Math.random(), string: 0, x: barX + i * stepSize, length: stepSize, fret: 0, velocity: 1, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 4 * stepSize, length: stepSize, fret: 4, velocity: 0.9, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 12 * stepSize, length: stepSize, fret: 4, velocity: 0.9, effect: null });
          for (let i = 2; i < 16; i += 4) newTracks.drum.push({ id: Math.random(), string: 1, x: barX + i * stepSize, length: stepSize, fret: 12, velocity: 0.6, effect: null });
          const mappedBass = getNoteFret(chords[bar][0] - 12, 1);
          for (let i = 0; i < 16; i += 2) {
            newTracks.bass.push({ id: Math.random(), string: mappedBass.string, x: barX + i * stepSize, length: stepSize, fret: mappedBass.fret + (i % 4 === 0 ? 0 : 12), velocity: 0.8, effect: null });
          }
          chords[bar].forEach(note => {
            const mapped = getNoteFret(note, 4);
            for (let i = 2; i < 16; i += 4) {
              newTracks.synth.push({ id: Math.random(), string: mapped.string, x: barX + i * stepSize, length: stepSize, fret: mapped.fret, velocity: 0.6, effect: null });
            }
          });
          const mel = [12, 16, 19, 24];
          for (let i = 0; i < 4; i++) {
            const mapped = getNoteFret(chords[bar][0] + mel[i], 4);
            newTracks.guitar.push({ id: Math.random(), string: mapped.string, x: barX + (i * 4) * stepSize, length: stepSize * 2, fret: mapped.fret, velocity: 0.8, effect: null });
          }
        }
        setBpm(126);

      } else if (demoType === 4) {
        // 🕺 5. FUNKY DISCO (Dm7 - G7 - Cmaj7 - A7) - BPM 115
        const chords = [[50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59], [45, 49, 52, 55]];
        for (let bar = 0; bar < 4; bar++) {
          const barX = bar * 16 * stepSize;
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX, length: stepSize, fret: 0, velocity: 1, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 3 * stepSize, length: stepSize, fret: 0, velocity: 0.8, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 8 * stepSize, length: stepSize, fret: 0, velocity: 1, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 4 * stepSize, length: stepSize, fret: 4, velocity: 1, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 12 * stepSize, length: stepSize, fret: 4, velocity: 1, effect: null });
          for (let i = 0; i < 16; i++) {
            if (i === 4 || i === 12) continue;
            newTracks.drum.push({ id: Math.random(), string: 1, x: barX + i * stepSize, length: stepSize, fret: 8, velocity: i % 2 === 0 ? 0.4 : 0.2, effect: null });
          }
          const mappedBass = getNoteFret(chords[bar][0] - 12, 0);
          [0, 2, 3, 6, 8, 10, 11, 14].forEach(i => {
            newTracks.bass.push({ id: Math.random(), string: mappedBass.string, x: barX + i * stepSize, length: stepSize, fret: mappedBass.fret + (i % 4 === 2 ? 12 : 0), velocity: 0.9, effect: null });
          });
          chords[bar].forEach(note => {
            const mapped = getNoteFret(note, 3);
            [0, 3, 6, 10, 12].forEach(i => {
              newTracks.guitar.push({ id: Math.random(), string: mapped.string, x: barX + i * stepSize, length: stepSize, fret: mapped.fret, velocity: 0.7, effect: null });
            });
          });
          const mel = [0, 3, 7, 10, 12];
          for (let i = 0; i < 5; i++) {
            const mapped = getNoteFret(chords[bar][0] + 12 + mel[i], 5);
            newTracks.chip.push({ id: Math.random(), string: mapped.string, x: barX + (i * 3 + 2) * stepSize, length: stepSize, fret: mapped.fret, velocity: 0.6, effect: null });
          }
        }
        setBpm(115);

      } else if (demoType === 5) {
        // 👾 6. 8-BIT ARCADE (Em - C - G - D) - BPM 140
        const chords = [[52, 55, 59], [48, 52, 55], [43, 47, 50], [50, 54, 57]];
        for (let bar = 0; bar < 4; bar++) {
          const barX = bar * 16 * stepSize;
          for (let i = 0; i < 16; i += 2) newTracks.drum.push({ id: Math.random(), string: 0, x: barX + i * stepSize, length: stepSize, fret: 0, velocity: 0.9, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 4 * stepSize, length: stepSize, fret: 4, velocity: 1, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 12 * stepSize, length: stepSize, fret: 4, velocity: 1, effect: null });
          for (let i = 0; i < 16; i += 1) newTracks.drum.push({ id: Math.random(), string: 1, x: barX + i * stepSize, length: stepSize, fret: 8, velocity: 0.3, effect: null });
          const mappedBass = getNoteFret(chords[bar][0] - 12, 0);
          for (let i = 0; i < 16; i += 2) {
            newTracks.bass.push({ id: Math.random(), string: mappedBass.string, x: barX + i * stepSize, length: stepSize, fret: mappedBass.fret, velocity: 0.9, effect: null });
          }
          const arp = [0, 3, 7, 12, 7, 3];
          for (let i = 0; i < 16; i += 1) {
            const mapped = getNoteFret(chords[bar][0] + 12 + arp[i % 6], 5);
            newTracks.chip.push({ id: Math.random(), string: mapped.string, x: barX + i * stepSize, length: stepSize * 0.8, fret: mapped.fret, velocity: 0.7, effect: null });
          }
          chords[bar].forEach(note => {
            const mapped = getNoteFret(note, 4);
            newTracks.synth.push({ id: Math.random(), string: mapped.string, x: barX, length: stepSize * 8, fret: mapped.fret, velocity: 0.5, effect: null });
          });
        }
        setBpm(140);

      } else if (demoType === 6) {
        // 🎸 7. SOLO GUITAR (Fingerpicking) - BPM 100
        const chords = [[45, 48, 52, 57], [41, 45, 48, 53], [48, 52, 55, 60], [43, 47, 50, 55]]; // Am, F, C, G
        for (let bar = 0; bar < 4; bar++) {
          const barX = bar * 16 * stepSize;
          const root = getNoteFret(chords[bar][0] - 12, 0);
          newTracks.guitar.push({ id: Math.random(), string: root.string, x: barX, length: stepSize * 4, fret: root.fret, velocity: 0.8, effect: null });
          [2, 4, 6, 8, 10, 12, 14].forEach((step, idx) => {
            const note = chords[bar][(idx % 3) + 1];
            const mapped = getNoteFret(note, 3);
            newTracks.guitar.push({ id: Math.random(), string: mapped.string, x: barX + step * stepSize, length: stepSize * 2, fret: mapped.fret, velocity: 0.6, effect: null });
          });
        }
        setBpm(100);

      } else if (demoType === 7) {
        // 👾 8. CHIP SOLO (Heroic 8-bit) - BPM 150
        const chords = [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]]; // C, G, Am, F
        for (let bar = 0; bar < 4; bar++) {
          const barX = bar * 16 * stepSize;
          const arp = [0, 4, 7, 12, 16, 12, 7, 4];
          for (let i = 0; i < 16; i += 1) {
            const mapped = getNoteFret(chords[bar][0] + arp[i % 8], 5);
            newTracks.chip.push({ id: Math.random(), string: mapped.string, x: barX + i * stepSize, length: stepSize * 0.8, fret: mapped.fret, velocity: 0.7, effect: null });
          }
          const mappedBass = getNoteFret(chords[bar][0] - 12, 1);
          for (let i = 0; i < 16; i += 4) {
            newTracks.chip.push({ id: Math.random(), string: mappedBass.string, x: barX + i * stepSize, length: stepSize * 2, fret: mappedBass.fret, velocity: 0.8, effect: null });
          }
        }
        setBpm(150);

      } else if (demoType === 8) {
        // 🎸👾 9. GUITAR & CHIP DUO (Math Rock) - BPM 130
        const chords = [[52, 55, 59], [48, 52, 55], [43, 47, 50], [50, 54, 57]]; // Em, C, G, D
        for (let bar = 0; bar < 4; bar++) {
          const barX = bar * 16 * stepSize;
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX, length: stepSize, fret: 0, velocity: 1, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 8 * stepSize, length: stepSize, fret: 0, velocity: 1, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 4 * stepSize, length: stepSize, fret: 4, velocity: 0.9, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 12 * stepSize, length: stepSize, fret: 4, velocity: 0.9, effect: null });
          const mappedGuitar = getNoteFret(chords[bar][0], 3);
          for (let i = 0; i < 16; i += 2) {
            newTracks.guitar.push({ id: Math.random(), string: mappedGuitar.string, x: barX + i * stepSize, length: stepSize, fret: mappedGuitar.fret, velocity: 0.8, effect: null });
          }
          const arp = [0, 3, 7, 12];
          for (let i = 0; i < 16; i += 2) {
            const mapped = getNoteFret(chords[bar][0] + 12 + arp[(i/2) % 4], 5);
            newTracks.chip.push({ id: Math.random(), string: mapped.string, x: barX + (i + 1) * stepSize, length: stepSize, fret: mapped.fret, velocity: 0.7, effect: null });
          }
        }
        setBpm(130);
      
      } else if (demoType === 9) {
        // 🥁 10. DRUM & BASS (DnB) - BPM 174
        const bassNotes = [40, 36, 43, 38]; // E, C, G, D
        for (let bar = 0; bar < 4; bar++) {
          const barX = bar * 16 * stepSize;
          // Drums (Breakbeat)
          [0, 6, 10].forEach(i => newTracks.drum.push({ id: Math.random(), string: 0, x: barX + i * stepSize, length: stepSize, fret: 0, velocity: 1, effect: null }));
          [4, 12].forEach(i => newTracks.drum.push({ id: Math.random(), string: 0, x: barX + i * stepSize, length: stepSize, fret: 4, velocity: 0.9, effect: null }));
          for (let i = 0; i < 16; i++) {
            if (i === 4 || i === 12) continue;
            newTracks.drum.push({ id: Math.random(), string: 1, x: barX + i * stepSize, length: stepSize, fret: 8, velocity: 0.3, effect: null });
          }
          // Bass (Sub Bass)
          const mappedBass = getNoteFret(bassNotes[bar] - 12, 0);
          newTracks.bass.push({ id: Math.random(), string: mappedBass.string, x: barX, length: stepSize * 6, fret: mappedBass.fret, velocity: 0.9, effect: null });
          newTracks.bass.push({ id: Math.random(), string: mappedBass.string, x: barX + 10 * stepSize, length: stepSize * 4, fret: mappedBass.fret, velocity: 0.8, effect: null });
        }
        setBpm(174);

      } else if (demoType === 10) {
        // 🥁 11. PERCUSSION SOLO (Only Drums) - BPM 130
        for (let bar = 0; bar < 4; bar++) {
          const barX = bar * 16 * stepSize;
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX, length: stepSize, fret: 0, velocity: 1, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 7 * stepSize, length: stepSize, fret: 0, velocity: 0.8, effect: null });
          newTracks.drum.push({ id: Math.random(), string: 0, x: barX + 10 * stepSize, length: stepSize, fret: 4, velocity: 0.9, effect: null });
          // Toms
          for (let i = 0; i < 16; i += 2) {
            const tomFret = 8 + (i % 6);
            newTracks.drum.push({ id: Math.random(), string: 1, x: barX + i * stepSize, length: stepSize, fret: tomFret, velocity: 0.7, effect: null });
          }
          // Snare roll (fill) at the end of the bar
          for (let i = 12; i < 16; i++) {
            newTracks.drum.push({ id: Math.random(), string: 0, x: barX + i * stepSize, length: stepSize, fret: 4, velocity: 0.5 + (i - 12) * 0.1, effect: null });
          }
        }
        setBpm(130);

      } else {
        // 🎸 12. BASS SOLO (Only Bass) - BPM 110
        for (let bar = 0; bar < 4; bar++) {
          const barX = bar * 16 * stepSize;
          const rootNote = 36 + (bar * 2); 
          const mapped = getNoteFret(rootNote, 0);
          // Funky syncopated bassline
          [0, 2, 4, 7, 8, 11, 12, 14].forEach((step, idx) => {
            const fretOffset = idx % 2 === 0 ? 0 : 12; // Octave jumps
            newTracks.bass.push({ id: Math.random(), string: mapped.string, x: barX + step * stepSize, length: stepSize, fret: mapped.fret + fretOffset, velocity: 0.8 + (idx % 3 === 0 ? 0.2 : 0), effect: null });
          });
          // Slide up
          newTracks.bass.push({ id: Math.random(), string: mapped.string, x: barX + 14 * stepSize, length: stepSize * 2, fret: mapped.fret + 5, velocity: 0.9, effect: null });
        }
        setBpm(110);
      }

      setTracks(newTracks);
      if (uiSoundsEnabled) uiSounds.playBoom();
      return;
    }
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
  
 };
  
    // Горячие клавиши (оптимизировано)
    useEffect(() => {
      const handleKeyDown = (e) => {
        // 1. Игнорируем в инпутах
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
        // Достаем АКТУАЛЬНЫЕ функции из нашей "коробочки" (ref)
        const { 
          handleTogglePlay, 
          handleStop, 
          handleRecord, 
          copySelectedBlocks, 
          pasteBlocks, 
          deleteSelectedBlocks 
        } = funcsRef.current; 
  
        // Достаем АКТУАЛЬНЫЕ данные (выделенные блоки, треки, инструмент)
        const selectedIds = selectedBlockIdsRef.current; 
        const currentTracks = tracksRef.current;
        const currentInstrument = instrumentRef.current;
  
        // Горячие клавиши для выбора инструмента (1-5)
        if (e.code >= 'Digit1' && e.code <= 'Digit5') {
          const index = parseInt(e.code.replace('Digit', '')) - 1;
          const instruments = ['guitar', 'synth', 'drum', 'bass', 'chip'];
          if (instruments[index]) {
            e.preventDefault();
            setInstrument(instruments[index]);
          }
          return;
        }
  
        // 2. Удаление (Delete / Backspace)
        if (e.code === 'Delete' || e.code === 'Backspace') {
          if (selectedIds.size > 0) {
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
          handleTogglePlay();
          return;
        }
  
        // 4. Клавиша S – STOP
        if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          handleStop();
          return;
        }
  
        // 5. Клавиша R — запись (Record)
        if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          handleRecord();
          return;
        }
  
        // 6. Копирование / Вставка (Ctrl+C / Ctrl+V)
        const isC = e.key === 'c' || e.key === 'с' || e.code === 'KeyC';
        const isV = e.key === 'v' || e.key === 'м' || e.code === 'KeyV';
  
        if ((e.ctrlKey || e.metaKey) && isC) {
          e.preventDefault();
          copySelectedBlocks();
        } else if ((e.ctrlKey || e.metaKey) && isV) {
          e.preventDefault();
          pasteBlocks();
        }
  
        // 7. Ctrl+D – дублировать выделенные блоки
        if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyD' || e.key === 'd' || e.key === 'в')) {
          e.preventDefault();
          if (selectedIds.size > 0) {
            copySelectedBlocks();
            pasteBlocks();
          }
          return;
        }
  
        // 8. Ctrl+A – выделить все блоки текущего инструмента
        const isA = e.key === 'a' || e.key === 'ф' || e.code === 'KeyA';
        if ((e.ctrlKey || e.metaKey) && isA) {
          e.preventDefault();
          const allIds = currentTracks[currentInstrument].map(b => b.id);
          setSelectedBlockIds(new Set(allIds));
          return;
        }
      };
  
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, []);

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
      let visualString = Math.floor(relativeY / 60);
      let newString = isReversed ? strings.length - 1 - visualString : visualString;
      newString = Math.max(0, Math.min(strings.length - 1, newString));
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
    
      // 1. Вычисляем точную максимальную длину нот (кэшируется)
  const maxEndPX = useMemo(() => {
    let maxX = 0;
    for (const arr of Object.values(tracks)) {
      for (const b of arr) {
        if (b.x + b.length > maxX) maxX = b.x + b.length;
      }
    }
    return maxX;
  }, [tracks]);

  // 2. Вычисляем ширину сетки (добавляем 1000px запаса)
  const gridWidth = useMemo(() => Math.max(2000, maxEndPX + 1000), [maxEndPX]);

  // 3. Синхронизируем ref для аудио-движка (чтобы он видел актуальную длину без перезапуска)
  useEffect(() => {
    maxEndPXRef.current = maxEndPX;
  }, [maxEndPX]);

    // 4. Синхронизация лупа с Transport (Авто-зацикливание)
    useEffect(() => {
      const transport = Tone.getTransport();
      const stepTime = 60 / bpm / 4;
      
      if (loopActive && loopEnd > loopStart) {
        // Если включен режим лупа (зеленая рамка)
        transport.loopStart = (loopStart / STEP_WIDTH) * stepTime;
        transport.loopEnd = (loopEnd / STEP_WIDTH) * stepTime;
        transport.loop = true;
      } else if (!loopActive && maxEndPX > 0) {
        // Если луп выключен, но есть ноты — зацикливаем весь трек от 0 до конца
        const globalLoopEndTime = (maxEndPX / STEP_WIDTH) * stepTime;
        transport.loopStart = 0;
        transport.loopEnd = globalLoopEndTime;
        transport.loop = true;
      } else {
        transport.loop = false;
      }
    }, [loopActive, loopStart, loopEnd, bpm, maxEndPX]);

  if (mode === "landing") {
    return (
      <div className={`app landing ${theme === 'light' ? 'light-theme' : ''}`}>
        <div className="landing-content" style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          minHeight: "100vh",
          width: "100%",
          padding: "20px",
          paddingTop: "12vh",
          boxSizing: "border-box"
        }}>
                               {/* 🎃 ДВЕ КЛАССИЧЕСКИЕ ТЫКВЫ */}
          <div className="halloween-pumpkins-container">
            
            {/* ЛЕВАЯ ТЫКВА (ШИРОКАЯ) */}
            <div className="pumpkin-wrapper pumpkin-left">
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="pumpkinGradLeft" cx="50%" cy="50%" r="50%">
                    <stop offset="10%" stopColor="#FF9D00" />
                    <stop offset="70%" stopColor="#E65C00" />
                    <stop offset="100%" stopColor="#8C2900" />
                  </radialGradient>
                </defs>
                {/* Стебель */}
                <path d="M 90 50 Q 95 20 115 30 Q 110 40 115 50" fill="#4A2E15" stroke="#2B1A0B" strokeWidth="2"/>
                {/* Тело */}
                <ellipse cx="100" cy="125" rx="85" ry="65" fill="url(#pumpkinGradLeft)" />
                {/* Прожилки */}
                <path d="M 100 60 Q 70 125 100 190" stroke="#C24B00" strokeWidth="3" fill="none" opacity="0.6"/>
                <path d="M 100 60 Q 130 125 100 190" stroke="#C24B00" strokeWidth="3" fill="none" opacity="0.6"/>
                <path d="M 100 60 Q 40 125 50 185" stroke="#C24B00" strokeWidth="3" fill="none" opacity="0.6"/>
                <path d="M 100 60 Q 160 125 150 185" stroke="#C24B00" strokeWidth="3" fill="none" opacity="0.6"/>
                {/* Глаза (Классические треугольники) */}
                <polygon points="40,100 85,110 55,140" className="face-glow" />
                <polygon points="160,100 115,110 145,140" className="face-glow" />
                {/* Нос */}
                <polygon points="100,125 85,145 115,145" className="face-glow" />
                {/* Рот с зубами */}
                <path d="M 50,160 L 70,175 L 80,160 L 100,185 L 120,160 L 130,175 L 150,160 L 140,190 L 60,190 Z" className="face-glow" />
              </svg>
            </div>

            {/* ПРАВАЯ ТЫКВА (ВЫСОКАЯ) */}
            <div className="pumpkin-wrapper pumpkin-right">
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="pumpkinGradRight" cx="50%" cy="50%" r="50%">
                    <stop offset="10%" stopColor="#FF8800" />
                    <stop offset="70%" stopColor="#D94E00" />
                    <stop offset="100%" stopColor="#7A1C00" />
                  </radialGradient>
                </defs>
                {/* Стебель (изогнутый) */}
                <path d="M 95 40 Q 105 10 125 20 Q 120 30 115 45" fill="#4A2E15" stroke="#2B1A0B" strokeWidth="2"/>
                {/* Тело (более овальное) */}
                <ellipse cx="100" cy="120" rx="70" ry="75" fill="url(#pumpkinGradRight)" />
                {/* Прожилки */}
                <path d="M 100 45 Q 70 120 100 195" stroke="#B33B00" strokeWidth="3" fill="none" opacity="0.6"/>
                <path d="M 100 45 Q 130 120 100 195" stroke="#B33B00" strokeWidth="3" fill="none" opacity="0.6"/>
                <path d="M 100 45 Q 50 120 60 185" stroke="#B33B00" strokeWidth="3" fill="none" opacity="0.6"/>
                <path d="M 100 45 Q 150 120 140 185" stroke="#B33B00" strokeWidth="3" fill="none" opacity="0.6"/>
                {/* Глаза (Большие, злые) */}
                <polygon points="40,85 85,95 45,125" className="face-glow" />
                <polygon points="160,85 115,95 155,125" className="face-glow" />
                {/* Нос */}
                <polygon points="100,120 90,135 110,135" className="face-glow" />
                {/* Рот */}
                <path d="M 55,155 L 75,165 L 85,150 L 100,175 L 115,150 L 125,165 L 145,155 L 135,185 L 65,185 Z" className="face-glow" />
              </svg>
            </div>

          </div>


          <div className="logo-wrapper">
            <h1 className="neon-struna" style={{ marginBottom: "5px" }}>STRUNA</h1>
          </div>
  
          <p className="tagline" style={{ marginTop: "0", marginBottom: "25px", whiteSpace: "nowrap" }}>
  {Array.from(t('tagline')).map((char, index) => {
    if (char === ' ') {
      return <span key={index} style={{ display: 'inline-block', width: '0.5em' }}>&nbsp;</span>;
    }
    return (
      <span
        key={index}
        className="flicker-char"
        style={{
          animationDelay: `${index * 0.08}s`,
          display: 'inline-block'
        }}
      >
        {char}
      </span>
    );
  })}
</p>
  
<button
  onClick={() => handleStartCreating("guitar")}
  className="start-btn"
  style={{
    marginTop: "15px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    padding: "12px 30px"
  }}
>
  <span style={{ fontSize: "inherit", lineHeight: 1.2 }}>{t('startBtn')}</span>
  <span style={{
    fontSize: "10px",
    opacity: 0.8,
    letterSpacing: "1.5px",
    color: "inherit", // ✅ Наследует цвет текста кнопки
    fontWeight: "500"
  }}>
    🎧 3D SOUND
  </span>
</button>
  
          {mode === "landing" && (
  <div style={{
    position: 'fixed',
    top: '25px',
    right: '25px',
    zIndex: 9999,
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  }}>
    {/* Кнопка переключения темы */}
    <button
      onClick={toggleTheme}
      className="top-btn"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
    {/* Google кнопка (ваша оригинальная) */}
    <div 
      onClick={() => login()}
      style={{
        background: 'rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.15)',
        width: '50px',
        height: '50px',
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
{/* Кнопка переключения языка */}
<button
      onClick={toggleLang}
      className="top-btn"
    >
      {lang === 'en' ? 'EN' : 'RU'}
    </button>
  </div>
)}
  
  <div className="preview">
            {/* GUITAR */}
            <div
              className="preview-track guitar"
              onClick={(e) => { e.stopPropagation(); playDemo("guitar"); }}
              onDoubleClick={() => handleStartCreating("guitar")}
              style={{ '--glow-color': '#FFB84D' }} // Оранжевый
            >
              <span>GUITAR</span>
            </div>
  
            {/* SYNTH */}
            <div
              className="preview-track synth"
              onClick={(e) => { e.stopPropagation(); playDemo("synth"); }}
              onDoubleClick={() => handleStartCreating("synth")}
              style={{ '--glow-color': '#4DC3FF' }} // Голубой
            >
              <span>SYNTH</span>
            </div>
  
            {/* DRUM */}
            <div
              className="preview-track drum"
              onClick={(e) => { e.stopPropagation(); playDemo("drum"); }}
              onDoubleClick={() => handleStartCreating("drum")}
              style={{ '--glow-color': '#FF4D4D' }} // Красный
            >
              <span>DRUM</span>
            </div>
  
            {/* BASS */}
            <div
              className="preview-track bass"
              onClick={(e) => { e.stopPropagation(); playDemo("bass"); }}
              onDoubleClick={() => handleStartCreating("bass")}
              style={{ '--glow-color': '#BD00FF' }} // Фиолетовый
            >
              <span>BASS</span>
            </div>
  
            {/* CHIP */}
            <div
              className="preview-track chip"
              onClick={(e) => { e.stopPropagation(); playDemo("chip"); }}
              onDoubleClick={() => handleStartCreating("chip")}
              style={{ '--glow-color': '#4DFF88' }} // Зеленый
            >
              <span>CHIP</span>
            </div>
          </div>
  
          <div style={{
            textAlign: "center",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            marginTop: "auto",
            position: "relative",
            zIndex: 2
          }}>
            <p
  className="powered-by-text"
  style={{
    fontSize: "10px",
    letterSpacing: "4px",
    textTransform: "uppercase",
    margin: 0,
    fontFamily: "sans-serif"
  }}
>
  Powered By <span className="neon-kargani" style={{ fontWeight: "bold" }}>KARGANI STUDIO</span>
 
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
    {/* 🔮 КНОПКА-ЛОГОТИП (ВОЗВРАТ НА ПРЕВЬЮ) */}
    <button
      onClick={() => {
        stopSound();
        setMode("landing");
      }}
      title="Вернуться на главную"
      className="app-logo-btn"
    >
      <img
        src="/android-chrome-192x192.png"
        alt="Back to Home"
        className="app-logo-img"
      />
    </button>
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

{/* 🎨 Кнопка рандомной смены палитры фона */}
<button
  className="menu-item"
  onClick={randomizeBgPalette}
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 24px'
  }}
>
  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
    🎨 {t('bgPalette')}
  </span>
  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <span style={{ fontSize: '11px', opacity: 0.5 }}>🎲</span>
    <span style={{ display: 'flex', gap: '3px' }}>
      {(() => {
        const p = BG_PALETTES[bgPaletteIndex];
        const c = theme === 'light' ? p.light : p.dark;
        return ['g1a', 'g1b', 'g1c'].map(key => (
          <span
            key={key}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: c[key],
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'inline-block',
              boxShadow: `0 0 6px ${c[key]}`
            }}
          />
        ));
      })()}
    </span>
  </span>
</button>

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
  
            {/* ================= ДИЗАЙН: АККУРАТНЫЙ ВЕРТИКАЛЬНЫЙ СТЕК ================= */}
            <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        width: "100%", 
        maxWidth: "1050px", 
        margin: "0 auto 30px auto" 
      }}>
        
        {/* ================= 1. ПАНЕЛЬ INFO (ТЕМП, ЭФФЕКТЫ, МАСТЕР) ================= */}
        <div style={{
          width: "100%",
          overflow: "hidden",
          maxHeight: isTempoMasterVisible ? "400px" : "0px",
          opacity: isTempoMasterVisible ? 1 : 0,
          marginBottom: isTempoMasterVisible ? "20px" : "0px",
          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
        }}>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(3, 1fr)", 
            gap: "0px", 
            width: "100%",
            background: "var(--bg-card)",
            borderRadius: "12px",
            border: `1px solid ${getInstrumentColor(instrument)}`,
            boxShadow: `0 0 15px ${getInstrumentColor(instrument)}33`,
            boxSizing: "border-box"
          }}>
            {/* 1.1 БЛОК ТЕМПА И ЛУПА */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px", borderRight: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "11px", color: "var(--text-accent)", textAlign: "center", fontWeight: "bold", letterSpacing: "1px" }}>{t('tempo')}</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--text-bright)", textAlign: "center", marginBottom: "10px" }}>{bpm}</div>
              
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%" }}>
                <button onClick={() => { if (!metroOn) Tone.start(); setMetroOn(!metroOn); }} style={{
                  background: metroOn ? 'rgba(77, 255, 136, 0.15)' : 'rgba(255,255,255,0.06)', border: `2px solid ${metroOn ? 'var(--text-bright)' : 'var(--border-color)'}`,
                  borderRadius: '20px', padding: '4px 16px', color: metroOn ? 'var(--text-bright)' : 'var(--text-secondary)', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', width: "120px"
                }}>{metroOn ? t('metroOn') : t('metroOff')}</button>
                
                <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%", maxWidth: "160px" }}>
                  <span style={{ fontSize: "9px", color: "var(--text-secondary)" }}>🔊</span>
                  <input type="range" min="0" max="1" step="0.05" value={metroVolume} onChange={(e) => setMetroVolume(parseFloat(e.target.value))} style={{ flex: 1, height: "4px", cursor: "pointer" }} />
                  <span style={{ fontSize: "8px", color: "var(--text-bright)", width: "24px", textAlign: "right" }}>{Math.round(metroVolume * 100)}%</span>
                </div>
                
                <div style={{ position: "relative", width: "100%", maxWidth: "160px" }}>
                  <select 
                    value={metroSound} 
                    onChange={(e) => setMetroSound(e.target.value)} 
                    style={{ 
                      width: "100%", 
                      background: "rgba(255,255,255,0.04)", 
                      border: "1px solid var(--border-color)", 
                      borderRadius: "8px", 
                      padding: "6px 10px", 
                      color: "var(--text-primary)", 
                      fontSize: "10px", 
                      fontWeight: "bold", 
                      cursor: "pointer", 
                      appearance: "none", 
                      WebkitAppearance: "none",
                      textAlign: "center", 
                      outline: "none", 
                      boxShadow: "none"
                    }}
                  >
                    <option value="click" style={{ background: "var(--bg-card)", color: "white" }}>🎵 {t('metroSoundClick')}</option>
                    <option value="beep" style={{ background: "var(--bg-card)", color: "white" }}>🔔 {t('metroSoundBeep')}</option>
                    <option value="drum" style={{ background: "var(--bg-card)", color: "white" }}>🥁 {t('metroSoundDrum')}</option>
                    <option value="noise" style={{ background: "var(--bg-card)", color: "white" }}>🎛️ {t('metroSoundNoise')}</option>
                    <option value="bell" style={{ background: "var(--bg-card)", color: "white" }}>🔔 {t('metroSoundBell')}</option>
                  </select>
                  <div style={{ 
                    position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", 
                    pointerEvents: "none", color: "var(--text-secondary)", fontSize: "8px" 
                  }}>
                    ▼
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "16px", width: "100%", maxWidth: "200px" }}>
                <button onClick={() => {
                  const currentX = playheadXRef.current;
                  if (loopStart === 0 && loopEnd === 0) { setLoopStart(currentX); setLoopEnd(0); setPreviewLoopEnd(currentX); } 
                  else if (loopStart !== 0 && loopEnd === 0) { let endX = (previewLoopEnd > loopStart) ? previewLoopEnd : currentX; if (endX <= loopStart) endX = loopStart + STEP_WIDTH; setLoopEnd(endX); setPreviewLoopEnd(0); setLoopActive(true); } 
                  else { setLoopStart(0); setLoopEnd(0); setPreviewLoopEnd(0); setLoopActive(false); }
                }} style={{ flex: 1, background: "var(--btn-bg)", border: `1px solid ${loopStart === 0 ? "var(--text-bright)" : "var(--warning-border)"}`, borderRadius: "8px", padding: "6px 0", color: loopStart === 0 ? "var(--text-bright)" : "var(--warning-border)", fontSize: "8px", fontWeight: "bold", cursor: "pointer" }}>
                  {loopStart === 0 ? t('setLoop') : (loopEnd === 0 ? t('setEnd') : t('resetLoop'))}
                </button>
                <button onClick={() => { if (loopStart !== 0 && loopEnd !== 0 && loopEnd > loopStart) setLoopActive(!loopActive); else setInfoModal({ visible: true, message: t('infoSetLoop') }); }} style={{ flex: 1, background: loopActive ? "var(--text-bright)" : "var(--btn-bg)", border: `1px solid ${loopActive ? "var(--text-bright)" : "var(--warning-border)"}`, borderRadius: "8px", padding: "6px 0", color: loopActive ? "var(--bg-card)" : "var(--warning-border)", fontSize: "8px", fontWeight: "bold", cursor: "pointer" }}>
                  {loopActive ? t('loopOn') : t('loopOff')}
                </button>
              </div>

              <input type="range" min="60" max="200" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} style={{ width: "100%", maxWidth: "180px", cursor: "pointer", marginTop: "16px" }} />
            </div>

                        {/* 1.2 БЛОК ЭФФЕКТОВ */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px", borderRight: "1px solid var(--border-color)" }}>
              
              <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
                {[
                  { name: 'click', label: 'Click', svg: <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>, play: () => uiSounds.playClick() }, 
                  { name: 'pop', label: 'Pop', svg: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="2 3"/></svg>, play: () => uiSounds.playPop() },
                  { name: 'pixel', label: 'Pixel', svg: <svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>, play: () => uiSounds.playPixel() }, 
                  { name: 'boom', label: 'Boom', svg: <svg viewBox="0 0 24 24"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg>, play: () => uiSounds.playBoom() },
                  { name: 'chirp', label: 'Chirp', svg: <svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>, play: () => uiSounds.playChirp() }
                ].map(effect => (
                  <button 
                    key={effect.name} 
                    title={effect.label}
                    className="effect-btn"
                    onClick={(e) => { 
                      const btn = e.currentTarget; 
                      btn.classList.add('btn-flash'); 
                      setTimeout(() => btn.classList.remove('btn-flash'), 150); 
                      applyEffectToSelectedBlocks(effect.name); 
                      effect.play(); 
                    }} 
                  >
                    {effect.svg}
                  </button>
                ))}
                
                {/* Кнопка удаления эффектов */}
                <button 
                  title="Remove Effect"
                  className="effect-btn effect-btn-remove"
                  onClick={(e) => { 
                    const btn = e.currentTarget; 
                    btn.classList.add('btn-flash-red'); 
                    setTimeout(() => btn.classList.remove('btn-flash-red'), 150); 
                    applyEffectToSelectedBlocks(null); 
                  }} 
                >
                  <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
              </div>
              
              <div style={{ fontSize: "10px", color: "var(--text-secondary)", textAlign: "center", marginBottom: "20px", letterSpacing: "0.5px" }}>
                {t('selectBlock')}
              </div>
              
              <button onClick={removeAllEffects} className="pill-btn warning-pill">
                {t('removeAllEffects')}
              </button>
              
              <div style={{ display: "flex", gap: "8px", width: "100%", maxWidth: "200px", marginTop: "8px" }}>
                <button onClick={toggleSubMode} className={`pill-btn ${subMode ? 'active-sub' : ''}`} style={{ flex: 1 }}>
                  <svg style={{width: '14px', height: '14px', fill: 'currentColor'}} viewBox="0 0 24 24"><path d="M3 12h18v2H3zM6 8h12v2H6zM9 16h6v2H9z"/></svg>
                  {subMode ? t('subOn') : t('subOff')}
                </button>
                
                <button onClick={toggleReverseStrings} className={`pill-btn ${isReversed ? 'active-rev' : ''}`} style={{ flex: 1 }}>
                  <svg style={{width: '14px', height: '14px', fill: 'currentColor'}} viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
                  {t('reverseStrings')}
                </button>
              </div>
            </div>

                        {/* 1.3 БЛОК МАСТЕР-ГРОМКОСТИ */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
              <div style={{ fontSize: "10px", color: "var(--text-accent)", textAlign: "center", fontWeight: "bold", letterSpacing: "1px" }}>{t('masterVol')}</div>
              
              {/* Ползунок общей громкости */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", maxWidth: "180px", marginTop: "10px" }}>
                <span style={{ fontSize: "12px" }}>🔊</span>
                <input type="range" min="0" max="1" step="0.01" value={masterGainValue} onChange={(e) => { const val = parseFloat(e.target.value); setMasterGainValue(val); if (masterGainRef.current) masterGainRef.current.gain.rampTo(val, 0.05); }} style={{ flex: 1, height: "4px" }} />
              </div>
              
              {/* Проценты громкости */}
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--text-bright)", textAlign: "center", textShadow: "0 0 8px var(--text-bright)", marginTop: "10px" }}>{Math.round(masterGainValue * 100)}%</div>
              
              {/* Кнопки VU и WAVE (теперь идеально ровные) */}
              <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "12px" }}>
                <button 
                  onClick={() => setMasterDisplayMode("vu")} 
                  style={{ 
                    background: masterDisplayMode === "vu" ? "var(--text-bright)" : "transparent", 
                    border: `1px solid var(--text-bright)`, 
                    borderRadius: "20px", 
                    width: "85px", /* 👈 Фиксированная ширина */
                    height: "24px", /* 👈 Фиксированная высота */
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "8px", 
                    color: masterDisplayMode === "vu" ? "var(--bg-card)" : "var(--text-bright)", 
                    fontWeight: "bold", 
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  {t('vu')}
                </button>
                
                <button 
                  onClick={() => setMasterDisplayMode("wave")} 
                  style={{ 
                    background: masterDisplayMode === "wave" ? "var(--text-bright)" : "transparent", 
                    border: `1px solid var(--text-bright)`, 
                    borderRadius: "20px", 
                    width: "85px", /* 👈 Фиксированная ширина */
                    height: "24px", /* 👈 Фиксированная высота */
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "8px", 
                    color: masterDisplayMode === "wave" ? "var(--bg-card)" : "var(--text-bright)", 
                    fontWeight: "bold", 
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  {t('wave')}
                </button>
              </div>
              
              {/* Сам измеритель (VU полоски или WAVE круг) */}
              <div style={{ height: "50px", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "10px" }}>
                {masterDisplayMode === "vu" ? (
                  <div style={{ display: "flex", gap: "3px", justifyContent: "center", alignItems: "flex-end", height: "35px" }}>
                    {[...Array(20)].map((_, idx) => { const intensity = idx / 20; const isActive = masterVolume > intensity; let color = "var(--text-bright)"; if (intensity > 0.7) color = "#FFB84D"; if (intensity > 0.9) color = "var(--warning-border)"; return <div key={idx} ref={el => vuBarRefs.current[idx] = el} style={{ width: "4px", height: `${6 + intensity * 25}px`, backgroundColor: isActive ? color : "rgba(var(--bg-card-rgb), 0.2)", borderRadius: "2px" }} />; })}
                  </div>
                ) : (
                  <div ref={waveCircleRef} style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid var(--text-bright)", transform: `scale(${0.4 + masterVolume * 0.8})` }} />
                )}
              </div>
              
              {/* Таймер */}
              <div ref={secondsRef} style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-bright)", textAlign: "center" }}>{currentPosition.seconds.toFixed(1)}s</div>
              <div ref={barBeatRef} style={{ fontSize: "9px", color: "var(--text-accent)", textAlign: "center" }}>({currentPosition.bar}.{currentPosition.beat})</div>
            </div>
            </div>
            </div>

        {/* ================= 2. ПАНЕЛЬ FX (ЭФФЕКТЫ) ================= */}
        <div style={{
          width: "100%",
          overflow: "hidden",
          maxHeight: showFX ? "180px" : "0px",
          opacity: showFX ? 1 : 0,
          marginBottom: showFX ? "20px" : "0px",
          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px", width: "100%",
            background: "var(--bg-card)", padding: "20px", borderRadius: "12px", 
            border: `1px solid ${getInstrumentColor(instrument)}`, 
            boxShadow: `0 0 15px ${getInstrumentColor(instrument)}33`, 
            boxSizing: "border-box"
          }}>
                        {/* ЗАГОЛОВОК FX */}
                        <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: "bold", letterSpacing: "2px", color: getInstrumentColor(instrument), marginBottom: "10px", padding: "0 10px" }}>
              <span>⚙️ FX</span>
              <span>{instrument.toUpperCase()}</span>
            </div>

            {/* VOLUME */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: "9px", color: "var(--text-secondary)", fontWeight: "bold", marginBottom: "2px" }}>{t('volume')}</span>
              <span style={{ fontSize: "11px", color: "var(--text-bright)", marginBottom: "8px" }}>{volumes[instrument].toFixed(2)}</span>
              <input type="range" min="0" max="1" step="0.01" value={volumes[instrument]} onChange={(e) => setVolumes(prev => ({ ...prev, [instrument]: Number(e.target.value) }))} style={{ width: "100%", maxWidth: "100px" }} />
              <button style={{ ...resetBtnStyle, marginTop: "8px", padding: "2px 10px", fontSize: "8px" }} onClick={() => setVolumes(prev => ({ ...prev, [instrument]: 1.0 }))}>{t('reset')}</button>
            </div>
            {/* FX VOLUME */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: "9px", color: "var(--text-secondary)", fontWeight: "bold", marginBottom: "2px" }}>{t('fxVol')}</span>
              <span style={{ fontSize: "11px", color: "var(--text-bright)", marginBottom: "8px" }}>{fxVolume.toFixed(2)}</span>
              <input type="range" min="0" max="1" step="0.01" value={fxVolume} onChange={(e) => setFxVolume(parseFloat(e.target.value))} style={{ width: "100%", maxWidth: "100px" }} />
              <button style={{ ...resetBtnStyle, marginTop: "8px", padding: "2px 10px", fontSize: "8px" }} onClick={() => setFxVolume(0.5)}>{t('reset')}</button>
            </div>
            {/* CUTOFF */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: "9px", color: "var(--text-secondary)", fontWeight: "bold", marginBottom: "2px" }}>{t('cutoff')}</span>
              <span style={{ fontSize: "11px", color: "var(--text-bright)", marginBottom: "8px" }}>{filters[instrument].cutoff}</span>
              <input type="range" min="200" max="10000" value={filters[instrument].cutoff} onChange={(e) => setFilters(p => ({ ...p, [instrument]: { ...p[instrument], cutoff: Number(e.target.value) } }))} style={{ width: "100%", maxWidth: "100px" }} />
              <button style={{ ...resetBtnStyle, marginTop: "8px", padding: "2px 10px", fontSize: "8px" }} onClick={() => setFilters(p => ({ ...p, [instrument]: { ...p[instrument], cutoff: 8000 } }))}>{t('reset')}</button>
            </div>
            {/* Q */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: "9px", color: "var(--text-secondary)", fontWeight: "bold", marginBottom: "2px" }}>{t('q')}</span>
              <span style={{ fontSize: "11px", color: "var(--text-bright)", marginBottom: "8px" }}>{filters[instrument].q}</span>
              <input type="range" min="0.1" max="20" step="0.1" value={filters[instrument].q} onChange={(e) => setFilters(p => ({ ...p, [instrument]: { ...p[instrument], q: Number(e.target.value) } }))} style={{ width: "100%", maxWidth: "100px" }} />
              <button style={{ ...resetBtnStyle, marginTop: "8px", padding: "2px 10px", fontSize: "8px" }} onClick={() => setFilters(p => ({ ...p, [instrument]: { ...p[instrument], q: 1 } }))}>{t('reset')}</button>
            </div>
            {/* CHORUS */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: "9px", color: "var(--text-secondary)", fontWeight: "bold", marginBottom: "2px" }}>{t('chorus')}</span>
              <span style={{ fontSize: "11px", color: "var(--text-bright)", marginBottom: "8px" }}>{fx[instrument].chorus.toFixed(2)}</span>
              <input type="range" min="0" max="1" step="0.01" value={fx[instrument].chorus} onChange={(e) => setFx(p => ({ ...p, [instrument]: { ...p[instrument], chorus: Number(e.target.value) } }))} style={{ width: "100%", maxWidth: "100px" }} />
              <button style={{ ...resetBtnStyle, marginTop: "8px", padding: "2px 10px", fontSize: "8px" }} onClick={() => setFx(p => ({ ...p, [instrument]: { ...p[instrument], chorus: 0.3 } }))}>{t('reset')}</button>
            </div>
            {/* REVERB */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontSize: "9px", color: "var(--text-secondary)", fontWeight: "bold", marginBottom: "2px" }}>{t('reverb')}</span>
              <span style={{ fontSize: "11px", color: "var(--text-bright)", marginBottom: "8px" }}>{fx[instrument].reverb.toFixed(2)}</span>
              <input type="range" min="0" max="1" step="0.01" value={fx[instrument].reverb} onChange={(e) => setFx(p => ({ ...p, [instrument]: { ...p[instrument], reverb: Number(e.target.value) } }))} style={{ width: "100%", maxWidth: "100px" }} />
              <button style={{ ...resetBtnStyle, marginTop: "8px", padding: "2px 10px", fontSize: "8px" }} onClick={() => setFx(p => ({ ...p, [instrument]: { ...p[instrument], reverb: 0.25 } }))}>{t('reset')}</button>
            </div>
          </div>
        </div>

                {/* ================= 3. ПАНЕЛЬ 3D ================= */}
                <div style={{
          width: "100%",
          overflow: "hidden",
          maxHeight: show3D ? "160px" : "0px", /* 👈 Увеличили высоту со 140px до 160px, чтобы ничего не обрезалось */
          opacity: show3D ? 1 : 0,
          marginBottom: show3D ? "20px" : "0px",
          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
        }}>
          <div style={{
            display: "flex", flexDirection: "column", width: "100%",
            background: "var(--bg-card)", padding: "20px", borderRadius: "12px", 
            border: `1px solid ${getInstrumentColor(instrument)}`, 
            boxShadow: `0 0 15px ${getInstrumentColor(instrument)}33`, 
            boxSizing: "border-box"
          }}>
            {/* ЗАГОЛОВОК 3D */}
            <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", padding: "0 10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                <span style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-accent)", letterSpacing: "2px" }}>🎧 3D</span>
                
                {/* КНОПКА ВКЛ/ВЫКЛ */}
                <button
                  onClick={() => setIs3DEnabled(!is3DEnabled)}
                  style={{
                    background: is3DEnabled ? 'rgba(77, 255, 136, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                    border: `1px solid ${is3DEnabled ? 'var(--text-bright)' : 'var(--border-color)'}`,
                    color: is3DEnabled ? 'var(--text-bright)' : 'var(--text-secondary)',
                    borderRadius: '20px',
                    padding: '4px 16px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: is3DEnabled ? '0 0 12px rgba(77, 255, 136, 0.3)' : 'none',
                    letterSpacing: '1px'
                  }}
                >
                  {is3DEnabled ? t('3dOn') : t('3dOff')}
                </button>
              </div>
              
              <span style={{ fontSize: "11px", fontWeight: "bold", letterSpacing: "2px", color: getInstrumentColor(instrument) }}>{instrument.toUpperCase()}</span>
            </div>

            {/* СЛАЙДЕРЫ ОСЕЙ (Убрана двойная сетка) */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(3, 1fr)", 
              gap: "30px", /* Чуть увеличили отступ */
              width: "100%",
              opacity: is3DEnabled ? 1 : 0.3,
              pointerEvents: is3DEnabled ? "auto" : "none",
              transition: "opacity 0.3s ease",
              padding: "0 10px" /* Добавили отступы по краям */
            }}>
              {['x', 'y', 'z'].map((axis) => (
                <div key={axis} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                  <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-secondary)", width: "16px" }}>{axis.toUpperCase()}</span>
                  
                  <input 
                    type="range" 
                    min="-10" 
                    max="10" 
                    step="0.1" 
                    value={positions3D[instrument]?.[axis] ?? (axis === 'z' ? -5 : 0)} 
                    onChange={(e) => { 
                      const val = parseFloat(e.target.value); 
                      setPositions3D(prev => ({ ...prev, [instrument]: { ...prev[instrument], [axis]: val } })); 
                    }} 
                    style={{ flex: 1, cursor: "pointer", minWidth: "50px" }} 
                  />
                  
                  <span style={{ fontSize: "11px", color: "var(--text-bright)", minWidth: "30px", textAlign: "right" }}>
                    {positions3D[instrument]?.[axis]?.toFixed(1) ?? (axis === 'z' ? -5 : 0)}
                  </span>
                  
                  <button 
                    style={{ ...resetBtnStyle, fontSize: "8px", padding: "2px 8px" }} 
                    onClick={() => { 
                      const defaultPos = defaultPositions[instrument]; 
                      setPositions3D(prev => ({ ...prev, [instrument]: { ...prev[instrument], [axis]: defaultPos[axis] } })); 
                    }}
                  >
                    {t('reset')}
                  </button>
                </div>
              ))}
            </div>
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

      {/* GEN (Генератор, между Stop и Record) */}
  <button
    onClick={generateAIPattern}
    disabled={isPlaying}
    className="ai-btn"
    title="Generate Pattern" // 👈 Подсказка при наведении
    style={{
      width: "55px",
      height: "50px",
      background: "rgba(var(--bg-card-rgb), 0.5)",
      border: `1px solid ${isPlaying ? 'rgba(189, 0, 255, 0.1)' : 'rgba(189, 0, 255, 0.4)'}`,
      color: isPlaying ? 'rgba(189, 0, 255, 0.2)' : 'rgba(189, 0, 255, 0.7)', // Чуть ярче сделали цвет
      borderRadius: "10px",
      fontSize: "15px", // 👈 Уменьшили шрифт, чтобы "GEN" влезло идеально
      fontWeight: "bold",
      letterSpacing: "1.5px",
      cursor: isPlaying ? "not-allowed" : "pointer",
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: isPlaying ? 0.5 : 1,
      filter: isPlaying ? 'grayscale(100%)' : 'none'
    }}
  >
    GEN
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

{/* Правая группа: очистка инструмента и СБРОС */}
<div style={{ display: "flex", gap: "10px", marginLeft: "auto", alignItems: "center" }}>
<button
  onClick={clearCurrentInstrument}
  className={`clear-instrument-btn ${tracks[instrument]?.length === 0 ? 'empty' : ''}`}
  title={t('clearInstrument')}
  style={{
    border: `1px solid ${getInstrumentColor(instrument)}`,
    color: getInstrumentColor(instrument),
    borderRadius: "6px",
    padding: "8px 16px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: "bold",
    letterSpacing: "0.5px",
    "--inst-color": getInstrumentColor(instrument),
  }}
>
  {t('clearInstrument')}
</button>

    <button onClick={() => setShowResetConfirm(true)} className="reset-btn">
      {t('resetAll')}
    </button>
    </div>
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
          width: `${gridWidth}px`, 
          display: "inline-block",
          minWidth: '100%',
          position: "relative", 
          minHeight: 480, 
          backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)`, 
          backgroundSize: `${STEP_WIDTH}px 60px` 
        }}>
                    {loopStart !== 0 && (
            (loopActive && loopEnd > loopStart) || 
            (loopEnd === 0 && previewLoopEnd > loopStart)
          ) && (
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
          {strings.map((_, renderIndex) => {
            const stringIndex = isReversed ? strings.length - 1 - renderIndex : renderIndex;
            const s = strings[stringIndex];
            
            return (
            <div key={stringIndex} 
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                if (e.target.closest(".block") || e.target.closest(".playhead-grabber")) return;
                isDraggingRef.current = true;
                const x = Math.floor(getRelativeX(e.clientX) / STEP_WIDTH) * STEP_WIDTH;
                const newBlock = { id: Date.now(), string: stringIndex, x, length: 80, fret: 0, velocity: 1, effect: null }; // ✅ Используем stringIndex
                const existingOnString = tracks[instrument].filter(b => b.string === stringIndex);
                const overlapping = existingOnString.some(b => (x < b.x + b.length && x + 80 > b.x));
                if (!overlapping) {
                  setTracks(prev => ({...prev, [instrument]: [...prev[instrument], newBlock]}));
                }
              }}
              onTouchStart={(e) => {
                if (e.target.closest(".block") || e.target.closest(".playhead-grabber")) return;
                const touchX = e.touches[0].clientX;
                const x = Math.floor(getRelativeX(touchX) / STEP_WIDTH) * STEP_WIDTH;
                const newBlock = { id: Date.now(), string: stringIndex, x, length: 80, fret: 0, velocity: 1, effect: null }; // ✅ Используем stringIndex
                const existingOnString = tracks[instrument].filter(b => b.string === stringIndex);
                const overlapping = existingOnString.some(b => (x < b.x + b.length && x + 80 > b.x));
                if (!overlapping) {
                  setTracks(prev => ({...prev, [instrument]: [...prev[instrument], newBlock]}));
                }
              }}
              style={{ borderBottom: "1px solid #161B33", height: 60, display: "flex", alignItems: "center", paddingLeft: 10, color: "#4D88FF", position: "relative" }}
            >
              <span style={{ width: 30, fontWeight: "bold" }}>{s}</span>

{/* ===== ВСТАВИТЬ СЮДА ===== */}
{Object.keys(tracks).map(instName => 
  tracks[instName]
  .filter(b => b.string === stringIndex) // ✅ Используем stringIndex
    .map(b => {
      const isActive = isPlaying && activeStep >= Math.floor(b.x / STEP_WIDTH) && activeStep < Math.floor((b.x + b.length) / STEP_WIDTH);
      const isSelected = selectedBlockIds.has(b.id);

      return (
        <NoteBlock
          key={b.id}
          block={b}
          instName={instName}
          instrument={instrument}
          isSelected={isSelected}
          isActive={isActive}
          getColor={getColor}
          handleSelectBlock={handleSelectBlock}
          handleGroupDragStart={handleGroupDragStart}
          startDrag={startDrag}
          startResize={startResize}
          handleTouchStart={handleTouchStart}
          handleTouchMove={handleTouchMove}
          handleTouchEnd={handleTouchEnd}
          isDraggingRef={isDraggingRef}
          setTracks={setTracks}
          setSelectedBlockIds={setSelectedBlockIds}
        />
      );
    })
)}
              
            </div>
          )})}
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
>
  {t('changelogBtn')}
</button>
</div>
{/* ===== ПОДВАЛ С POWERED BY (как на превью) ===== */}
<div style={{
  textAlign: "center",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
  marginTop: "20px",
  marginBottom: "10px",
  position: "relative",
  zIndex: 2
}}>
  <p
    className="powered-by-text"
    style={{
      fontSize: "10px",
      letterSpacing: "4px",
      textTransform: "uppercase",
      margin: 0,
      fontFamily: "sans-serif"
    }}
  >
    Powered By <span className="neon-kargani" style={{ fontWeight: "bold" }}>KARGANI STUDIO</span>
  </p>
  {/* 👇 ДОБАВЛЯЕМ ВЕРСИЮ СЮДА 👇 */}
  <span style={{
    fontSize: "9px",
    color: "var(--text-accent)",
    opacity: 0.6,
    letterSpacing: "1px",
    textTransform: "uppercase",
    padding: "2px 8px",
    border: "1px solid rgba(77, 136, 255, 0.2)",
    borderRadius: "4px"
  }}>
    VERSION 2.0
  </span>

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
          <div className="control-item"><span>{t('controls.keyboard.ctrlA').split(' — ')[0]}</span> — {t('controls.keyboard.ctrlA').split(' — ')[1]}</div>
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
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: "6px 0", borderBottom: idx !== t('changelogText').length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
          <span style={{ color: 'var(--text-accent)' }}>•</span>
          <span style={{ flex: 1 }}>{item.replace('• ', '')}</span>
        </div>
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
  <div className="custom-modal-overlay" onClick={handleCloseInfoModal}>
    <div className="custom-modal info-modal" onClick={(e) => e.stopPropagation()}>
      <div className="neon-icon">ℹ️</div>
      <h2 style={{ color: 'var(--text-accent)', textShadow: '0 0 8px var(--text-accent)' }}>
        {infoModal.title || t('infoTitle')}
      </h2>
      <p>{infoModal.message}</p>
      <div className="modal-buttons">
        <button className="cancel-modal-btn" onClick={handleCloseInfoModal}>{t('infoOk')}</button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}

export default App;