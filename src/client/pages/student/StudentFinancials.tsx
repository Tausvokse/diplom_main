import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { Wallet, CreditCard, PiggyBank, History, Check, AlertCircle, ArrowRight, Clock } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface JarTransaction {
  id: string;
  amount: number;
  comment: string;
  student: { fullName: string };
  createdAt: string;
}

interface Jar {
  id: string;
  title: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  transactions: JarTransaction[];
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
  description: string;
}

const StudentFinancials: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'payments' | 'jars'>('payments');
  const [jars, setJars] = useState<Jar[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  const [donateAmount, setDonateAmount] = useState<Record<string, string>>({});
  const [donateComment, setDonateComment] = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [jarsRes, payRes] = await Promise.all([
        api.get('/student/jars'),
        api.get('/student/payments')
      ]);
      setJars(jarsRes.data);
      setPayments(payRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDonate = async (jarId: string) => {
    const amount = Number(donateAmount[jarId]);
    if (!amount || amount <= 0) {
      toast.error('Введіть коректну суму');
      return;
    }
    try {
      await api.post('/student/jars/donate', {
        jarId,
        amount,
        comment: donateComment[jarId]
      });
      toast.success('Дякуємо за донат!');
      setDonateAmount(prev => ({...prev, [jarId]: ''}));
      setDonateComment(prev => ({...prev, [jarId]: ''}));
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handlePay = async (paymentId: string) => {
    try {
      await api.post(`/student/payments/${paymentId}/pay`);
      toast.success('Оплата пройшла успішно');
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8">
        <Skeleton height={40} width={200} borderRadius={12} />
        <Skeleton height={60} borderRadius={16} />
        <div className="grid grid-cols-1 gap-6">
          <Skeleton height={200} borderRadius={24} />
          <Skeleton height={200} borderRadius={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <h1 className="text-3xl font-bold text-[rgb(var(--text))] mb-8 tracking-tight">Фінанси</h1>

      <div className="flex bg-[rgb(var(--surface-2))] p-1.5 rounded-2xl nm-inset-sm mb-8 overflow-x-auto hide-scrollbar">
        <button
          className={`flex-1 flex justify-center items-center py-3 px-6 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'payments' ? 'nm-raised bg-[rgb(var(--surface))] text-[rgb(var(--accent))]' : 'text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] hover:nm-flat'}`}
          onClick={() => setActiveTab('payments')}
        >
          <CreditCard className="w-4 h-4 mr-2" /> Оплата проживання
        </button>
        <button
          className={`flex-1 flex justify-center items-center py-3 px-6 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'jars' ? 'nm-raised bg-[rgb(var(--surface))] text-[rgb(var(--accent))]' : 'text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] hover:nm-flat'}`}
          onClick={() => setActiveTab('jars')}
        >
          <PiggyBank className="w-4 h-4 mr-2" /> Банки (Збори)
        </button>
      </div>

      {activeTab === 'payments' && (
        <div className="ui-card p-6 md:p-8">
          <div className="flex items-center mb-8">
            <div className="w-10 h-10 rounded-xl nm-raised flex items-center justify-center mr-4 bg-[rgb(var(--surface))]">
              <CreditCard className="w-5 h-5 text-[rgb(var(--accent))]" />
            </div>
            <h2 className="text-xl font-bold text-[rgb(var(--text))]">Мої рахунки</h2>
          </div>
          
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-[rgb(var(--surface-2))] nm-inset-sm rounded-3xl">
              <Check className="w-16 h-16 text-[rgb(var(--accent))] opacity-40 mb-4" />
              <h3 className="text-lg font-semibold text-[rgb(var(--text))] mb-2">Усе сплачено</h3>
              <p className="ui-muted text-sm font-medium">Немає виставлених рахунків.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {payments.map(p => (
                <div key={p.id} className={`p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 transition-all duration-300 ${
                  p.status === 'OVERDUE' ? 'nm-inset-sm bg-red-50/20 dark:bg-red-900/10 border-l-4 border-red-500' : 
                  p.status === 'PAID' ? 'nm-flat bg-[rgb(var(--surface))] border border-green-500/30' : 
                  'nm-flat bg-[rgb(var(--surface))] hover:nm-raised-sm'
                }`}>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-[rgb(var(--text))] mb-2">{p.description}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="font-bold text-[rgb(var(--accent))] text-xl">{p.amount} ₴</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--muted)/0.5)]"></span>
                      <span className="ui-muted font-medium flex items-center">
                        <Clock className="w-4 h-4 mr-1.5" /> Термін: {new Date(p.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    {p.status === 'PAID' ? (
                      <div className="inline-flex items-center justify-center h-12 px-6 rounded-xl font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50">
                        <Check className="w-5 h-5 mr-2"/> ОПЛАЧЕНО
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                        {p.status === 'OVERDUE' && (
                          <span className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full">
                            <AlertCircle className="w-3.5 h-3.5 mr-1.5"/> ПРОТЕРМІНОВАНО
                          </span>
                        )}
                        <button 
                          onClick={() => handlePay(p.id)}
                          className={`w-full sm:w-auto h-12 px-8 rounded-xl font-bold tracking-wide transition-all ${
                            p.status === 'OVERDUE' ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_4px_14px_0_rgba(239,68,68,0.39)]' : 'ui-button-primary nm-raised text-white hover:nm-raised-sm'
                          }`}
                        >
                          СПЛАТИТИ
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'jars' && (
        <div className="grid grid-cols-1 gap-6 md:gap-8">
          {jars.length === 0 ? (
            <div className="ui-card p-12 text-center flex flex-col items-center">
              <PiggyBank className="w-16 h-16 text-[rgb(var(--muted))] opacity-30 mb-4" />
              <p className="text-[rgb(var(--text))] font-medium">Активних зборів немає.</p>
            </div>
          ) : jars.map(jar => {
            const percent = Math.min(100, Math.round((jar.currentAmount / jar.goalAmount) * 100));
            return (
              <div key={jar.id} className="ui-card p-6 md:p-8 overflow-hidden relative">
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 mb-8 relative z-10">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <div className="w-12 h-12 rounded-2xl nm-raised flex items-center justify-center mr-4 bg-[rgb(var(--surface))]">
                        <PiggyBank className="w-6 h-6 text-pink-500" />
                      </div>
                      <h3 className="text-2xl font-bold text-[rgb(var(--text))] tracking-tight">{jar.title}</h3>
                    </div>
                    {jar.description && <p className="ui-muted text-sm mt-4 ml-16 leading-relaxed max-w-2xl">{jar.description}</p>}
                  </div>
                  
                  <div className="lg:text-right bg-[rgb(var(--surface-2))] nm-inset-sm p-4 rounded-2xl min-w-[200px]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--muted))] mb-1">Зібрано коштів</p>
                    <div className="flex items-baseline lg:justify-end">
                      <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-400">{jar.currentAmount}</span>
                      <span className="text-[rgb(var(--muted))] font-medium ml-2">/ {jar.goalAmount} ₴</span>
                    </div>
                  </div>
                </div>

                <div className="relative pt-1 w-full mb-10">
                  <div className="w-full h-4 bg-[rgb(var(--surface-2))] nm-inset rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-pink-500 to-orange-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] transition-all duration-1000 ease-out" 
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                  <div className="absolute -top-6 right-0 text-xs font-bold text-pink-500" style={{ right: `${100-percent}%`, transform: 'translateX(50%)' }}>
                    {percent}%
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                  {/* Donate Form */}
                  <div className="lg:col-span-5 bg-[rgb(var(--surface-2))] nm-inset-sm p-6 md:p-8 rounded-3xl flex flex-col justify-center">
                    <h4 className="font-bold text-lg text-[rgb(var(--text))] mb-6 flex items-center">
                      <Wallet className="w-5 h-5 mr-3 text-pink-500" /> 
                      Зробити внесок
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Сума внеску</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            placeholder="0" 
                            className="ui-input bg-[rgb(var(--surface))] w-full text-lg font-bold text-pink-500 placeholder-pink-500/30 h-14 pl-6" 
                            value={donateAmount[jar.id] || ''} 
                            onChange={e => setDonateAmount(prev => ({...prev, [jar.id]: e.target.value}))} 
                          />
                          <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-[rgb(var(--muted))]">₴</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Коментар</label>
                        <input 
                          type="text" 
                          placeholder="Ваше побажання (необов'язково)" 
                          className="ui-input bg-[rgb(var(--surface))] w-full h-12" 
                          value={donateComment[jar.id] || ''} 
                          onChange={e => setDonateComment(prev => ({...prev, [jar.id]: e.target.value}))} 
                        />
                      </div>
                      <button 
                        onClick={() => handleDonate(jar.id)} 
                        className="w-full h-14 mt-4 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-xl font-bold text-lg tracking-wide hover:opacity-90 transition-all shadow-[0_4px_20px_rgba(236,72,153,0.3)] flex items-center justify-center transform hover:-translate-y-0.5 active:translate-y-0"
                      >
                        ПОПОВНИТИ БАНКУ <ArrowRight className="w-5 h-5 ml-2" />
                      </button>
                    </div>
                  </div>

                  {/* Top Donors */}
                  <div className="lg:col-span-7 bg-[rgb(var(--surface))] nm-flat p-6 md:p-8 rounded-3xl border border-[rgb(var(--border)/0.2)]">
                    <h4 className="font-bold text-lg text-[rgb(var(--text))] mb-6 flex items-center">
                      <History className="w-5 h-5 mr-3 text-orange-400" /> 
                      Останні внески
                    </h4>
                    {jar.transactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-center bg-[rgb(var(--surface-2))] nm-inset-sm rounded-2xl">
                        <History className="w-10 h-10 text-[rgb(var(--muted))] opacity-30 mb-3" />
                        <p className="text-sm font-medium ui-muted">Ще немає внесків.<br/>Будьте першим!</p>
                      </div>
                    ) : (
                      <div className="overflow-y-auto pr-2 custom-scrollbar max-h-[320px] space-y-3">
                        {jar.transactions.map((t, idx) => (
                          <div key={t.id} className="flex justify-between items-center p-4 rounded-xl transition-all hover:bg-[rgb(var(--surface-2))]">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full nm-inset-sm flex items-center justify-center bg-[rgb(var(--surface-2))] font-bold text-pink-500 flex-shrink-0">
                                {idx + 1}
                              </div>
                              <div>
                                <span className="font-bold text-[rgb(var(--text))] block">{t.student.fullName}</span>
                                {t.comment && <p className="text-[13px] text-[rgb(var(--muted))] italic mt-1 bg-[rgb(var(--surface-2))] px-2 py-1 rounded inline-block">"{t.comment}"</p>}
                              </div>
                            </div>
                            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-400 text-lg whitespace-nowrap ml-4">
                              +{t.amount} ₴
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgb(var(--surface-2));
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgb(var(--border));
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default StudentFinancials;