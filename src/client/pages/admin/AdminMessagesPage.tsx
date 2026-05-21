import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Send, UserCircle, Check, CheckCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useTheme } from '../../components/ThemeProvider';

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
  const { theme } = useTheme();
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

  const baseColor = theme === 'dark' ? '#1f2937' : '#e5e7eb';
  const highlightColor = theme === 'dark' ? '#374151' : '#f3f4f6';

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <Skeleton height={28} width={240} baseColor={baseColor} highlightColor={highlightColor} />
        <Skeleton height={360} baseColor={baseColor} highlightColor={highlightColor} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-80px)]">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 h-full flex flex-col md:flex-row overflow-hidden transition-colors">
        {/* Sidebar */}
        <div className={`w-full md:w-1/3 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-gray-900 ${activeContact ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Повідомлення</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Немає повідомлень</div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.contact.id}
                  onClick={() => setActiveContact(conv.contact)}
                  className={`w-full text-left p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-start ${
                    activeContact?.id === conv.contact.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : ''
                  }`}
                >
                  <div className="relative">
                    <UserCircle className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`} title={`${conv.contact.lastName} ${conv.contact.firstName}`}>
                        {conv.contact.lastName} {conv.contact.firstName}
                      </h3>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
                        {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className={`text-xs truncate mr-2 ${conv.unreadCount > 0 ? 'font-medium text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                        {conv.lastMessage.senderId === user?.id ? 'Ви: ' : ''}{conv.lastMessage.content}
                      </p>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 whitespace-nowrap">
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
        <div className={`w-full md:w-2/3 flex flex-col bg-white dark:bg-gray-900 ${activeContact ? 'flex' : 'hidden md:flex'}`}>
          {activeContact ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center bg-white dark:bg-gray-900">
                <button onClick={() => setActiveContact(null)} className="md:hidden text-blue-600 dark:text-blue-400 text-sm font-medium mr-3">Назад</button>
                <UserCircle className="w-8 h-8 text-gray-400 dark:text-gray-500 mr-3" />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{activeContact.firstName} {activeContact.lastName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{activeContact.email}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
                {messages.map((msg, idx) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-xl px-4 py-2 ${
                        isMe ? 'bg-blue-600 dark:bg-blue-500/80 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none shadow-sm'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center justify-end mt-1 ${isMe ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'}`}>
                          <span className="text-[10px] mr-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                            msg.isRead ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Напишіть повідомлення..."
                    className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <UserCircle className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
              <p>Оберіть чат для перегляду повідомлень</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMessagesPage;
