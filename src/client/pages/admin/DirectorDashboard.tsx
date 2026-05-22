import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Search, Phone, Mail, Home, Settings, ChevronUp, ChevronDown, Users } from 'lucide-react';
import { StudentDetailModal } from '../../components/StudentDetailModal';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

type SortField = 'fullName' | 'course' | 'faculty' | 'rating';
type SortDirection = 'asc' | 'desc';

const SortIcon = ({ field, sortField, sortDirection }: { field: SortField, sortField: SortField, sortDirection: SortDirection }) => {
  if (sortField !== field) return <div className="w-4 h-4 inline-block align-middle ml-1" />;
  return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4 ml-1 inline-block align-middle" /> : <ChevronDown className="w-4 h-4 ml-1 inline-block align-middle" />;
};

interface Student {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  studentIdNumber: string;
  course: number;
  faculty: string;
  rating: number;
  dormitory: { name: string } | null;
  room: { roomNumber: string } | null;
}

const DirectorDashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('fullName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/admin/students?page=1&limit=500');
      setStudents(res.data.data ? res.data.data : res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter(s => 
    s.fullName.toLowerCase().includes(search.toLowerCase()) || 
    s.studentIdNumber.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[rgb(var(--text))] tracking-tight mb-2">База даних студентів</h1>
          <p className="ui-muted text-sm">Глобальний пошук та управління студентами кампусу</p>
        </div>
      </header>

      <div className="ui-card overflow-hidden flex flex-col p-1">
        <div className="p-5 border-b border-[rgb(var(--border)/0.2)] flex flex-col md:flex-row items-center justify-between gap-4 bg-[rgb(var(--surface-2))] nm-inset-sm m-1 rounded-t-3xl">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[rgb(var(--muted))]" />
            <input
              type="text"
              placeholder="Пошук за ПІБ, email або квитком..."
              className="pl-12 w-full ui-input bg-[rgb(var(--surface))]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center text-sm font-bold uppercase tracking-wider text-[rgb(var(--muted))] bg-[rgb(var(--surface))] nm-raised-xs px-4 py-2 rounded-xl">
            <Users className="w-4 h-4 mr-2" />
            Всього: <span className="text-[rgb(var(--text))] ml-2">{filtered.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto bg-[rgb(var(--surface-2))] nm-inset-sm m-1 rounded-b-3xl mt-0">
          <table className="min-w-full text-left border-collapse">
            <thead className="border-b border-[rgb(var(--border)/0.2)]">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider cursor-pointer hover:bg-[rgb(var(--surface))] transition-colors"
                  onClick={() => handleSort('fullName')}
                >
                  <div className="flex items-center">Студент <SortIcon field="fullName" sortField={sortField} sortDirection={sortDirection} /></div>
                </th>
                <th scope="col" className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">
                  Контакти
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider cursor-pointer hover:bg-[rgb(var(--surface))] transition-colors"
                  onClick={() => handleSort('course')}
                >
                  <div className="flex items-center">Факультет / Курс <SortIcon field="course" sortField={sortField} sortDirection={sortDirection} /></div>
                </th>
                <th scope="col" className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">
                  Поселення
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider cursor-pointer hover:bg-[rgb(var(--surface))] transition-colors"
                  onClick={() => handleSort('rating')}
                >
                  <div className="flex items-center">Рейтинг <SortIcon field="rating" sortField={sortField} sortDirection={sortDirection} /></div>
                </th>
                <th scope="col" className="px-6 py-5 text-right text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">
                  Дії
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border)/0.1)]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton height={40} /></td>
                    <td className="px-6 py-4"><Skeleton height={40} /></td>
                    <td className="px-6 py-4"><Skeleton height={20} /></td>
                    <td className="px-6 py-4"><Skeleton height={20} /></td>
                    <td className="px-6 py-4"><Skeleton height={20} /></td>
                    <td className="px-6 py-4"><Skeleton height={20} /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-[rgb(var(--muted))] font-medium text-sm">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    Студентів не знайдено
                  </td>
                </tr>
              ) : (
                filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-[rgb(var(--surface))] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-xl nm-flat bg-[rgb(var(--surface))] flex items-center justify-center text-[rgb(var(--accent))] font-bold mr-4 flex-shrink-0">
                          {student.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[rgb(var(--text))]">{student.fullName}</div>
                          <div className="text-xs font-medium text-[rgb(var(--muted))] mt-0.5">№ {student.studentIdNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col text-xs font-medium text-[rgb(var(--text))] space-y-1.5">
                        <div className="flex items-center"><Phone className="h-3.5 w-3.5 text-[rgb(var(--muted))] mr-2"/> {student.phone}</div>
                        <div className="flex items-center"><Mail className="h-3.5 w-3.5 text-[rgb(var(--muted))] mr-2"/> {student.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-[rgb(var(--text))]">{student.faculty}</div>
                      <div className="text-xs font-medium text-[rgb(var(--muted))] mt-0.5">{student.course} курс</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm font-bold text-[rgb(var(--text))]">
                        <Home className="h-4 w-4 text-[rgb(var(--accent))] mr-2" />
                        {student.dormitory ? (
                          <span>{student.dormitory.name}, Кім. <span className="text-[rgb(var(--accent))]">{student.room?.roomNumber}</span></span>
                        ) : (
                          <span className="text-[rgb(var(--muted))] font-medium">Не поселений</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1.5 inline-flex text-xs font-bold rounded-xl nm-inset-sm ${
                        student.rating >= 4.0 ? 'bg-green-500/10 text-green-500' : 
                        student.rating >= 3.0 ? 'bg-yellow-500/10 text-yellow-500' : 
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {student.rating.toFixed(1)} / 5.0
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => setSelectedStudentId(student.id)}
                        className="w-10 h-10 inline-flex items-center justify-center text-[rgb(var(--accent))] nm-flat bg-[rgb(var(--surface))] hover:nm-inset-sm rounded-xl transition-all"
                        title="Управління студентом"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {selectedStudentId && (
        <StudentDetailModal 
          studentId={selectedStudentId} 
          onClose={() => setSelectedStudentId(null)} 
        />
      )}
    </div>
  );
};

export default DirectorDashboard;