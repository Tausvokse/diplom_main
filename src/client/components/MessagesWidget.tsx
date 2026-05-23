import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import styles from './MessagesWidget.module.css';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  receiver: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
  email: string;
}

export const MessagesWidget: React.FC = () => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchContacts = useCallback(async () => {
    try {
      const endpoint = user?.role === 'STUDENT' ? '/messages/admins' : '/messages/students';
      const res = await api.get(endpoint);
      setContacts(res.data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  }, [user?.role]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get('/messages');
      setMessages(res.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
      fetchMessages();
      
      const interval = setInterval(fetchMessages, 30000); // Polling every 30s
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchContacts, fetchMessages]);

  useEffect(() => {
    // With messages sorted newest first, we don't need to scroll to bottom.
  }, [messages, isOpen, selectedContact]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;

    setIsLoading(true);
    try {
      const res = await api.post('/messages', {
        receiverId: selectedContact.id,
        content: newMessage
      });
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
      toast.success('Повідомлення відправлено');
    } catch (error) {
      toast.error('Помилка відправки повідомлення');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role?: string) => {
    if (!role) return 'Студент';
    if (role === 'ADMIN_CAMPUS') return 'Директор';
    if (role === 'ADMIN_COMMANDANT') return 'Комендант';
    if (role === 'ADMIN') return 'Адміністратор';
    return 'Студент';
  };

  const filteredMessages = messages
    .filter(
      m => (m.senderId === selectedContact?.id && m.receiverId === user?.id) || 
           (m.senderId === user?.id && m.receiverId === selectedContact?.id)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (user?.role !== 'STUDENT') {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={styles.fab}
      >
        <MessageCircle className={styles.iconLarge} />
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            
            {/* Header */}
            <div className={styles.header}>
              <h3 className={styles.headerTitle}>
                <MessageCircle className={styles.iconSmall} /> 
                {user?.role === 'STUDENT' ? 'Зв\'язок з Адміністрацією' : 'Повідомлення від студентів'}
              </h3>
              <button onClick={() => setIsOpen(false)} className={styles.closeBtn}>
                <X className={styles.iconMed} />
              </button>
            </div>

            <div className={styles.body}>
              {/* Sidebar (Contacts) */}
              <div className={`${styles.sidebar} ${selectedContact ? styles.sidebarHidden : styles.sidebarFull}`}>
                {contacts.map(contact => (
                  <div 
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`${styles.contactItem} ${selectedContact?.id === contact.id ? styles.contactItemActive : styles.contactItemInactive}`}
                  >
                    <div className={`${styles.contactName} ${selectedContact?.id === contact.id ? styles.contactNameActive : styles.contactNameInactive}`}>
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div className={styles.contactRole}>{getRoleLabel(contact.role)}</div>
                  </div>
                ))}
                {contacts.length === 0 && (
                  <div className={styles.noContacts}>Немає контактів</div>
                )}
              </div>

              {/* Chat Area */}
              <div className={`${styles.chatArea} ${!selectedContact ? styles.chatAreaHidden : ''}`}>
                {selectedContact ? (
                  <>
                    <div className={styles.chatHeader}>
                      <button onClick={() => setSelectedContact(null)} className={styles.backBtn}>Назад</button>
                      <div className={styles.chatHeaderTitle}>{selectedContact.firstName}</div>
                    </div>
                    
                    <div className={styles.messagesList}>
                      {filteredMessages.map(msg => {
                        const isMine = msg.senderId === user?.id;
                        return (
                          <div key={msg.id} className={`${styles.messageWrapper} ${isMine ? styles.messageWrapperMine : styles.messageWrapperTheirs}`}>
                            <div className={`${styles.messageBubble} ${isMine ? styles.messageMine : styles.messageTheirs}`}>
                              <p className={styles.messageText}>{msg.content}</p>
                              <p className={`${styles.messageTime} ${isMine ? styles.messageTimeMine : styles.messageTimeTheirs}`}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      {filteredMessages.length === 0 && (
                        <div className={styles.noMessages}>
                          Немає повідомлень
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className={styles.inputForm}>
                      <input 
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Напишіть повідомлення..."
                        className={styles.inputField}
                      />
                      <button 
                        type="submit"
                        disabled={isLoading || !newMessage.trim()}
                        className={styles.sendBtn}
                      >
                        <Send className={styles.sendIcon} />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className={styles.emptySelect}>
                    Виберіть контакт для початку спілкування
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MessagesWidget;
