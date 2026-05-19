import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { Wallet, CreditCard, PiggyBank, History, Check, AlertCircle } from 'lucide-react';

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

  if (isLoading) return <div className="p-8 text-center text-gray-500">Завантаження...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Фінанси</h1>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`pb-4 px-4 font-medium text-sm border-b-2 flex items-center ${activeTab === 'payments' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('payments')}
        >
          <CreditCard className="w-4 h-4 mr-2" /> Оплата проживання
        </button>
        <button
          className={`pb-4 px-4 font-medium text-sm border-b-2 flex items-center ${activeTab === 'jars' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('jars')}
        >
          <PiggyBank className="w-4 h-4 mr-2" /> Банки (Збори)
        </button>
      </div>

      {activeTab === 'payments' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Мої рахунки</h2>
          {payments.length === 0 ? (
            <p className="text-gray-500 text-sm">Немає виставлених рахунків.</p>
          ) : (
            <div className="space-y-4">
              {payments.map(p => (
                <div key={p.id} className={`p-4 border rounded-md flex justify-between items-center ${p.status === 'OVERDUE' ? 'border-red-300 bg-red-50' : p.status === 'PAID' ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                  <div>
                    <h3 className="font-medium text-gray-900">{p.description}</h3>
                    <p className="text-sm text-gray-500 mt-1">До оплати: <span className="font-semibold text-gray-900">{p.amount} грн</span></p>
                    <p className="text-xs text-gray-400 mt-1">Термін: {new Date(p.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    {p.status === 'PAID' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <Check className="w-4 h-4 mr-1"/> Оплачено
                      </span>
                    ) : (
                      <div className="flex flex-col items-end gap-2">
                        {p.status === 'OVERDUE' && (
                          <span className="inline-flex items-center text-xs font-medium text-red-600">
                            <AlertCircle className="w-3 h-3 mr-1"/> Протерміновано
                          </span>
                        )}
                        <button 
                          onClick={() => handlePay(p.id)}
                          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
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
        <div className="grid grid-cols-1 gap-6">
          {jars.length === 0 ? (
            <p className="text-gray-500 text-sm bg-white p-6 rounded-lg border">Активних зборів немає.</p>
          ) : jars.map(jar => {
            const percent = Math.min(100, Math.round((jar.currentAmount / jar.goalAmount) * 100));
            return (
              <div key={jar.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center"><PiggyBank className="w-5 h-5 mr-2 text-pink-500"/> {jar.title}</h3>
                    {jar.description && <p className="text-gray-600 text-sm mt-1">{jar.description}</p>}
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-gray-900">{jar.currentAmount}</span>
                    <span className="text-gray-500 text-sm"> / {jar.goalAmount} ₴</span>
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
                  <div className="h-3 rounded-full bg-gradient-to-r from-pink-500 to-orange-400" style={{ width: `${percent}%` }}></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Donate Form */}
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center"><Wallet className="w-4 h-4 mr-2"/> Зробити внесок</h4>
                    <div className="space-y-3">
                      <div>
                        <input type="number" placeholder="Сума (₴)" className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm p-2 border" value={donateAmount[jar.id] || ''} onChange={e => setDonateAmount(prev => ({...prev, [jar.id]: e.target.value}))} />
                      </div>
                      <div>
                        <input type="text" placeholder="Ваше побажання (необов'язково)" className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm p-2 border" value={donateComment[jar.id] || ''} onChange={e => setDonateComment(prev => ({...prev, [jar.id]: e.target.value}))} />
                      </div>
                      <button onClick={() => handleDonate(jar.id)} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700">
                        Поповнити банку
                      </button>
                    </div>
                  </div>

                  {/* Top Donors */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center"><History className="w-4 h-4 mr-2"/> Останні внески</h4>
                    {jar.transactions.length === 0 ? <p className="text-sm text-gray-500">Ще немає внесків. Будьте першим!</p> : (
                      <ul className="space-y-3">
                        {jar.transactions.map(t => (
                          <li key={t.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                            <div>
                              <span className="font-medium text-gray-900">{t.student.fullName}</span>
                              {t.comment && <p className="text-gray-500 italic mt-0.5">"{t.comment}"</p>}
                            </div>
                            <span className="font-bold text-pink-600">+{t.amount} ₴</span>
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