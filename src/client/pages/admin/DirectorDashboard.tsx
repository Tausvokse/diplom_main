import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Search, UserCircle, Phone, Mail, Home, Settings, ChevronUp, ChevronDown } from 'lucide-react';
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
      const res = await api.get('/admin/students?page=1&limit=500'); // Temp limit for now
      setStudents(res.data.data ? res.data.data : res.data); // Support both old and new formats during transition
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">База даних студентів</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Пошук за ПІБ, email або номером квитка..."
              className="pl-10 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 outline-none transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 w-full md:w-auto text-right md:text-left">
            Всього знайдено: <span className="font-medium text-gray-900 dark:text-white">{filtered.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort('fullName')}
                >
                  <div className="flex items-center">Студент <SortIcon field="fullName" sortField={sortField} sortDirection={sortDirection} /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Контакти
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort('course')}
                >
                  <div className="flex items-center">Факультет / Курс <SortIcon field="course" sortField={sortField} sortDirection={sortDirection} /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Поселення
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSort('rating')}
                >
                  <div className="flex items-center">Рейтинг <SortIcon field="rating" sortField={sortField} sortDirection={sortDirection} /></div>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Дії
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
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
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Студентів не знайдено
                  </td>
                </tr>
              ) : (
                filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <UserCircle className="h-8 w-8 text-gray-400 dark:text-gray-500 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{student.fullName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">№ {student.studentIdNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col text-sm text-gray-900 dark:text-gray-300">
                        <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400 dark:text-gray-500"/> {student.phone}</div>
                        <div className="flex items-center gap-2 mt-1"><Mail className="h-4 w-4 text-gray-400 dark:text-gray-500"/> {student.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {student.faculty}, {student.course} курс
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-gray-300">
                        <Home className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
                        {student.dormitory ? `${student.dormitory.name}, Кім. ${student.room?.roomNumber}` : <span className="text-gray-400 dark:text-gray-500">Не поселений</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${student.rating >= 4.0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : student.rating >= 3.0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {student.rating.toFixed(1)} / 5.0
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => setSelectedStudentId(student.id)}
                        className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
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