import React from 'react';

function MobileApp({
  // Основные состояния и функции
  isPlaying, handleTogglePlay, handleStop, handleRecord, isRecording,
  handleResetAll,
  bpm, setBpm,
  masterVolume, currentPosition,
  instrument, setInstrument,
  tracks, setTracks, selectedBlockIds, setSelectedBlockIds,
  deleteSelectedBlocks, copySelectedBlocks, pasteBlocks,
  isGroupDragging, handleGroupDragStart, handleGroupDragMove,
  scrollRef, playheadRef, startDrag, startResize,
  handleSelectBlock, getRelativeX, STEP_WIDTH, STEP_TIME,
  OPEN_STRINGS, strings, getColor, activeStep,
  volumes, filters, fx, setVolumes, setFilters, setFx,
  showFX, setShowFX,
  // VU-метр
  // Константы
}) {
  const [isTempoMasterVisible, setIsTempoMasterVisible] = React.useState(true);
  const [isFXVisible, setIsFXVisible] = React.useState(false);

  // Увеличенные размеры для мобильных
  const mobileStepWidth = 30;
  const rowHeight = 70;

  return (
    <div className="mobile-app" style={{ padding: '10px', fontFamily: 'sans-serif', color: 'white', background: '#0B1020', minHeight: '100vh' }}>
      {/* Верхняя панель с транспортом */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleTogglePlay} style={{ background: isPlaying ? '#4D88FF' : '#4DFF88', border: 'none', borderRadius: '40px', width: '60px', height: '60px', fontSize: '24px' }}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button onClick={handleStop} style={{ background: '#FF4D4D', border: 'none', borderRadius: '40px', width: '60px', height: '60px', fontSize: '24px' }}>⏹</button>
          <button onClick={handleRecord} style={{ background: isRecording ? '#FF4D4D' : '#0f172a', border: '1px solid #FF4D4D', borderRadius: '40px', width: '60px', height: '60px', fontSize: '20px' }}>🔴</button>
          <button onClick={handleResetAll} style={{ background: '#2A3350', border: 'none', borderRadius: '40px', width: '60px', height: '60px', fontSize: '20px' }}>⟳</button>
        </div>
        <div style={{ textAlign: 'center', background: '#0a0e1a', padding: '10px', borderRadius: '12px', border: '1px solid #4D88FF' }}>
          <div style={{ fontSize: '12px', color: '#4D88FF' }}>TEMPO</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#4DFF88' }}>{bpm}</div>
          <input type="range" min="60" max="200" value={bpm} onChange={e => setBpm(Number(e.target.value))} style={{ width: '120px' }} />
        </div>
        <div style={{ textAlign: 'center', background: '#0a0e1a', padding: '10px', borderRadius: '12px', border: '1px solid #4D88FF' }}>
          <div style={{ fontSize: '12px', color: '#4D88FF' }}>MASTER</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#4DFF88' }}>{Math.floor(masterVolume * 100)}%</div>
          <div style={{ fontSize: '14px' }}>{currentPosition.seconds.toFixed(1)}s</div>
        </div>
      </div>

      {/* Выбор инструмента */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['guitar', 'synth', 'bass', 'chip'].map(t => (
          <button key={t} onClick={() => setInstrument(t)} style={{
            background: instrument === t ? '#4D88FF' : '#1e2a50',
            border: 'none',
            borderRadius: '40px',
            padding: '12px 20px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'white'
          }}>
            {t === 'guitar' ? '🎸' : t === 'synth' ? '🎹' : t === 'bass' ? '🔊' : '🕹️'} {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Кнопка FX */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <button onClick={() => setIsFXVisible(!isFXVisible)} style={{
          background: '#2A3350',
          border: '1px solid #4D88FF',
          borderRadius: '30px',
          padding: '8px 16px',
          color: '#4D88FF'
        }}>
          {isFXVisible ? 'HIDE FX' : 'SHOW FX'}
        </button>
      </div>

      {/* Панель FX (ползунки) */}
      {isFXVisible && (
        <div style={{ background: '#0a0e1a', borderRadius: '16px', padding: '15px', marginBottom: '20px', border: '1px solid #2a3a6e' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#4D88FF' }}>VOLUME</div>
              <input type="range" min="0" max="1" step="0.01" value={volumes[instrument]} onChange={e => setVolumes(prev => ({ ...prev, [instrument]: Number(e.target.value) }))} style={{ width: '80px' }} />
              <div>{volumes[instrument].toFixed(2)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#4D88FF' }}>CUTOFF</div>
              <input type="range" min="200" max="10000" value={filters[instrument].cutoff} onChange={e => setFilters(p => ({ ...p, [instrument]: { ...p[instrument], cutoff: Number(e.target.value) } }))} style={{ width: '80px' }} />
              <div>{filters[instrument].cutoff}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#4D88FF' }}>Q</div>
              <input type="range" min="0.1" max="20" step="0.1" value={filters[instrument].q} onChange={e => setFilters(p => ({ ...p, [instrument]: { ...p[instrument], q: Number(e.target.value) } }))} style={{ width: '80px' }} />
              <div>{filters[instrument].q}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#4D88FF' }}>CHORUS</div>
              <input type="range" min="0" max="1" step="0.01" value={fx[instrument].chorus} onChange={e => setFx(p => ({ ...p, [instrument]: { ...p[instrument], chorus: Number(e.target.value) } }))} style={{ width: '80px' }} />
              <div>{fx[instrument].chorus.toFixed(2)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#4D88FF' }}>REVERB</div>
              <input type="range" min="0" max="1" step="0.01" value={fx[instrument].reverb} onChange={e => setFx(p => ({ ...p, [instrument]: { ...p[instrument], reverb: Number(e.target.value) } }))} style={{ width: '80px' }} />
              <div>{fx[instrument].reverb.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Сетка нот – упрощённая версия */}
      <div 
        ref={scrollRef}
        className="mobile-scroll"
        style={{ overflowX: 'auto', width: '100%', background: '#050814', borderRadius: '12px', border: '1px solid #2a3a6e', paddingBottom: '10px' }}
      >
        <div style={{ minWidth: `${Math.max(2000, ...Object.values(tracks).flat().map(b => b.x + b.length) + 500)}px`, position: 'relative' }}>
          {strings.map((noteName, idx) => (
            <div key={idx} style={{ borderBottom: '1px solid #2a3a6e', height: `${rowHeight}px`, display: 'flex', alignItems: 'center', paddingLeft: '8px', position: 'relative' }}>
              <span style={{ width: '40px', fontWeight: 'bold', color: '#4D88FF' }}>{noteName}</span>
              {Object.entries(tracks).map(([instName, blocks]) =>
                blocks.filter(b => b.string === idx).map(block => (
                  <div
                    key={block.id}
                    className="block-mobile"
                    onTouchStart={e => { e.stopPropagation(); handleSelectBlock(e, block, instName); if (instName === instrument) startDrag(block, e); }}
                    onTouchMove={e => { if (instName === instrument) handleGroupDragMove(e); }}
                    onTouchEnd={() => {}}
                    style={{
                      position: 'absolute',
                      left: block.x,
                      width: block.length,
                      height: rowHeight - 10,
                      top: 5,
                      backgroundColor: instName === instrument ? getColor(block.fret) : 'rgba(100,100,100,0.4)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      outline: selectedBlockIds.has(block.id) ? '2px solid cyan' : 'none'
                    }}
                  >
                    {block.fret}
                  </div>
                ))
              )}
            </div>
          ))}
          {/* Плейхед */}
          <div ref={playheadRef} style={{ position: 'absolute', top: 0, width: '2px', height: '100%', background: '#FF4D4D', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Подсказка */}
      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '11px', color: '#AAB3C2' }}>
        Tap on grid to add note. Long press to delete. Use two fingers to scroll.
      </div>
    </div>
  );
}

export default MobileApp;