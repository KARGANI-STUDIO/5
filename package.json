import React, { useState } from 'react';

const UserProfile = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Если пользователя нет, ничего не рисуем
  if (!user) return null;

  return (
    <div style={{
      position: 'relative',    // Было 'absolute'
      display: 'flex',         // Добавляем, чтобы контейнер подстроился под содержимое
      alignItems: 'center',    // Выравниваем иконку по центру вертикали
      zIndex: 2000,
      marginRight: '15px',     // Создаем отступ от кнопки SAVE
      fontFamily: 'Orbitron, sans-serif'
    }}>
      <> 
        {/* Аватарка */}
        <img
          src={user.picture}
          alt={user.name}
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '40px',   // Чуть уменьшил размер, чтобы было аккуратнее (было 45)
            height: '40px',
            borderRadius: '50%',
            border: '2px solid #4dff88',
            boxShadow: '0 0 15px rgba(77, 255, 136, 0.5)',
            cursor: 'pointer',
            transition: '0.3s',
            objectFit: 'cover' // Чтобы фото не сплющивалось
          }}
        />

        {/* Выпадающее меню */}
        {isOpen && (
          <div style={{
            position: 'absolute',
            top: '50px',     // Опустили меню относительно новой позиции иконки
            right: '0',
            background: '#0a0a0f',
            border: '1px solid #4dff88',
            padding: '15px',
            borderRadius: '8px',
            minWidth: '180px',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
            backdropFilter: 'blur(5px)' // Добавил легкое размытие заднего фона
          }}>
            <p style={{ color: '#fff', fontSize: '12px', margin: '0 0 10px 0', fontWeight: 'bold' }}>
              {user.name}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', margin: '-5px 0 15px 0' }}>
              {user.email}
            </p>
            <button 
              onClick={onLogout}
              style={{
                background: 'rgba(255, 77, 77, 0.1)',
                color: '#ff4d4d',
                border: '1px solid #ff4d4d',
                padding: '8px 10px',
                cursor: 'pointer',
                fontSize: '11px',
                width: '100%',
                borderRadius: '4px',
                transition: '0.2s'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255, 77, 77, 0.2)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255, 77, 77, 0.1)'}
            >
              LOGOUT
            </button>
          </div>
        )}
      </>
    </div>
  );
}
export default UserProfile;