import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { AlertTriangle, Wrench, Send, Clock, CheckCircle, FileText } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import styles from './StudentServices.module.css';

interface Neighbor {
  id: string;
  fullName: string;
}

interface Master {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Complaint {
  id: string;
  accused: { fullName: string };
  content: string;
  status: string;
  createdAt: string;
}

interface RepairRequest {
  id: string;
  description: string;
  status: string;
  createdAt: string;
  master?: { firstName: string; lastName: string; role: string } | null;
}

const StudentServices: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'complaints' | 'repairs'>('complaints');
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [roomNumber, setRoomNumber] = useState<string>('');
  
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [accusedId, setAccusedId] = useState('');
  const [complaintContent, setComplaintContent] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const [repairs, setRepairs] = useState<RepairRequest[]>([]);
  const [repairDesc, setRepairDesc] = useState('');
  const [selectedMasterId, setSelectedMasterId] = useState('');

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [neighRes, compRes, repRes, mastRes, dashRes] = await Promise.all([
        api.get('/student/neighbors'),
        api.get('/student/complaints'),
        api.get('/student/repairs'),
        api.get('/student/masters'),
        api.get('/student/dashboard')
      ]);
      setNeighbors(neighRes.data);
      setComplaints(compRes.data);
      setRepairs(repRes.data);
      setMasters(mastRes.data);
      setRoomNumber(dashRes.data?.application?.student?.room?.roomNumber || '');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const submitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accusedId || !complaintContent) {
      toast.error('Заповніть всі поля');
      return;
    }
    const formData = new FormData();
    formData.append('accusedId', accusedId);
    formData.append('content', complaintContent);
    if (evidenceFile) formData.append('evidence', evidenceFile);

    try {
      await api.post('/student/complaints', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Скаргу подано');
      setAccusedId('');
      setComplaintContent('');
      setEvidenceFile(null);
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const submitRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repairDesc) return;
    try {
      await api.post('/student/repairs', { description: repairDesc, masterId: selectedMasterId });
      toast.success('Заявку на ремонт подано');
      setRepairDesc('');
      setSelectedMasterId('');
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PENDING': return <span className={`${styles.badgePending} ui-pill nm-flat`}><Clock className={styles.badgeIcon}/> Очікує</span>;
      case 'RESOLVED':
      case 'COMPLETED': return <span className={`${styles.badgeCompleted} ui-pill nm-flat`}><CheckCircle className={styles.badgeIcon}/> Вирішено</span>;
      default: return <span className={`${styles.badgeDefault} ui-pill nm-flat`}>{status}</span>;
    }
  };

  const getMasterRoleName = (role: string) => {
    switch(role) {
      case 'MASTER_SLESAR': return 'Слюсар';
      case 'MASTER_SANTEKHNIK': return 'Сантехнік';
      case 'MASTER_ELECTRIC': return 'Електрик';
      default: return 'Майстер';
    }
  };

  if (isLoading) {
    return (
      <div className={`${styles.container} ${styles.containerLoading}`}>
        <Skeleton height={40} width={250} borderRadius={12} />
        <Skeleton height={60} borderRadius={16} />
        <div className={styles.loadingGrid}>
          <Skeleton height={400} borderRadius={24} />
          <Skeleton height={400} borderRadius={24} />
        </div>
      </div>
    );
  }

  if (!roomNumber) {
    return (
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Студентські сервіси</h1>
        <div className={`ui-card ${styles.emptyStateCard}`}>
          <div className={`${styles.emptyStateIconBox} nm-inset-sm`}>
            <AlertTriangle className={styles.emptyStateIconSvg} />
          </div>
          <h2 className={styles.emptyStateTitle}>Функції недоступні</h2>
          <p className={`ui-muted ${styles.emptyStateDesc}`}>Сервіси скарг та заявок на ремонт стануть доступними після вашого поселення в гуртожиток. Заповніть заяву на поселення в особистому кабінеті.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Студентські сервіси</h1>

      <div className={`${styles.tabsContainer} nm-inset-sm`}>
        <button
          className={`${styles.tab} ${activeTab === 'complaints' ? `${styles.tabActive} nm-raised` : styles.tabInactive}`}
          onClick={() => setActiveTab('complaints')}
        >
          <AlertTriangle className={styles.tabIcon} /> Скарги
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'repairs' ? `${styles.tabActive} nm-raised` : styles.tabInactive}`}
          onClick={() => setActiveTab('repairs')}
        >
          <Wrench className={styles.tabIcon} /> Заявки на ремонт
        </button>
      </div>

      {activeTab === 'complaints' && (
        <div className={styles.contentGrid}>
          <div className={`ui-card ${styles.formCard}`}>
            <div className={styles.cardHeader}>
              <div className={`${styles.headerIconBox} nm-raised`}>
                <AlertTriangle className={styles.headerIconWarning} />
              </div>
              <h2 className={styles.cardTitle}>Подати скаргу</h2>
            </div>
            
            <form onSubmit={submitComplaint} className={`${styles.formWrapper} nm-inset-sm`}>
              <div>
                <label className={`ui-muted ${styles.formLabel}`}>Порушник (сусід)</label>
                <select value={accusedId} onChange={(e) => setAccusedId(e.target.value)} className="ui-input bg-[rgb(var(--surface))]">
                  <option value="">Оберіть сусіда...</option>
                  {neighbors.map(n => <option key={n.id} value={n.id}>{n.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className={`ui-muted ${styles.formLabel}`}>Опис порушення</label>
                <textarea rows={4} value={complaintContent} onChange={(e) => setComplaintContent(e.target.value)} className="ui-input bg-[rgb(var(--surface))]" placeholder="Опишіть ситуацію..."></textarea>
              </div>
              <div>
                <label className={`ui-muted ${styles.formLabel}`}>Докази (Фото/Відео)</label>
                <div className={`${styles.fileUploadWrapper} nm-flat`}>
                  <input type="file" id="evidence-upload" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} className="hidden" />
                  <label htmlFor="evidence-upload" className="ui-button ui-button-outline px-4 py-2 text-xs m-1 cursor-pointer">
                    ОБРАТИ ФАЙЛ
                  </label>
                  <span className={`ui-muted ${styles.fileName}`}>
                    {evidenceFile ? evidenceFile.name : 'Файл не обрано'}
                  </span>
                </div>
              </div>
              <button type="submit" className={`ui-button ui-button-primary ${styles.submitBtn}`}>
                <Send className={styles.submitBtnIcon} /> Надіслати скаргу
              </button>
            </form>
          </div>

          <div className={`ui-card ${styles.listCard}`}>
            <h2 className={styles.listCardTitle}>
              <FileText className={styles.listCardTitleIcon} /> 
              Мої скарги
            </h2>
            <div className={styles.listWrapper}>
              {complaints.length === 0 ? (
                <div className={`${styles.emptyListBox} nm-inset-sm`}>
                  <FileText className={styles.emptyListIcon} />
                  <p className={`ui-muted ${styles.emptyListText}`}>Ви ще не подавали скарг.</p>
                </div>
              ) : complaints.map(c => (
                <div key={c.id} className={`${styles.listItem} nm-flat hover:nm-raised-sm`}>
                  <div className={styles.listItemHeader}>
                    <span className={styles.complaintAccused}>На: <span className={styles.complaintAccusedName}>{c.accused.fullName}</span></span>
                    {getStatusBadge(c.status)}
                  </div>
                  <p className={`${styles.complaintContent} nm-inset-sm`}>"{c.content}"</p>
                  <p className={`ui-muted ${styles.dateText}`}>{new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'repairs' && (
        <div className={styles.contentGrid}>
          <div className={`ui-card ${styles.formCard}`}>
            <div className={styles.cardHeader}>
              <div className={`${styles.headerIconBox} nm-raised`}>
                <Wrench className={styles.headerIconAccent} />
              </div>
              <h2 className={styles.cardTitle}>Викликати майстра</h2>
            </div>
            
            <form onSubmit={submitRepair} className={`${styles.formWrapper} nm-inset-sm`}>
              <div className={`${styles.infoBanner} nm-inset-sm`}>
                <Wrench className={styles.infoBannerIcon} /> 
                <span className={styles.infoBannerText}>Заявка буде прив'язана до вашої кімнати: <strong className={`${styles.infoBannerHighlight} nm-raised-xs`}>{roomNumber}</strong></span>
              </div>
              <div>
                <label className={`ui-muted ${styles.formLabel}`}>Оберіть майстра</label>
                <select value={selectedMasterId} onChange={(e) => setSelectedMasterId(e.target.value)} className="ui-input bg-[rgb(var(--surface))]">
                  <option value="">Не впевнений (призначить адміністратор)</option>
                  {masters.map(m => (
                    <option key={m.id} value={m.id}>{getMasterRoleName(m.role)} ({m.lastName} {m.firstName})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`ui-muted ${styles.formLabel}`}>Опис проблеми</label>
                <textarea rows={5} value={repairDesc} onChange={(e) => setRepairDesc(e.target.value)} className="ui-input bg-[rgb(var(--surface))]" placeholder="Опишіть що зламалося (сантехніка, електрика, меблі)..." required></textarea>
              </div>
              <button type="submit" className={`ui-button ui-button-primary ${styles.submitBtn}`}>
                <Send className={styles.submitBtnIcon} /> Подати заявку
              </button>
            </form>
          </div>

          <div className={`ui-card ${styles.listCard}`}>
            <h2 className={styles.listCardTitle}>
              <FileText className={styles.listCardTitleIcon} /> 
              Історія заявок
            </h2>
            <div className={styles.listWrapper}>
              {repairs.length === 0 ? (
                <div className={`${styles.emptyListBox} nm-inset-sm`}>
                  <Wrench className={styles.emptyListIcon} />
                  <p className={`ui-muted ${styles.emptyListText}`}>Заявок на ремонт немає.</p>
                </div>
              ) : repairs.map(r => (
                <div key={r.id} className={`${styles.listItem} nm-flat hover:nm-raised-sm`}>
                  <div className={`${styles.listItemHeader} ${styles.listItemHeaderGap}`}>
                    <span className={styles.repairDesc}>{r.description}</span>
                    <div className="flex-shrink-0">{getStatusBadge(r.status)}</div>
                  </div>
                  {r.master ? (
                    <div className={`${styles.masterInfoBox} nm-inset-sm`}>
                      <p className={styles.masterAssignedText}>
                        <Wrench className={styles.masterIcon} /> Призначено: {getMasterRoleName(r.master.role)} {r.master.lastName}
                      </p>
                    </div>
                  ) : (
                    <div className={`${styles.masterInfoBox} nm-inset-sm`}>
                      <p className={styles.masterUnassignedText}>
                        <Clock className={styles.masterIcon} /> Майстра ще не призначено
                      </p>
                    </div>
                  )}
                  <p className={`ui-muted ${styles.dateText}`}>{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentServices;