import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import api from '../services/api';
import { useAppSelector } from '../hooks/redux';

interface ChatMessage {
  id: string;
  message: string;
  reply: string | null;
  createdAt: string;
}

export const SupportWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const { user } = useAppSelector((state) => state.auth);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load email from localStorage if not logged in
  useEffect(() => {
    if (!user) {
      const savedEmail = localStorage.getItem('support_email');
      if (savedEmail) setEmail(savedEmail);
    }
  }, [user]);

  // Fetch chat history
  const fetchHistory = async () => {
    try {
      const userEmail = user?.email || email;
      if (!user && !userEmail) return;

      const res = await api.get(`/support/my${!user && userEmail ? `?email=${userEmail}` : ''}`);
      setChatHistory(res.data);
      scrollToBottom();
    } catch (error) {
      console.error('Failed to fetch chat history', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, user, email]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus('loading');
    const userEmail = user?.email || email || 'emelnasr@gmail.com';
    
    try {
      if (!user && email) {
        localStorage.setItem('support_email', email);
      }

      await api.post('/support', {
        name: user?.name || name || 'زائر',
        email: userEmail,
        message
      });
      
      setMessage('');
      setStatus('idle');
      await fetchHistory();
    } catch (error) {
      console.error(error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[340px] sm:w-[400px] h-[500px] flex flex-col glass-card rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300 rtl">
          
          {/* Header */}
          <div className="bg-theme-neonPurple text-white p-4 flex justify-between items-center shrink-0 shadow-md z-10">
            <div>
              <h3 className="font-bold text-sm">محادثة الدعم الفني</h3>
              <p className="text-[10px] opacity-80">راسلنا على: emelnasr@gmail.com</p>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Chat History Area */}
          <div className="flex-1 bg-slate-50 dark:bg-slate-900/90 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4" ref={chatContainerRef}>
            {chatHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                <MessageCircle className="w-12 h-12 mb-2 text-slate-400" />
                <p className="text-xs text-slate-500">لا توجد رسائل سابقة. كيف يمكننا مساعدتك؟</p>
              </div>
            ) : (
              chatHistory.map((chat) => (
                <div key={chat.id} className="flex flex-col gap-2 text-sm">
                  {/* User Message Bubble */}
                  <div className="self-end bg-theme-neonPurple text-white px-4 py-2 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
                    <p className="whitespace-pre-wrap">{chat.message}</p>
                    <span className="text-[9px] opacity-70 block mt-1 text-left">
                      {new Date(chat.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Admin Reply Bubble */}
                  {chat.reply && (
                    <div className="self-start bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-2xl rounded-tl-sm max-w-[85%] shadow-sm">
                      <p className="whitespace-pre-wrap">{chat.reply}</p>
                      <span className="text-[9px] opacity-50 block mt-1">الدعم الفني</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/5 shrink-0">
            <form onSubmit={handleSubmit} className="flex flex-col gap-2 text-sm">
              {!user && chatHistory.length === 0 && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="الاسم (اختياري)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonPurple transition-all text-xs"
                  />
                  <input
                    type="email"
                    placeholder="الإيميل *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonPurple transition-all text-xs"
                  />
                </div>
              )}
              
              <div className="flex items-end gap-2">
                <textarea
                  placeholder="اكتب رسالتك هنا..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  required
                  rows={1}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-theme-neonPurple transition-all resize-none max-h-24 min-h-[44px] custom-scrollbar"
                />
                <button
                  type="submit"
                  disabled={status === 'loading' || !message.trim()}
                  className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-theme-neonPurple text-white font-bold hover:bg-theme-neonPurple/90 transition-all shadow-glow-purple disabled:opacity-50"
                >
                  <Send className="w-5 h-5 rtl:-scale-x-100" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-theme-neonPurple text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:scale-110 transition-transform duration-300"
        title="تواصل مع الدعم"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
};
