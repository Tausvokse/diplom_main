import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { AlertTriangle, Wrench, Send, Clock, CheckCircle } from 'lucide-react';

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
      // In a real app we'd pass selectedMasterId to the backend
      // But for now backend just sets it to null or handles it differently
      // Let's assume backend takes masterId now
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
      case 'PENDING': return <span className="flex items-center text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs"><Clock className="w-3 h-3 mr-1"/> Очікує</span>;
      case 'RESOLVED':
      case 'COMPLETED': return <span className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded text-xs"><CheckCircle className="w-3 h-3 mr-1"/> Вирішено</span>;
      default: return <span className="text-gray-600 bg-gray-50 px-2 py-1 rounded text-xs">{status}</span>;
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

  if (isLoading) return <div className="p-8 text-center text-gray-500">Завантаження...</div>;

  if (!roomNumber) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Студентські сервіси</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 flex flex-col items-center text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Функції недоступні</h2>
          <p className="text-gray-600">Сервіси скарг та заявок на ремонт стануть доступними після вашого поселення в гуртожиток. Заповніть заяву на поселення в особистому кабінеті.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Студентські сервіси</h1>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`pb-4 px-4 font-medium text-sm border-b-2 flex items-center ${activeTab === 'complaints' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('complaints')}
        >
          <AlertTriangle className="w-4 h-4 mr-2" /> Скарги
        </button>
        <button
          className={`pb-4 px-4 font-medium text-sm border-b-2 flex items-center ${activeTab === 'repairs' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('repairs')}
        >
          <Wrench className="w-4 h-4 mr-2" /> Заявки на ремонт
        </button>
      </div>

      {activeTab === 'complaints' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Подати скаргу</h2>
            <form onSubmit={submitComplaint} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Порушник (сусід)</label>
                <select value={accusedId} onChange={(e) => setAccusedId(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border">
                  <option value="">Оберіть сусіда...</option>
                  {neighbors.map(n => <option key={n.id} value={n.id}>{n.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Опис порушення</label>
                <textarea rows={3} value={complaintContent} onChange={(e) => setComplaintContent(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" placeholder="Опишіть ситуацію..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Докази (Фото/Відео)</label>
                <input type="file" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>
              <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                <Send className="w-4 h-4 mr-2" /> Надіслати скаргу
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Мої скарги</h2>
            <div className="space-y-4">
              {complaints.length === 0 ? <p className="text-gray-500 text-sm">Ви ще не подавали скарг.</p> : complaints.map(c => (
                <div key={c.id} className="p-4 border rounded-md">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-sm text-gray-900">На: {c.accused.fullName}</span>
                    {getStatusBadge(c.status)}
                  </div>
                  <p className="text-sm text-gray-600">{c.content}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'repairs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Викликати майстра</h2>
            <form onSubmit={submitRepair} className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 rounded-md text-sm border border-blue-100 flex items-center">
                <Wrench className="w-4 h-4 mr-2" /> Заявка буде прив'язана до вашої кімнати: <strong className="ml-1">{roomNumber}</strong>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Оберіть майстра</label>
                <select value={selectedMasterId} onChange={(e) => setSelectedMasterId(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border">
                  <option value="">Не впевнений (призначить адміністратор)</option>
                  {masters.map(m => (
                    <option key={m.id} value={m.id}>{getMasterRoleName(m.role)} ({m.lastName} {m.firstName})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Опис проблеми</label>
                <textarea rows={4} value={repairDesc} onChange={(e) => setRepairDesc(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 border" placeholder="Опишіть що зламалося (сантехніка, електрика, меблі)..." required></textarea>
              </div>
              <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <Send className="w-4 h-4 mr-2" /> Подати заявку
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Історія заявок</h2>
            <div className="space-y-4">
              {repairs.length === 0 ? <p className="text-gray-500 text-sm">Заявок на ремонт немає.</p> : repairs.map(r => (
                <div key={r.id} className="p-4 border rounded-md">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-sm text-gray-900 line-clamp-1">{r.description}</span>
                    {getStatusBadge(r.status)}
                  </div>
                  {r.master ? (
                    <p className="text-xs text-blue-600 mt-1 font-medium flex items-center">
                      <Wrench className="w-3 h-3 mr-1" /> Призначено: {getMasterRoleName(r.master.role)} {r.master.lastName}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1 font-medium flex items-center">
                      Майстра ще не призначено
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">{new Date(r.createdAt).toLocaleDateString()}</p>
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