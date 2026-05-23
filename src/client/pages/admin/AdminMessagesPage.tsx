import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Send, UserCircle, Check, CheckCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import styles from './AdminMessagesPage.module.css';

interface Conversation {
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  lastMessage: any;
  firstMessageAt: string;
  unreadCount: number;
}

export const AdminMessagesPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeContact, setActiveContact] = useState<Conversation['contact'] | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 30000); // 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeContact) {
      fetchMessages(activeContact.id);
      markConversationRead(activeContact.id);
      const interval = setInterval(() => fetchMessages(activeContact.id), 30000); // 30s
      return () => clearInterval(interval);
    }
  }, [activeContact]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const fetchMessages = async (contactId: string) => {
    try {
      const res = await api.get(`/messages?contactId=${contactId}`);
      setMessages(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const markConversationRead = async (contactId: string) => {
    try {
      await api.patch(`/messages/conversation/${contactId}/read-all`);
      setConversations(prev => prev.map(c => 
        c.contact.id === contactId ? { ...c, unreadCount: 0 } : c
      ));
    } catch (error) {
      console.error(error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeContact) return;

    try {
      const res = await api.post('/messages', {
        receiverId: activeContact.id,
        content: newMessage.trim(),
      });
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
      fetchConversations();
    } catch (error) {
      console.error(error);
    }
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'ADMIN_CAMPUS': return 'Директор';
      case 'ADMIN_COMMANDANT': return 'Комендант';
      case 'ADMIN': return 'Адмін';
      case 'STUDENT': return 'Студент';
      case 'MASTER_SLESAR': return 'Слюсар';
      case 'MASTER_SANTEKHNIK': return 'Сантехнік';
      case 'MASTER_ELECTRIC': return 'Електрик';
      default: return role;
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Skeleton height={28} width={240} />
        <Skeleton height={360} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={`ui-card ${styles.card}`}>
        {/* Sidebar */}
        <div className={`${styles.sidebar} ${activeContact ? styles.sidebarHidden : ''} nm-inset-sm`}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>Повідомлення</h2>
          </div>
          <div className={`${styles.sidebarList} ${styles.customScrollbar}`}>
            {conversations.length === 0 ? (
              <div className={styles.emptyContacts}>Немає повідомлень</div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.contact.id}
                  onClick={() => setActiveContact(conv.contact)}
                  className={`${styles.contactButton} ${
                    activeContact?.id === conv.contact.id ? `nm-flat ${styles.contactButtonActive}` : `hover:nm-raised-sm ${styles.contactButtonInactive}`
                  }`}
                >
                  <div className={styles.avatarWrapper}>
                    <div className={`nm-inset-sm ${styles.avatar}`}>
                      <UserCircle className={styles.avatarIcon} />
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className={styles.unreadBadge}>
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className={styles.contactInfo}>
                    <div className={styles.contactNameRow}>
                      <h3 className={`${styles.contactName} ${conv.unreadCount > 0 ? styles.contactNameUnread : styles.contactNameRead}`} title={`${conv.contact.lastName} ${conv.contact.firstName}`}>
                        {conv.contact.lastName} {conv.contact.firstName}
                      </h3>
                      <span className={styles.contactTime}>
                        {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={styles.contactMsgRow}>
                      <p className={`${styles.contactMsg} ${conv.unreadCount > 0 ? styles.contactMsgUnread : `ui-muted ${styles.contactMsgRead}`}`}>
                        {conv.lastMessage.senderId === user?.id ? 'Ви: ' : ''}{conv.lastMessage.content}
                      </p>
                      <span className={`nm-inset ${styles.roleBadge}`}>
                        {getRoleLabel(conv.contact.role)}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`nm-flat ${styles.chatArea} ${activeContact ? '' : styles.chatAreaHidden}`}>
          {activeContact ? (
            <>
              {/* Header */}
              <div className={`nm-inset-sm ${styles.chatHeader}`}>
                <button onClick={() => setActiveContact(null)} className={`nm-flat ${styles.backButton}`}>
                  <span className="sr-only">Назад</span>
                  &larr;
                </button>
                <div className={`nm-raised ${styles.chatHeaderAvatar}`}>
                  <UserCircle className={styles.avatarIcon} />
                </div>
                <div>
                  <h3 className={styles.chatHeaderName}>{activeContact.firstName} {activeContact.lastName}</h3>
                  <p className={`ui-muted ${styles.chatHeaderRole}`}>{getRoleLabel(activeContact.role)}</p>
                </div>
              </div>

              {/* Messages */}
              <div className={`${styles.chatMessages} ${styles.customScrollbar}`}>
                {messages.map((msg, idx) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id || idx} className={`${styles.msgRow} ${isMe ? styles.msgMe : styles.msgOther}`}>
                      <div className={`${styles.msgBubble} ${
                        isMe ? `nm-raised-sm ${styles.msgBubbleMe}` : `nm-inset-sm ${styles.msgBubbleOther}`
                      }`}>
                        <p className={styles.msgContent}>{msg.content}</p>
                        <div className={`${styles.msgFooter} ${isMe ? styles.msgFooterMe : styles.msgFooterOther}`}>
                          <span className={styles.msgTime}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                            msg.isRead ? <CheckCheck className={styles.msgIcon} /> : <Check className={styles.msgIcon} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className={`nm-inset-sm ${styles.inputArea}`}>
                <form onSubmit={handleSendMessage} className={styles.inputForm}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Напишіть повідомлення..."
                    className={`ui-input ${styles.msgInput}`}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className={styles.sendButton}
                  >
                    <Send className={styles.sendIcon} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className={styles.emptyChat}>
              <div className={`nm-inset-sm ${styles.emptyChatAvatar}`}>
                <UserCircle className={styles.emptyChatIcon} />
              </div>
              <p className={styles.emptyChatText}>Оберіть чат для перегляду повідомлень</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMessagesPage;
