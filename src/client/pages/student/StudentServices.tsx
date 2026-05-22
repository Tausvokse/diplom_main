import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { AlertTriangle, Wrench, Send, Clock, CheckCircle, FileText } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

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
      case 'PENDING': return <span className="flex items-center text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ui-pill nm-flat"><Clock className="w-3.5 h-3.5 mr-1.5"/> Очікує</span>;
      case 'RESOLVED':
      case 'COMPLETED': return <span className="flex items-center text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ui-pill nm-flat"><CheckCircle className="w-3.5 h-3.5 mr-1.5"/> Вирішено</span>;
      default: return <span className="text-[rgb(var(--text))] bg-[rgb(var(--surface-3))] px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ui-pill nm-flat">{status}</span>;
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 space-y-6">
        <Skeleton height={40} width={250} borderRadius={12} />
        <Skeleton height={60} borderRadius={16} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          <Skeleton height={400} borderRadius={24} />
          <Skeleton height={400} borderRadius={24} />
        </div>
      </div>
    );
  }

  if (!roomNumber) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <h1 className="text-3xl font-bold text-[rgb(var(--text))] mb-8 tracking-tight">Студентські сервіси</h1>
        <div className="ui-card p-10 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full nm-inset-sm flex items-center justify-center mb-6 bg-[rgb(var(--surface-2))]">
            <AlertTriangle className="w-12 h-12 text-yellow-500" />
          </div>
          <h2 className="text-xl font-bold text-[rgb(var(--text))] mb-3">Функції недоступні</h2>
          <p className="ui-muted text-sm max-w-md leading-relaxed">Сервіси скарг та заявок на ремонт стануть доступними після вашого поселення в гуртожиток. Заповніть заяву на поселення в особистому кабінеті.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <h1 className="text-3xl font-bold text-[rgb(var(--text))] mb-8 tracking-tight">Студентські сервіси</h1>

      <div className="flex bg-[rgb(var(--surface-2))] p-1.5 rounded-2xl nm-inset-sm mb-8 overflow-x-auto hide-scrollbar">
        <button
          className={`flex-1 flex justify-center items-center py-3 px-6 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'complaints' ? 'nm-raised bg-[rgb(var(--surface))] text-[rgb(var(--accent))]' : 'text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] hover:nm-flat'}`}
          onClick={() => setActiveTab('complaints')}
        >
          <AlertTriangle className="w-4 h-4 mr-2" /> Скарги
        </button>
        <button
          className={`flex-1 flex justify-center items-center py-3 px-6 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'repairs' ? 'nm-raised bg-[rgb(var(--surface))] text-[rgb(var(--accent))]' : 'text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] hover:nm-flat'}`}
          onClick={() => setActiveTab('repairs')}
        >
          <Wrench className="w-4 h-4 mr-2" /> Заявки на ремонт
        </button>
      </div>

      {activeTab === 'complaints' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <div className="ui-card p-6 md:p-8">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 rounded-xl nm-raised flex items-center justify-center mr-4 bg-[rgb(var(--surface))]">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <h2 className="text-xl font-bold text-[rgb(var(--text))]">Подати скаргу</h2>
            </div>
            
            <form onSubmit={submitComplaint} className="space-y-6 bg-[rgb(var(--surface-2))] p-6 rounded-3xl nm-inset-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Порушник (сусід)</label>
                <select value={accusedId} onChange={(e) => setAccusedId(e.target.value)} className="ui-input bg-[rgb(var(--surface))]">
                  <option value="">Оберіть сусіда...</option>
                  {neighbors.map(n => <option key={n.id} value={n.id}>{n.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Опис порушення</label>
                <textarea rows={4} value={complaintContent} onChange={(e) => setComplaintContent(e.target.value)} className="ui-input bg-[rgb(var(--surface))]" placeholder="Опишіть ситуацію..."></textarea>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Докази (Фото/Відео)</label>
                <div className="relative nm-flat bg-[rgb(var(--surface))] rounded-xl p-1 flex items-center">
                  <input type="file" id="evidence-upload" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} className="hidden" />
                  <label htmlFor="evidence-upload" className="ui-button ui-button-outline px-4 py-2 text-xs m-1 cursor-pointer">
                    ОБРАТИ ФАЙЛ
                  </label>
                  <span className="text-sm text-[rgb(var(--muted))] ml-2 truncate px-2">
                    {evidenceFile ? evidenceFile.name : 'Файл не обрано'}
                  </span>
                </div>
              </div>
              <button type="submit" className="w-full ui-button ui-button-primary py-3.5 mt-2">
                <Send className="w-4 h-4 mr-2" /> Надіслати скаргу
              </button>
            </form>
          </div>

          <div className="ui-card p-6 md:p-8 flex flex-col">
            <h2 className="text-xl font-bold text-[rgb(var(--text))] mb-6 flex items-center">
              <FileText className="w-5 h-5 mr-3 text-[rgb(var(--accent))]" /> 
              Мої скарги
            </h2>
            <div className="space-y-4 flex-1">
              {complaints.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[rgb(var(--surface-2))] nm-inset-sm rounded-3xl">
                  <FileText className="w-12 h-12 text-[rgb(var(--muted))] opacity-30 mb-4" />
                  <p className="ui-muted text-sm font-medium">Ви ще не подавали скарг.</p>
                </div>
              ) : complaints.map(c => (
                <div key={c.id} className="p-5 nm-flat bg-[rgb(var(--surface))] rounded-2xl hover:nm-raised-sm transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-bold text-sm text-[rgb(var(--text))]">На: <span className="text-[rgb(var(--accent))]">{c.accused.fullName}</span></span>
                    {getStatusBadge(c.status)}
                  </div>
                  <p className="text-sm text-[rgb(var(--text))] bg-[rgb(var(--surface-2))] nm-inset-sm p-3 rounded-xl italic mb-3">"{c.content}"</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider ui-muted">{new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'repairs' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <div className="ui-card p-6 md:p-8">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 rounded-xl nm-raised flex items-center justify-center mr-4 bg-[rgb(var(--surface))]">
                <Wrench className="w-5 h-5 text-[rgb(var(--accent))]" />
              </div>
              <h2 className="text-xl font-bold text-[rgb(var(--text))]">Викликати майстра</h2>
            </div>
            
            <form onSubmit={submitRepair} className="space-y-6 bg-[rgb(var(--surface-2))] p-6 rounded-3xl nm-inset-sm">
              <div className="p-4 bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))] rounded-2xl text-sm nm-inset-sm flex items-start border-l-4 border-[rgb(var(--accent))]">
                <Wrench className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" /> 
                <span className="font-medium leading-relaxed">Заявка буде прив'язана до вашої кімнати: <strong className="text-[rgb(var(--text))] ml-1 bg-[rgb(var(--surface))] nm-raised-xs px-2 py-0.5 rounded">{roomNumber}</strong></span>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Оберіть майстра</label>
                <select value={selectedMasterId} onChange={(e) => setSelectedMasterId(e.target.value)} className="ui-input bg-[rgb(var(--surface))]">
                  <option value="">Не впевнений (призначить адміністратор)</option>
                  {masters.map(m => (
                    <option key={m.id} value={m.id}>{getMasterRoleName(m.role)} ({m.lastName} {m.firstName})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-2">Опис проблеми</label>
                <textarea rows={5} value={repairDesc} onChange={(e) => setRepairDesc(e.target.value)} className="ui-input bg-[rgb(var(--surface))]" placeholder="Опишіть що зламалося (сантехніка, електрика, меблі)..." required></textarea>
              </div>
              <button type="submit" className="w-full ui-button ui-button-primary py-3.5 mt-2">
                <Send className="w-4 h-4 mr-2" /> Подати заявку
              </button>
            </form>
          </div>

          <div className="ui-card p-6 md:p-8 flex flex-col">
            <h2 className="text-xl font-bold text-[rgb(var(--text))] mb-6 flex items-center">
              <FileText className="w-5 h-5 mr-3 text-[rgb(var(--accent))]" /> 
              Історія заявок
            </h2>
            <div className="space-y-4 flex-1">
              {repairs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[rgb(var(--surface-2))] nm-inset-sm rounded-3xl">
                  <Wrench className="w-12 h-12 text-[rgb(var(--muted))] opacity-30 mb-4" />
                  <p className="ui-muted text-sm font-medium">Заявок на ремонт немає.</p>
                </div>
              ) : repairs.map(r => (
                <div key={r.id} className="p-5 nm-flat bg-[rgb(var(--surface))] rounded-2xl hover:nm-raised-sm transition-all">
                  <div className="flex justify-between items-start mb-3 gap-4">
                    <span className="font-bold text-sm text-[rgb(var(--text))] leading-relaxed">{r.description}</span>
                    <div className="flex-shrink-0">{getStatusBadge(r.status)}</div>
                  </div>
                  {r.master ? (
                    <div className="bg-[rgb(var(--surface-2))] nm-inset-sm p-3 rounded-xl mb-3">
                      <p className="text-xs text-[rgb(var(--accent))] font-bold uppercase tracking-wider flex items-center">
                        <Wrench className="w-3.5 h-3.5 mr-2" /> Призначено: {getMasterRoleName(r.master.role)} {r.master.lastName}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-[rgb(var(--surface-2))] nm-inset-sm p-3 rounded-xl mb-3">
                      <p className="text-xs text-[rgb(var(--muted))] font-bold uppercase tracking-wider flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-2" /> Майстра ще не призначено
                      </p>
                    </div>
                  )}
                  <p className="text-[10px] font-bold uppercase tracking-wider ui-muted">{new Date(r.createdAt).toLocaleDateString()}</p>
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