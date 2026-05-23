import React, { useEffect } from 'react';
import QRCode from 'react-qr-code';
import { socketService } from '../../services/socket';
import toast from 'react-hot-toast';
import styles from './DiiaSocketListener.module.css';

interface DiiaSocketListenerProps {
  onSuccess: () => void;
  sessionId: string;
  diiaData: Record<string, unknown>;
}

export const DiiaSocketListener: React.FC<DiiaSocketListenerProps> = ({ onSuccess, sessionId, diiaData }) => {
  useEffect(() => {
    // Ensure socket connection is active
    socketService.connect();
    const socket = socketService.getSocket();

    if (!socket) {
      toast.error('Не вдалося підключитися до сервера WebSocket');
      return;
    }

    // Join a specific room based on session ID for targeted events
    socket.emit('join_diia_session', { sessionId });

    // Listen for the success event
    const handleVerificationSuccess = (data: any) => {
      console.log('Diia Verification Success Data:', data);
      toast.success('Документи успішно верифіковано через Дію!');
      onSuccess();
    };

    const handleVerificationFailed = (error: any) => {
      console.error('Diia Verification Failed:', error);
      toast.error('Помилка верифікації через Дію. Спробуйте ще раз.');
    };

    socket.on('diia_verification_success', handleVerificationSuccess);
    socket.on('diia_verification_failed', handleVerificationFailed);

    return () => {
      socket.emit('leave_diia_session', { sessionId });
      socket.off('diia_verification_success', handleVerificationSuccess);
      socket.off('diia_verification_failed', handleVerificationFailed);
    };
  }, [sessionId, onSuccess]);

  return (
    <div className={styles.container}>
      <div className={styles.logoWrapper}>
        <img 
          src="https://diia.gov.ua/build/assets/images/diia-logo-black.svg" 
          alt="Diia Logo" 
          className={styles.logo} 
          onError={(e) => {
            // Fallback text if logo fails to load
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <span className={styles.logoText}>Дія</span>
      </div>
      
      <h3 className={styles.title}>Шеринг документів</h3>
      <p className={styles.description}>
        Відскануйте QR-код за допомогою застосунку Дія для автоматичної передачі копії паспорта та ідентифікаційного коду.
      </p>

      <div className={styles.qrWrapper}>
        <QRCode 
          value={JSON.stringify(diiaData)} 
          size={200}
          level="H"
          className={styles.qrCode}
        />
      </div>

      <div className={styles.statusWrapper}>
        <div className={styles.statusDot}></div>
        Очікування підтвердження в застосунку...
      </div>
      
      {/* Dev helper to simulate success */}
      {import.meta.env.MODE === 'development' && (
        <button 
          onClick={onSuccess}
          className={styles.devButton}
        >
          [DEV] Імітувати успішну верифікацію
        </button>
      )}
    </div>
  );
};

export default DiiaSocketListener;
