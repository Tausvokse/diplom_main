import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { Wallet, CreditCard, PiggyBank, History, Check, AlertCircle } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useTheme } from '../../components/ThemeProvider';

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
  const { theme } = useTheme();
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

  const baseColor = theme === 'dark' ? '#1f2937' : '#e5e7eb';
  const highlightColor = theme === 'dark' ? '#374151' : '#f3f4f6';

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <Skeleton height={28} width={160} baseColor={baseColor} highlightColor={highlightColor} />
        <Skeleton height={36} baseColor={baseColor} highlightColor={highlightColor} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Skeleton height={200} baseColor={baseColor} highlightColor={highlightColor} />
          <Skeleton height={200} baseColor={baseColor} highlightColor={highlightColor} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <h1 className="text-2xl font-semibold text-[rgb(var(--text))] mb-6">Фінанси</h1>

      <div className="flex flex-wrap border-b border-[rgb(var(--border))] mb-6">
        <button
          className={`ui-tab flex items-center border-b-2 border-transparent transition-colors ${activeTab === 'payments' ? 'ui-tab-active' : 'hover:text-[rgb(var(--text))]'}`}
          onClick={() => setActiveTab('payments')}
        >
          <CreditCard className="w-4 h-4 mr-2" /> Оплата проживання
        </button>
        <button
          className={`ui-tab flex items-center border-b-2 border-transparent transition-colors ${activeTab === 'jars' ? 'ui-tab-active' : 'hover:text-[rgb(var(--text))]'}`}
          onClick={() => setActiveTab('jars')}
        >
          <PiggyBank className="w-4 h-4 mr-2" /> Банки (Збори)
        </button>
      </div>

      {activeTab === 'payments' && (
        <div className="ui-card p-5 md:p-6 transition-colors">
          <h2 className="text-lg font-semibold text-[rgb(var(--text))] mb-4">Мої рахунки</h2>
          {payments.length === 0 ? (
            <p className="ui-muted text-sm">Немає виставлених рахунків.</p>
          ) : (
            <div className="space-y-4">
              {payments.map(p => (
                <div key={p.id} className={`p-4 border rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${p.status === 'OVERDUE' ? 'border-red-300 bg-red-50 dark:border-red-800/60 dark:bg-red-900/20' : p.status === 'PAID' ? 'border-green-300 bg-green-50 dark:border-green-800/60 dark:bg-green-900/20' : 'border-[rgb(var(--border))] bg-[rgb(var(--surface))]'}`}>
                  <div>
                    <h3 className="font-medium text-[rgb(var(--text))]">{p.description}</h3>
                    <p className="text-sm ui-muted mt-1">До оплати: <span className="font-semibold text-[rgb(var(--text))]">{p.amount} грн</span></p>
                    <p className="text-xs ui-muted mt-1">Термін: {new Date(p.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    {p.status === 'PAID' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        <Check className="w-4 h-4 mr-1"/> Оплачено
                      </span>
                    ) : (
                      <div className="flex flex-col items-end gap-2">
                        {p.status === 'OVERDUE' && (
                          <span className="inline-flex items-center text-xs font-medium text-red-600 dark:text-red-400">
                            <AlertCircle className="w-3 h-3 mr-1"/> Протерміновано
                          </span>
                        )}
                        <button 
                          onClick={() => handlePay(p.id)}
                          className="ui-button ui-button-primary px-4"
                        >
                          Сплатити {p.amount} грн
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
        <div className="grid grid-cols-1 gap-4 md:gap-6">
          {jars.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">Активних зборів немає.</p>
          ) : jars.map(jar => {
            const percent = Math.min(100, Math.round((jar.currentAmount / jar.goalAmount) * 100));
            return (
              <div key={jar.id} className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center"><PiggyBank className="w-5 h-5 mr-2 text-pink-500 dark:text-pink-400"/> {jar.title}</h3>
                    {jar.description && <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{jar.description}</p>}
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{jar.currentAmount}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm"> / {jar.goalAmount} ₴</span>
                  </div>
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-6">
                  <div className="h-3 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 dark:from-pink-500/80 dark:to-orange-400/80" style={{ width: `${percent}%` }}></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {/* Donate Form */}
                  <div className="bg-gray-50 dark:bg-gray-700/60 p-4 rounded-lg border border-gray-100 dark:border-gray-600/60">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center"><Wallet className="w-4 h-4 mr-2"/> Зробити внесок</h4>
                    <div className="space-y-3">
                      <div>
                        <input type="number" placeholder="Сума (₴)" className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm p-2 border" value={donateAmount[jar.id] || ''} onChange={e => setDonateAmount(prev => ({...prev, [jar.id]: e.target.value}))} />
                      </div>
                      <div>
                        <input type="text" placeholder="Ваше побажання (необов'язково)" className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm p-2 border" value={donateComment[jar.id] || ''} onChange={e => setDonateComment(prev => ({...prev, [jar.id]: e.target.value}))} />
                      </div>
                      <button onClick={() => handleDonate(jar.id)} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 dark:bg-pink-500 dark:hover:bg-pink-400 transition-colors">
                        Поповнити банку
                      </button>
                    </div>
                  </div>

                  {/* Top Donors */}
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center"><History className="w-4 h-4 mr-2"/> Останні внески</h4>
                    {jar.transactions.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">Ще немає внесків. Будьте першим!</p> : (
                      <ul className="space-y-3">
                        {jar.transactions.map(t => (
                          <li key={t.id} className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                            <div>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{t.student.fullName}</span>
                              {t.comment && <p className="text-gray-500 dark:text-gray-400 italic mt-0.5">"{t.comment}"</p>}
                            </div>
                            <span className="font-bold text-pink-600 dark:text-pink-400">+{t.amount} ₴</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentFinancials;