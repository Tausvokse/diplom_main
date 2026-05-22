import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Send, UserCircle, Check, CheckCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <Skeleton height={28} width={240} />
        <Skeleton height={360} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-80px)]">
      <div className="ui-card h-full flex flex-col md:flex-row overflow-hidden p-2">
        {/* Sidebar */}
        <div className={`w-full md:w-1/3 flex flex-col bg-[rgb(var(--surface-2))] nm-inset-sm rounded-3xl m-1 ${activeContact ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 border-b border-[rgb(var(--border)/0.2)]">
            <h2 className="text-xl font-bold text-[rgb(var(--text))]">Повідомлення</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-[rgb(var(--muted))] font-medium text-sm">Немає повідомлень</div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.contact.id}
                  onClick={() => setActiveContact(conv.contact)}
                  className={`w-full text-left p-4 mb-2 rounded-2xl transition-all flex items-start ${
                    activeContact?.id === conv.contact.id ? 'nm-flat bg-[rgb(var(--surface))]' : 'hover:bg-[rgb(var(--surface))] hover:nm-raised-sm'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl nm-inset-sm bg-[rgb(var(--surface-2))] flex items-center justify-center">
                      <UserCircle className="w-7 h-7 text-[rgb(var(--muted))]" />
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-[rgb(var(--surface))] shadow-[0_2px_10px_rgba(239,68,68,0.4)]">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="ml-4 flex-1 min-w-0 pt-1">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-black text-[rgb(var(--text))]' : 'font-bold text-[rgb(var(--text))]'}`} title={`${conv.contact.lastName} ${conv.contact.firstName}`}>
                        {conv.contact.lastName} {conv.contact.firstName}
                      </h3>
                      <span className="text-[10px] font-bold text-[rgb(var(--muted))] flex-shrink-0 ml-2">
                        {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className={`text-xs truncate mr-2 ${conv.unreadCount > 0 ? 'font-bold text-[rgb(var(--text))]' : 'font-medium ui-muted'}`}>
                        {conv.lastMessage.senderId === user?.id ? 'Ви: ' : ''}{conv.lastMessage.content}
                      </p>
                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-[rgb(var(--surface-2))] nm-inset text-[rgb(var(--muted))] whitespace-nowrap flex-shrink-0">
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
        <div className={`w-full md:w-2/3 flex flex-col bg-[rgb(var(--surface))] nm-flat rounded-3xl m-1 ${activeContact ? 'flex' : 'hidden md:flex'}`}>
          {activeContact ? (
            <>
              {/* Header */}
              <div className="p-5 border-b border-[rgb(var(--border)/0.2)] flex items-center bg-[rgb(var(--surface-2))] nm-inset-sm rounded-t-3xl">
                <button onClick={() => setActiveContact(null)} className="md:hidden w-10 h-10 nm-flat rounded-full flex items-center justify-center text-[rgb(var(--accent))] mr-3">
                  <span className="sr-only">Назад</span>
                  &larr;
                </button>
                <div className="w-12 h-12 rounded-xl nm-raised flex items-center justify-center mr-4 bg-[rgb(var(--surface))]">
                  <UserCircle className="w-7 h-7 text-[rgb(var(--muted))]" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[rgb(var(--text))]">{activeContact.firstName} {activeContact.lastName}</h3>
                  <p className="text-xs font-bold uppercase tracking-wider ui-muted">{getRoleLabel(activeContact.role)}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[rgb(var(--surface))]">
                {messages.map((msg, idx) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-5 py-3 ${
                        isMe ? 'bg-[rgb(var(--accent))] text-[rgb(var(--surface))] nm-raised-sm rounded-br-sm' : 'bg-[rgb(var(--surface-2))] nm-inset-sm text-[rgb(var(--text))] rounded-bl-sm'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap font-medium">{msg.content}</p>
                        <div className={`flex items-center justify-end mt-2 ${isMe ? 'text-[rgb(var(--surface))/0.8]' : 'text-[rgb(var(--muted))]'}`}>
                          <span className="text-[10px] font-bold mr-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                            msg.isRead ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-5 border-t border-[rgb(var(--border)/0.2)] bg-[rgb(var(--surface-2))] nm-inset-sm rounded-b-3xl">
                <form onSubmit={handleSendMessage} className="flex space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Напишіть повідомлення..."
                    className="flex-1 ui-input rounded-2xl bg-[rgb(var(--surface))]"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="w-14 h-14 rounded-2xl bg-[rgb(var(--accent))] text-[rgb(var(--surface))] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-[0_4px_14px_rgba(var(--accent),0.4)] disabled:opacity-50 disabled:shadow-none"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[rgb(var(--muted))]">
              <div className="w-24 h-24 rounded-full nm-inset-sm bg-[rgb(var(--surface-2))] flex items-center justify-center mb-6">
                <UserCircle className="w-12 h-12 opacity-50" />
              </div>
              <p className="font-bold tracking-wide">Оберіть чат для перегляду повідомлень</p>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgb(var(--border)); border-radius: 4px; }
      `}</style>
    </div>
  );
};

export default AdminMessagesPage;
