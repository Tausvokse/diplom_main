import React, { useEffect } from 'react';
import QRCode from 'react-qr-code';
import { socketService } from '../../services/socket';
import toast from 'react-hot-toast';

interface DiiaSocketListenerProps {
  onSuccess: () => void;
  sessionId: string;
}

export const DiiaSocketListener: React.FC<DiiaSocketListenerProps> = ({ onSuccess, sessionId }) => {
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

  // Generate a mock Deeplink or QR data for Diia App
  const diiaData = JSON.stringify({
    action: 'share',
    sessionId: sessionId,
    requestParams: ['passport', 'student_id'],
  });

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl">
      <div className="bg-blue-50 p-4 rounded-full mb-6">
        <img 
          src="https://diia.gov.ua/build/assets/images/diia-logo-black.svg" 
          alt="Diia Logo" 
          className="w-16 h-16 object-contain filter invert opacity-80" 
          onError={(e) => {
            // Fallback text if logo fails to load
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <span className="text-2xl font-bold">Дія</span>
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-2">Шеринг документів</h3>
      <p className="text-gray-500 text-center mb-8 max-w-sm">
        Відскануйте QR-код за допомогою застосунку Дія для автоматичної передачі копії паспорта та ідентифікаційного коду.
      </p>

      <div className="p-4 bg-white border-2 border-gray-100 rounded-2xl shadow-sm mb-8">
        <QRCode 
          value={diiaData} 
          size={200}
          level="H"
          className="rounded-lg"
        />
      </div>

      <div className="flex items-center text-sm text-gray-500 animate-pulse">
        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
        Очікування підтвердження в застосунку...
      </div>
      
      {/* Dev helper to simulate success */}
      {import.meta.env.MODE === 'development' && (
        <button 
          onClick={onSuccess}
          className="mt-8 text-xs text-gray-400 underline"
        >
          [DEV] Імітувати успішну верифікацію
        </button>
      )}
    </div>
  );
};

export default DiiaSocketListener;
