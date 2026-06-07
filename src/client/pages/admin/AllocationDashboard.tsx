import React, { useState, useEffect } from 'react';
import { Play, Loader2, Users, FileCheck, CheckCircle2, TrendingUp, X, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { StudentProfile } from '../../types';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import styles from './AllocationDashboard.module.css';

interface AllocationResult {
  roomId: string;
  roomNumber: string;
  capacity: number;
  currentOccupancy?: number;
  dormitoryName?: string;
  students: StudentProfile[];
  compatibilityScore: number;
}

export const AllocationDashboard: React.FC = () => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [results, setResults] = useState<AllocationResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isRunningAlgorithm, setIsRunningAlgorithm] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [unassignedStudents, setUnassignedStudents] = useState<StudentProfile[]>([]);

  useEffect(() => {
    fetchAllocationPool();
  }, []);

  const handleRemoveStudent = (roomId: string, studentId: string) => {
    if (!results) return;
    const room = results.find(r => r.roomId === roomId);
    const student = room?.students.find(s => s.id === studentId);
    if (!student) return;

    setResults(prev => prev ? prev.map(result => {
      if (result.roomId === roomId) {
        return { ...result, students: result.students.filter(s => s.id !== studentId) };
      }
      return result;
    }) : null);

    setUnassignedStudents(prev => [...prev, student]);
    toast.success('Студента вилучено з кімнати');
  };

  const handleAddStudent = (roomId: string, studentId: string) => {
    const student = unassignedStudents.find(s => s.id === studentId);
    if (!student || !results) return;

    const room = results.find(r => r.roomId === roomId);
    if (room && ((room.currentOccupancy || 0) + room.students.length) >= room.capacity) {
      toast.error('У кімнаті немає вільних місць');
      return;
    }

    setResults(prev => prev ? prev.map(result => {
      if (result.roomId === roomId) {
        return { ...result, students: [...result.students, student] };
      }
      return result;
    }) : null);

    setUnassignedStudents(prev => prev.filter(s => s.id !== studentId));
    toast.success('Студента додано до кімнати');
  };

  const fetchAllocationPool = async () => {
    try {
      const res = await api.get('/admin/allocation/pool');
      setStudents(res.data);
    } catch (error) {
      toast.error('Помилка завантаження пулу студентів');
    } finally {
      setIsLoading(false);
    }
  };

  const runAlgorithm = () => {
    setIsRunningAlgorithm(true);
    setProgress(0);
    setProgressStatus('Ініціалізація векторів центроїдів...');

    const steps = [
      { p: 20, text: 'Розрахунок матриці відстаней...' },
      { p: 40, text: 'Групування за ко-лівінг рефералами...' },
      { p: 60, text: 'Оптимізація K-means кластерів...' },
      { p: 80, text: 'Валідація AHP пріоритетів...' },
      { p: 100, text: 'Формування результатів розподілу...' }
    ];

    let currentStep = 0;
    const interval = setInterval(async () => {
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].p);
        setProgressStatus(steps[currentStep].text);
        currentStep++;
      } else {
        clearInterval(interval);
        try {
          const res = await api.post('/admin/allocation/preview');
          setResults(res.data);
          setUnassignedStudents([]);
          toast.success('План поселення сформовано. Перевірте його перед затвердженням.');
        } catch (error) {
          toast.error('Помилка при виконанні алгоритму');
        } finally {
          setIsRunningAlgorithm(false);
        }
      }
    }, 1500);
  };

  const confirmAllocation = async () => {
    if (!results) return;
    setIsConfirming(true);
    try {
      const plan = results.map(r => ({
        roomId: r.roomId,
        students: r.students.map(s => ({ 
          id: s.id,
          clusterId: (s as any).clusterId
        }))
      }));
      await api.post('/admin/allocation/confirm', { plan });
      toast.success('Наказ на поселення затверджено');
      setResults(null);
      fetchAllocationPool();
    } catch (error) {
      toast.error('Помилка при збереженні розподілу');
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Skeleton height={28} width={280} />
        <Skeleton height={220} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Дашборд розподілу (AHP + K-means)</h1>
          <p className={styles.pageSubtitle}>Автоматизований підбір ідеальних сусідів на основі психометрики</p>
        </div>
        {!results && !isRunningAlgorithm && (
          <button 
            onClick={runAlgorithm}
            className={styles.runButton}
          >
            <Play className={styles.runIcon} />
            ЗАПУСТИТИ АЛГОРИТМ
          </button>
        )}
      </header>

      {/* Progress Bar Overlay / Section */}
      {isRunningAlgorithm && (
        <div className={styles.progressOverlay}>
          {/* Animated Background Glow */}
          <div className={styles.bgGlow1}></div>
          <div className={styles.bgGlow2}></div>
          
          <div className={styles.progressContent}>
            <div className={styles.loaderWrapper}>
              <div className={styles.loaderGlow}></div>
              <Loader2 className={styles.loaderIcon} />
            </div>
            
            <h3 className={styles.progressTitle}>
              Робота AI алгоритму
            </h3>
            <p className={styles.progressDesc}>
              Аналізуємо психометричні профілі та формуємо ідеальні кластери...
            </p>
            
            <div className={styles.progressBarContainer}>
              <div className={styles.progressHeader}>
                <span className={styles.progressStatus}>{progressStatus}</span>
                <span className={styles.progressPercentage}>{progress}%</span>
              </div>
              <div className={styles.progressTrack}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${progress}%` }}
                >
                  <div className={styles.progressShimmer}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results View */}
      {results && (
        <div className={styles.resultsView}>
          <div className={styles.successCard}>
            <div className={styles.successInfo}>
              <div className={styles.successIconWrapper}>
                <CheckCircle2 className={styles.successIcon} />
              </div>
              <div>
                <h3 className={styles.successTitle}>Розподіл завершено</h3>
                <p className={styles.successDesc}>Згенеровано попередній план поселення. Перевірте результати.</p>
              </div>
            </div>
            <button 
              onClick={confirmAllocation}
              disabled={isConfirming}
              className={styles.confirmBtn}
            >
              <FileCheck className={styles.confirmIcon} />
              {isConfirming ? 'ЗАТВЕРДЖЕННЯ...' : 'ЗАТВЕРДИТИ НАКАЗ'}
            </button>
          </div>

          <div className={styles.roomsGrid}>
            {results.map(result => (
              <div key={result.roomId} className={styles.roomCard}>
                <div className={styles.roomHeader}>
                  <div>
                    <h4 className={styles.roomTitle}>{result.dormitoryName ? `${result.dormitoryName.replace('№', '').trim()}, Кімната ${result.roomNumber}` : `Кімната ${result.roomNumber}`}</h4>
                    <p className={styles.roomCapacity}>Місткість: {result.capacity} місця</p>
                  </div>
                  <div className={styles.roomScore}>
                    <div className={styles.scoreBadge}>
                      <TrendingUp className={styles.scoreIcon} />
                      {result.compatibilityScore}%
                    </div>
                  </div>
                </div>

                <div className={styles.studentsList}>
                  {result.students.map((st, idx) => (
                    <div key={st.id} className={styles.studentItem}>
                      <div className={styles.studentIdx}>
                        {idx + 1}
                      </div>
                      <div className={styles.studentInfo}>
                        <p className={styles.studentName}>{st.user?.lastName} {st.user?.firstName}</p>
                        <p className={styles.studentAhp}>
                          AHP: <span className={styles.ahpScore}>{st.priorityScore.toFixed(1)}</span>
                        </p>
                      </div>
                      <button 
                        onClick={() => handleRemoveStudent(result.roomId, st.id)}
                        className={styles.removeBtn}
                        title="Вилучити з кімнати"
                      >
                        <X className={styles.removeIcon} />
                      </button>
                    </div>
                  ))}
                  
                  {/* Manual Assignment Slot */}
                  {((result.currentOccupancy || 0) + result.students.length) < result.capacity && unassignedStudents.length > 0 && (
                    <div className={styles.manualSlot}>
                      <select 
                        onChange={(e) => {
                          if (e.target.value) handleAddStudent(result.roomId, e.target.value);
                          e.target.value = '';
                        }}
                        className={styles.manualSelect}
                      >
                        <option value="">Додати студента з пулу...</option>
                        {unassignedStudents.map(s => (
                          <option key={s.id} value={s.id}>{s.user?.lastName} {s.user?.firstName} ({s.faculty})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Empty beds placeholders */}
                  {Array.from({ length: Math.max(0, result.capacity - (result.currentOccupancy || 0) - result.students.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className={styles.emptyBed}>
                      <div className={styles.emptyBedIcon}></div>
                      <span className={styles.emptyBedText}>Вільне місце</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Manual Unassigned Pool */}
          {unassignedStudents.length > 0 && (
            <div className={styles.unassignedPool}>
              <div className={styles.poolHeader}>
                <Info className={styles.poolIcon} />
                <h4 className={styles.poolTitle}>Нерозподілені студенти (ручне коригування)</h4>
              </div>
              <div className={styles.poolTags}>
                {unassignedStudents.map(s => (
                  <div key={s.id} className={styles.poolTag}>
                    {s.user?.lastName} {s.user?.firstName}
                    <span className={styles.poolTagFaculty}>({s.faculty})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pre-run Data Table */}
      {!results && !isRunningAlgorithm && (
        <div className={styles.preRunTable}>
          <div className={styles.tableHeader}>
            <Users className={styles.tableHeaderIcon} />
            <h3 className={styles.tableHeaderTitle}>Пул студентів, готових до розподілу (Сортування за AHP пріоритетом)</h3>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.thRow}>
                  <th className={styles.th}>Рейтинг</th>
                  <th className={styles.th}>Студент</th>
                  <th className={styles.th}>AHP Score (Пріоритет)</th>
                  <th className={styles.th}>AI Вектор (Психометрика)</th>
                </tr>
              </thead>
              <tbody className={styles.tbody}>
                {students.map((student, index) => (
                  <tr key={student.id} className={styles.tr}>
                    <td className={styles.td}>
                      <span className={styles.rankBadge}>
                        #{index + 1}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <p className={styles.studentNameTd}>{student.user?.lastName} {student.user?.firstName}</p>
                      <p className={styles.studentDescTd}>{student.studentIdNumber} • {student.faculty}</p>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.ahpContainer}>
                        <div className={styles.ahpTrack}>
                          <div className={styles.ahpFill} style={{ width: `${student.priorityScore}%` }}></div>
                        </div>
                        <span className={styles.ahpText}>{student.priorityScore.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.vectorContainer}>
                        <div title={`Хронотип: ${student.clusteringVector?.chronotype}`} className={`${styles.vectorBadge} ${styles.vectorBlue}`}>{student.clusteringVector?.chronotype}</div>
                        <div title={`Соціалізація: ${student.clusteringVector?.sociability}`} className={`${styles.vectorBadge} ${styles.vectorPurple}`}>{student.clusteringVector?.sociability}</div>
                        <div title={`Шум: ${student.clusteringVector?.noiseTolerance}`} className={`${styles.vectorBadge} ${styles.vectorOrange}`}>{student.clusteringVector?.noiseTolerance}</div>
                        <div title={`Чистота: ${student.clusteringVector?.cleanliness}`} className={`${styles.vectorBadge} ${styles.vectorTeal}`}>{student.clusteringVector?.cleanliness}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllocationDashboard;
