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
        className="fixed bottom-6 right-6 ui-button ui-button-primary rounded-full p-4 shadow-lg hover:scale-105 z-40"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end items-end p-6 pointer-events-none">
          <div className="bg-[rgb(var(--surface))] w-full max-w-sm md:max-w-md h-[70vh] sm:h-[600px] rounded-2xl shadow-2xl border border-[rgb(var(--border))] flex flex-col pointer-events-auto overflow-hidden animate-slideUp transition-colors">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-[rgb(var(--accent))] to-[rgb(var(--accent-strong))] text-white px-4 py-3 flex justify-between items-center transition-colors">
              <h3 className="font-semibold flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" /> 
                {user?.role === 'STUDENT' ? 'Зв\'язок з Адміністрацією' : 'Повідомлення від студентів'}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar (Contacts) */}
              <div className={`w-1/3 bg-[rgb(var(--surface-2))] border-r border-[rgb(var(--border))] overflow-y-auto ${selectedContact ? 'hidden md:block' : 'block w-full'}`}>
                {contacts.map(contact => (
                  <div 
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`p-3 cursor-pointer border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-3))] transition-colors ${selectedContact?.id === contact.id ? 'bg-[rgb(var(--accent-soft))] border-[rgb(var(--accent))]' : ''}`}
                  >
                    <div className="font-semibold text-sm text-[rgb(var(--text))] truncate">{contact.firstName} {contact.lastName}</div>
                    <div className="text-xs text-[rgb(var(--muted))] mt-1">{getRoleLabel(contact.role)}</div>
                  </div>
                ))}
                {contacts.length === 0 && (
                  <div className="p-4 text-center text-xs text-[rgb(var(--muted))]">Немає контактів</div>
                )}
              </div>

              {/* Chat Area */}
              <div className={`flex-1 flex flex-col bg-[rgb(var(--surface-2))] ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
                {selectedContact ? (
                  <>
                    <div className="bg-[rgb(var(--surface))] border-b border-[rgb(var(--border))] px-4 py-2 flex items-center md:hidden">
                      <button onClick={() => setSelectedContact(null)} className="text-[rgb(var(--accent))] text-sm font-semibold mr-2">Назад</button>
                      <div className="font-semibold text-sm truncate text-[rgb(var(--text))]">{selectedContact.firstName}</div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {filteredMessages.map(msg => {
                        const isMine = msg.senderId === user?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-xl ${isMine ? 'bg-[rgb(var(--accent))] text-white rounded-br-none' : 'bg-[rgb(var(--surface))] border border-[rgb(var(--border))] text-[rgb(var(--text))] rounded-bl-none shadow-sm'}`}>
                              <p className="text-sm">{msg.content}</p>
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

                    <form onSubmit={handleSendMessage} className="p-3 bg-[rgb(var(--surface))] border-t border-[rgb(var(--border))] flex items-center">
                      <input 
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Напишіть повідомлення..."
                        className="flex-1 ui-input text-sm"
                      />
                      <button 
                        type="submit"
                        disabled={isLoading || !newMessage.trim()}
                        className="ml-2 ui-button ui-button-primary rounded-full px-3 py-2 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
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
