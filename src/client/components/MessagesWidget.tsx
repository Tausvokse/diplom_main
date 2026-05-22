import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

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

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

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

  const filteredMessages = messages.filter(
    m => (m.senderId === selectedContact?.id && m.receiverId === user?.id) || 
         (m.senderId === user?.id && m.receiverId === selectedContact?.id)
  );

  if (user?.role !== 'STUDENT') {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[rgb(var(--accent))] text-white rounded-full flex items-center justify-center nm-raised transition-transform hover:scale-105 z-40"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end items-end p-6 pointer-events-none">
          <div className="bg-[rgb(var(--surface))] w-full max-w-sm md:max-w-md h-[70vh] sm:h-[600px] nm-modal-content flex flex-col pointer-events-auto overflow-hidden animate-slideUp">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-[rgb(var(--accent))] to-[rgb(var(--accent-strong))] text-white px-4 py-3 flex justify-between items-center transition-colors shadow-sm z-10">
              <h3 className="font-semibold flex items-center text-[15px]">
                <MessageCircle className="w-4 h-4 mr-2" /> 
                {user?.role === 'STUDENT' ? 'Зв\'язок з Адміністрацією' : 'Повідомлення від студентів'}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden bg-[rgb(var(--surface-2))]">
              {/* Sidebar (Contacts) */}
              <div className={`w-1/3 bg-[rgb(var(--surface))] overflow-y-auto ${selectedContact ? 'hidden md:block' : 'block w-full'}`} style={{ boxShadow: 'var(--nm-raised-sm)' }}>
                {contacts.map(contact => (
                  <div 
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`p-3 cursor-pointer transition-colors ${selectedContact?.id === contact.id ? 'nm-inset-sm bg-[rgb(var(--surface))]' : 'hover:bg-[rgb(var(--surface-2))] border-b border-[rgb(var(--border)/0.2)]'}`}
                  >
                    <div className={`font-semibold text-sm truncate ${selectedContact?.id === contact.id ? 'text-[rgb(var(--accent))]' : 'text-[rgb(var(--text))]'}`}>
                      {contact.firstName} {contact.lastName}
                    </div>
                    <div className="text-[11px] text-[rgb(var(--muted))] mt-1">{getRoleLabel(contact.role)}</div>
                  </div>
                ))}
                {contacts.length === 0 && (
                  <div className="p-4 text-center text-xs text-[rgb(var(--muted))]">Немає контактів</div>
                )}
              </div>

              {/* Chat Area */}
              <div className={`flex-1 flex flex-col nm-inset ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
                {selectedContact ? (
                  <>
                    <div className="bg-[rgb(var(--surface))] nm-raised-xs px-4 py-3 flex items-center md:hidden z-10">
                      <button onClick={() => setSelectedContact(null)} className="text-[rgb(var(--accent))] text-sm font-semibold mr-2">Назад</button>
                      <div className="font-semibold text-sm truncate text-[rgb(var(--text))]">{selectedContact.firstName}</div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {filteredMessages.map(msg => {
                        const isMine = msg.senderId === user?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-4 py-2 text-sm nm-raised-xs ${isMine ? 'bg-[rgb(var(--accent))] text-white rounded-2xl rounded-br-sm' : 'bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-2xl rounded-bl-sm'}`}>
                              <p className="leading-relaxed">{msg.content}</p>
                              <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-white/70' : 'text-[rgb(var(--muted))]'}`}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      {filteredMessages.length === 0 && (
                        <div className="h-full flex items-center justify-center text-[rgb(var(--muted))] text-sm">
                          Немає повідомлень
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-3 bg-[rgb(var(--surface-2))] nm-inset-sm flex items-center mx-2 mb-2 rounded-2xl">
                      <input 
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Напишіть повідомлення..."
                        className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-[rgb(var(--text))] placeholder-[rgb(var(--muted)/0.6)]"
                      />
                      <button 
                        type="submit"
                        disabled={isLoading || !newMessage.trim()}
                        className="ml-2 w-8 h-8 flex items-center justify-center bg-[rgb(var(--accent))] text-white rounded-full nm-raised-sm disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-[rgb(var(--muted))] text-sm p-6 text-center">
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
