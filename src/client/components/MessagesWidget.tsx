import React, { useState, useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
      fetchMessages();
      
      const interval = setInterval(fetchMessages, 10000); // Polling every 10s
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, selectedContact]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchContacts = async () => {
    try {
      const endpoint = user?.role === 'STUDENT' ? '/messages/admins' : '/messages/students';
      const res = await api.get(endpoint);
      setContacts(res.data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get('/messages');
      setMessages(res.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

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

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-105 z-40"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end items-end p-6 pointer-events-none">
          <div className="bg-white w-full max-w-sm md:max-w-md h-[600px] rounded-2xl shadow-2xl border border-gray-200 flex flex-col pointer-events-auto overflow-hidden animate-slideUp">
            
            {/* Header */}
            <div className="bg-blue-600 text-white px-4 py-3 flex justify-between items-center">
              <h3 className="font-semibold flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" /> 
                {user?.role === 'STUDENT' ? 'Зв\'язок з Адміністрацією' : 'Повідомлення від студентів'}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-blue-100 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar (Contacts) */}
              <div className={`w-1/3 bg-gray-50 border-r border-gray-200 overflow-y-auto ${selectedContact ? 'hidden md:block' : 'block w-full'}`}>
                {contacts.map(contact => (
                  <div 
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`p-3 cursor-pointer border-b border-gray-100 hover:bg-gray-100 transition-colors ${selectedContact?.id === contact.id ? 'bg-blue-50 border-blue-200' : ''}`}
                  >
                    <div className="font-medium text-sm text-gray-900 truncate">{contact.firstName} {contact.lastName}</div>
                    <div className="text-xs text-gray-500 mt-1">{getRoleLabel(contact.role)}</div>
                  </div>
                ))}
                {contacts.length === 0 && (
                  <div className="p-4 text-center text-xs text-gray-500">Немає контактів</div>
                )}
              </div>

              {/* Chat Area */}
              <div className={`flex-1 flex flex-col bg-gray-50 ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
                {selectedContact ? (
                  <>
                    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center md:hidden">
                      <button onClick={() => setSelectedContact(null)} className="text-blue-600 text-sm font-medium mr-2">Назад</button>
                      <div className="font-semibold text-sm truncate">{selectedContact.firstName}</div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {filteredMessages.map(msg => {
                        const isMine = msg.senderId === user?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl ${isMine ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                              <p className="text-sm">{msg.content}</p>
                              <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      {filteredMessages.length === 0 && (
                        <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                          Немає повідомлень
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex items-center">
                      <input 
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Напишіть повідомлення..."
                        className="flex-1 px-4 py-2 bg-gray-100 border-transparent rounded-full focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
                      />
                      <button 
                        type="submit"
                        disabled={isLoading || !newMessage.trim()}
                        className="ml-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-6 text-center">
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
