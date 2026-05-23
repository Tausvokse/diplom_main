import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Search, Phone, Mail, Home, Settings, ChevronUp, ChevronDown, Users } from 'lucide-react';
import { StudentDetailModal } from '../../components/StudentDetailModal';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import styles from './DirectorDashboard.module.css';

type SortField = 'fullName' | 'course' | 'faculty' | 'rating';
type SortDirection = 'asc' | 'desc';

const SortIcon = ({ field, sortField, sortDirection }: { field: SortField, sortField: SortField, sortDirection: SortDirection }) => {
  if (sortField !== field) return <div className={styles.sortIconEmpty} />;
  return sortDirection === 'asc' ? <ChevronUp className={styles.sortIcon} /> : <ChevronDown className={styles.sortIcon} />;
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
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>База даних студентів</h1>
          <p className={styles.pageSubtitle}>Глобальний пошук та управління студентами кампусу</p>
        </div>
      </header>

      <div className={styles.tableCard}>
        <div className={styles.toolbar}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Пошук за ПІБ, email або квитком..."
              className={`ui-input ${styles.searchInput}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.totalCount}>
            <Users className={styles.totalIcon} />
            Всього: <span className={styles.totalValue}>{filtered.length}</span>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th 
                  scope="col" 
                  className={styles.thSortable}
                  onClick={() => handleSort('fullName')}
                >
                  <div className={styles.thContent}>Студент <SortIcon field="fullName" sortField={sortField} sortDirection={sortDirection} /></div>
                </th>
                <th scope="col" className={styles.th}>
                  Контакти
                </th>
                <th 
                  scope="col" 
                  className={styles.thSortable}
                  onClick={() => handleSort('course')}
                >
                  <div className={styles.thContent}>Факультет / Курс <SortIcon field="course" sortField={sortField} sortDirection={sortDirection} /></div>
                </th>
                <th scope="col" className={styles.th}>
                  Поселення
                </th>
                <th 
                  scope="col" 
                  className={styles.thSortable}
                  onClick={() => handleSort('rating')}
                >
                  <div className={styles.thContent}>Рейтинг <SortIcon field="rating" sortField={sortField} sortDirection={sortDirection} /></div>
                </th>
                <th scope="col" className={styles.thRight}>
                  Дії
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className={styles.tr}>
                    <td className={styles.td}><Skeleton height={40} /></td>
                    <td className={styles.td}><Skeleton height={40} /></td>
                    <td className={styles.td}><Skeleton height={20} /></td>
                    <td className={styles.td}><Skeleton height={20} /></td>
                    <td className={styles.td}><Skeleton height={20} /></td>
                    <td className={styles.td}><Skeleton height={20} /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    <Users className={styles.emptyStateIcon} />
                    Студентів не знайдено
                  </td>
                </tr>
              ) : (
                filtered.map((student) => (
                  <tr key={student.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.flexCenter}>
                        <div className={styles.avatar}>
                          {student.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className={styles.primaryText}>{student.fullName}</div>
                          <div className={styles.secondaryText}>№ {student.studentIdNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.contactList}>
                        <div className={styles.contactItem}><Phone className={styles.contactIcon}/> {student.phone}</div>
                        <div className={styles.contactItem}><Mail className={styles.contactIcon}/> {student.email}</div>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.primaryText}>{student.faculty}</div>
                      <div className={styles.secondaryText}>{student.course} курс</div>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.dormInfo}>
                        <Home className={styles.dormIcon} />
                        {student.dormitory ? (
                          <span>{student.dormitory.name}, Кім. <span className={styles.dormRoomNumber}>{student.room?.roomNumber}</span></span>
                        ) : (
                          <span className={styles.emptyText}>Не поселений</span>
                        )}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.ratingBadge} ${
                        student.rating >= 4.0 ? styles.ratingGreen : 
                        student.rating >= 3.0 ? styles.ratingYellow : 
                        styles.ratingRed
                      }`}>
                        {student.rating.toFixed(1)} / 5.0
                      </span>
                    </td>
                    <td className={styles.tdRight}>
                      <button 
                        onClick={() => setSelectedStudentId(student.id)}
                        className={styles.actionBtn}
                        title="Управління студентом"
                      >
                        <Settings className={styles.actionIcon} />
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