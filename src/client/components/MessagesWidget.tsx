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
  unreadCount?: number;
}

export const MessagesWidget: React.FC = () => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get('/messages');
      setMessages(res.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  const markRead = async (contactId: string) => {
    try {
      await api.patch(`/messages/conversation/${contactId}/read-all`);
      fetchConversations();
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      fetchMessages();

      const interval = setInterval(() => {
        fetchConversations();
        fetchMessages();
      }, 30000); // Polling every 30s
      return () => clearInterval(interval);
    } else {
      fetchConversations();
      const interval = setInterval(() => {
        fetchConversations();
      }, 60000); // Check for notifications every minute when closed
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchConversations, fetchMessages]);

  useEffect(() => {
    if (selectedContact) {
      markRead(selectedContact.id);
    }
  }, [selectedContact]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, selectedContact, scrollToBottom]);

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
      fetchConversations();
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
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const totalUnread = conversations.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0);

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
        {totalUnread > 0 && <div className={styles.unreadBadgeFab} />}
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
                {conversations.map(conv => (
                  <div 
                    key={conv.contact.id}
                    onClick={() => setSelectedContact(conv.contact)}
                    className={`${styles.contactItem} ${selectedContact?.id === conv.contact.id ? styles.contactItemActive : styles.contactItemInactive}`}
                  >
                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                      <div className={`${styles.contactName} ${selectedContact?.id === conv.contact.id ? styles.contactNameActive : styles.contactNameInactive}`}>
                        {conv.contact.firstName} {conv.contact.lastName}
                      </div>
                      {conv.unreadCount > 0 && <div className={styles.unreadBadgeContact} />}
                    </div>
                    <div className={styles.contactRole}>{getRoleLabel(conv.contact.role)}</div>
                  </div>
                ))}
                {conversations.length === 0 && (
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
