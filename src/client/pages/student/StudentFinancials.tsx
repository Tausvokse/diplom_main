import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { Wallet, CreditCard, PiggyBank, History, Check, AlertCircle, ArrowRight, Clock } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import styles from './StudentFinancials.module.css';

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
      <div className={`${styles.container} ${styles.containerLoading}`}>
        <Skeleton height={40} width={200} borderRadius={12} />
        <Skeleton height={60} borderRadius={16} />
        <div className={styles.loadingGrid}>
          <Skeleton height={200} borderRadius={24} />
          <Skeleton height={200} borderRadius={24} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Фінанси</h1>

      <div className={`${styles.tabsContainer} nm-inset-sm`}>
        <button
          className={`${styles.tab} ${activeTab === 'payments' ? `${styles.tabActive} nm-raised` : styles.tabInactive}`}
          onClick={() => setActiveTab('payments')}
        >
          <CreditCard className={styles.tabIcon} /> Оплата проживання
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'jars' ? `${styles.tabActive} nm-raised` : styles.tabInactive}`}
          onClick={() => setActiveTab('jars')}
        >
          <PiggyBank className={styles.tabIcon} /> Банки (Збори)
        </button>
      </div>

      {activeTab === 'payments' && (
        <div className={`ui-card ${styles.paymentsCard}`}>
          <div className={styles.paymentsHeader}>
            <div className={`${styles.paymentsIconBox} nm-raised`}>
              <CreditCard className={styles.paymentsIconSvg} />
            </div>
            <h2 className={styles.paymentsTitle}>Мої рахунки</h2>
          </div>
          
          {payments.length === 0 ? (
            <div className={`${styles.emptyPaymentsBox} nm-inset-sm`}>
              <Check className={styles.emptyPaymentsIcon} />
              <h3 className={styles.emptyPaymentsTitle}>Усе сплачено</h3>
              <p className={`ui-muted ${styles.emptyPaymentsDesc}`}>Немає виставлених рахунків.</p>
            </div>
          ) : (
            <div className={styles.paymentsList}>
              {payments.map(p => (
                <div key={p.id} className={`${styles.paymentItem} ${
                  p.status === 'OVERDUE' ? styles.paymentOverdue : 
                  p.status === 'PAID' ? styles.paymentPaid : 
                  `${styles.paymentPending} nm-flat`
                }`}>
                  <div className={styles.paymentInfo}>
                    <h3 className={styles.paymentDesc}>{p.description}</h3>
                    <div className={styles.paymentDetails}>
                      <span className={styles.paymentAmount}>{p.amount} ₴</span>
                      <span className={styles.paymentDot}></span>
                      <span className={`ui-muted ${styles.paymentDate}`}>
                        <Clock className={styles.paymentDateIcon} /> Термін: {new Date(p.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className={styles.paymentActions}>
                    {p.status === 'PAID' ? (
                      <div className={styles.paidBadge}>
                        <Check className={styles.paidBadgeIcon}/> ОПЛАЧЕНО
                      </div>
                    ) : (
                      <div className={styles.payActionGroup}>
                        {p.status === 'OVERDUE' && (
                          <span className={styles.overdueBadge}>
                            <AlertCircle className={styles.overdueBadgeIcon}/> ПРОТЕРМІНОВАНО
                          </span>
                        )}
                        <button 
                          onClick={() => handlePay(p.id)}
                          className={`${styles.payButton} ${
                            p.status === 'OVERDUE' ? styles.payButtonOverdue : 'ui-button-primary nm-raised'
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
        <div className={styles.jarsGrid}>
          {jars.length === 0 ? (
            <div className={`ui-card ${styles.emptyJarsBox}`}>
              <PiggyBank className={styles.emptyJarsIcon} />
              <p className={styles.emptyJarsText}>Активних зборів немає.</p>
            </div>
          ) : jars.map(jar => {
            const percent = Math.min(100, Math.round((jar.currentAmount / jar.goalAmount) * 100));
            return (
              <div key={jar.id} className={`ui-card ${styles.jarCard}`}>
                {/* Decorative background glow */}
                <div className={styles.jarGlow}></div>
                
                <div className={styles.jarHeader}>
                  <div className={styles.jarTitleArea}>
                    <div className={styles.jarTitleBox}>
                      <div className={`${styles.jarIconBox} nm-raised`}>
                        <PiggyBank className={styles.jarIconSvg} />
                      </div>
                      <h3 className={styles.jarTitle}>{jar.title}</h3>
                    </div>
                    {jar.description && <p className={`ui-muted ${styles.jarDesc}`}>{jar.description}</p>}
                  </div>
                  
                  <div className={`${styles.jarStatsBox} nm-inset-sm`}>
                    <p className={styles.jarStatsLabel}>Зібрано коштів</p>
                    <div className={styles.jarStatsValues}>
                      <span className={styles.jarCurrentAmount}>{jar.currentAmount}</span>
                      <span className={styles.jarGoalAmount}>/ {jar.goalAmount} ₴</span>
                    </div>
                  </div>
                </div>

                <div className={styles.jarProgressContainer}>
                  <div className={`${styles.jarProgressTrack} nm-inset`}>
                    <div 
                      className={styles.jarProgressFill} 
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                  <div className={styles.jarProgressLabel} style={{ right: `${100-percent}%`, transform: 'translateX(50%)' }}>
                    {percent}%
                  </div>
                </div>

                <div className={styles.jarBodyGrid}>
                  {/* Donate Form */}
                  <div className={`${styles.donateBox} nm-inset-sm`}>
                    <h4 className={styles.donateTitle}>
                      <Wallet className={styles.donateTitleIcon} /> 
                      Зробити внесок
                    </h4>
                    <div className={styles.donateForm}>
                      <div>
                        <label className={`ui-muted ${styles.donateLabel}`}>Сума внеску</label>
                        <div className={styles.donateInputWrapper}>
                          <input 
                            type="number" 
                            placeholder="0" 
                            className={`ui-input ${styles.donateInputAmount}`} 
                            value={donateAmount[jar.id] || ''} 
                            onChange={e => setDonateAmount(prev => ({...prev, [jar.id]: e.target.value}))} 
                          />
                          <span className={styles.donateCurrency}>₴</span>
                        </div>
                      </div>
                      <div>
                        <label className={`ui-muted ${styles.donateLabel}`}>Коментар</label>
                        <input 
                          type="text" 
                          placeholder="Ваше побажання (необов'язково)" 
                          className={`ui-input ${styles.donateInputComment}`} 
                          value={donateComment[jar.id] || ''} 
                          onChange={e => setDonateComment(prev => ({...prev, [jar.id]: e.target.value}))} 
                        />
                      </div>
                      <button 
                        onClick={() => handleDonate(jar.id)} 
                        className={styles.donateSubmitBtn}
                      >
                        ПОПОВНИТИ БАНКУ <ArrowRight className={styles.donateSubmitBtnIcon} />
                      </button>
                    </div>
                  </div>

                  {/* Top Donors */}
                  <div className={`${styles.transactionsBox} nm-flat`}>
                    <h4 className={styles.transactionsTitle}>
                      <History className={styles.transactionsTitleIcon} /> 
                      Останні внески
                    </h4>
                    {jar.transactions.length === 0 ? (
                      <div className={`${styles.emptyTransactionsBox} nm-inset-sm`}>
                        <History className={styles.emptyTransactionsIcon} />
                        <p className={`ui-muted ${styles.emptyTransactionsText}`}>Ще немає внесків.<br/>Будьте першим!</p>
                      </div>
                    ) : (
                      <div className={styles.transactionsList}>
                        {jar.transactions.map((t, idx) => (
                          <div key={t.id} className={styles.transactionItem}>
                            <div className={styles.transactionInfo}>
                              <div className={`${styles.transactionAvatar} nm-inset-sm`}>
                                {idx + 1}
                              </div>
                              <div>
                                <span className={styles.transactionName}>{t.student.fullName}</span>
                                {t.comment && <p className={styles.transactionComment}>"{t.comment}"</p>}
                              </div>
                            </div>
                            <span className={styles.transactionAmount}>
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
    </div>
  );
};

export default StudentFinancials;