import React, { useState, useEffect } from 'react';
import { Play, Loader2, Users, FileCheck, CheckCircle2, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { StudentProfile } from '../../types';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface AllocationResult {
  roomId: string;
  roomNumber: string;
  capacity: number;
  currentOccupancy?: number;
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
    const student = results.find(r => r.roomId === roomId)?.students.find(s => s.id === studentId);
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
    if (room && room.students.length >= room.capacity) {
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
      await api.post('/admin/allocation/confirm', {
        plan: results.map(result => ({
          roomId: result.roomId,
          students: result.students.map(student => ({ id: student.id }))
        }))
      });
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <Skeleton height={28} width={280} />
        <Skeleton height={220} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <header className="mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[rgb(var(--text))] tracking-tight mb-2">Дашборд розподілу (AHP + K-means)</h1>
          <p className="ui-muted text-sm">Автоматизований підбір ідеальних сусідів на основі психометрики</p>
        </div>
        {!results && !isRunningAlgorithm && (
          <button 
            onClick={runAlgorithm}
            className="flex items-center px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl font-bold shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 transition-all"
          >
            <Play className="w-5 h-5 mr-3" />
            ЗАПУСТИТИ АЛГОРИТМ
          </button>
        )}
      </header>

      {/* Progress Bar Overlay / Section */}
      {isRunningAlgorithm && (
        <div className="ui-card p-8 md:p-10 mb-8 border-2 border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-[rgb(var(--text))] flex items-center">
              <Loader2 className="w-6 h-6 mr-3 animate-spin text-indigo-500" />
              Робота AI алгоритму
            </h3>
            <span className="text-indigo-500 font-mono font-bold text-2xl">{progress}%</span>
          </div>
          <div className="h-4 w-full bg-[rgb(var(--surface-2))] nm-inset rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out relative shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)]"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite]"></div>
            </div>
          </div>
          <p className="text-sm font-bold uppercase tracking-wider text-[rgb(var(--muted))] text-center">{progressStatus}</p>
        </div>
      )}

      {/* Results View */}
      {results && (
        <div className="space-y-8 animate-fadeIn">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 ui-card p-6 md:p-8 border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="w-16 h-16 rounded-2xl nm-raised bg-[rgb(var(--surface))] flex items-center justify-center mr-6 flex-shrink-0 text-green-500">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[rgb(var(--text))] mb-1">Розподіл завершено</h3>
                <p className="text-sm font-medium ui-muted">Згенеровано попередній план поселення. Перевірте результати.</p>
              </div>
            </div>
            <button 
              onClick={confirmAllocation}
              disabled={isConfirming}
              className="flex items-center justify-center px-8 py-4 bg-green-500 text-white rounded-2xl font-bold shadow-[0_4px_20px_rgba(34,197,94,0.3)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
            >
              <FileCheck className="w-5 h-5 mr-3" />
              {isConfirming ? 'ЗАТВЕРДЖЕННЯ...' : 'ЗАТВЕРДИТИ НАКАЗ'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {results.map(result => (
              <div key={result.roomId} className="ui-card p-6 md:p-8 flex flex-col">
                <div className="flex justify-between items-start mb-6 border-b border-[rgb(var(--border)/0.2)] pb-6">
                  <div>
                    <h4 className="font-black text-2xl text-[rgb(var(--text))]">Кімната {result.roomNumber}</h4>
                    <p className="text-xs font-bold uppercase tracking-wider ui-muted mt-2">Місткість: {result.capacity} місця</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-500 nm-inset-sm">
                      <TrendingUp className="w-4 h-4 mr-1.5" />
                      {result.compatibilityScore}%
                    </div>
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  {result.students.map((st, idx) => (
                    <div key={st.id} className="flex items-center bg-[rgb(var(--surface))] nm-flat p-4 rounded-2xl hover:nm-raised-sm transition-all">
                      <div className="w-10 h-10 rounded-xl nm-inset-sm bg-[rgb(var(--surface-2))] flex items-center justify-center text-sm font-black text-[rgb(var(--accent))] mr-4 flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[rgb(var(--text))]">{st.user?.lastName} {st.user?.firstName}</p>
                        <p className="text-xs font-medium text-[rgb(var(--muted))] flex items-center mt-1">
                          AHP Score: <span className="font-mono font-bold text-indigo-500 ml-1.5 bg-indigo-500/10 px-1.5 py-0.5 rounded">{st.priorityScore.toFixed(1)}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                  {/* Empty beds placeholders */}
                  {Array.from({ length: Math.max(0, result.capacity - (result.currentOccupancy || 0) - result.students.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex items-center border-2 border-dashed border-[rgb(var(--border)/0.3)] bg-[rgb(var(--surface-2))] nm-inset-sm p-4 rounded-2xl opacity-60">
                      <div className="w-10 h-10 rounded-xl border-2 border-dashed border-[rgb(var(--border)/0.5)] flex items-center justify-center mr-4 flex-shrink-0"></div>
                      <span className="text-sm font-bold text-[rgb(var(--muted))]">Вільне місце</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pre-run Data Table */}
      {!results && !isRunningAlgorithm && (
        <div className="ui-card overflow-hidden transition-colors p-1">
          <div className="p-6 border-b border-[rgb(var(--border)/0.2)] bg-[rgb(var(--surface-2))] flex items-center rounded-t-[31px]">
            <Users className="w-6 h-6 text-[rgb(var(--accent))] mr-3" />
            <h3 className="font-bold text-lg text-[rgb(var(--text))]">Пул студентів, готових до розподілу (Сортування за AHP пріоритетом)</h3>
          </div>
          <div className="overflow-x-auto bg-[rgb(var(--surface-2))] nm-inset-sm rounded-b-[31px] m-1 mt-0">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-[rgb(var(--border)/0.2)]">
                  <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">Рейтинг</th>
                  <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">Студент</th>
                  <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">AHP Score (Пріоритет)</th>
                  <th className="px-6 py-5 text-xs font-bold text-[rgb(var(--muted))] uppercase tracking-wider">AI Вектор (Психометрика)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border)/0.1)]">
                {students.map((student, index) => (
                  <tr key={student.id} className="hover:bg-[rgb(var(--surface))] transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl nm-raised bg-[rgb(var(--surface))] text-[rgb(var(--text))] font-black text-sm">
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-[rgb(var(--text))]">{student.user?.lastName} {student.user?.firstName}</p>
                      <p className="text-xs font-medium text-[rgb(var(--muted))] mt-1">{student.studentIdNumber} • {student.faculty}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center w-full max-w-[200px]">
                        <div className="w-full bg-[rgb(var(--surface))] nm-inset-sm rounded-full h-2.5 mr-3">
                          <div className="bg-indigo-500 h-2.5 rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]" style={{ width: `${student.priorityScore}%` }}></div>
                        </div>
                        <span className="text-sm font-mono font-bold text-indigo-500">{student.priorityScore.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <div title={`Хронотип: ${student.clusteringVector?.chronotype}`} className="w-8 h-8 rounded-lg nm-inset-sm bg-[rgb(var(--surface))] text-blue-500 flex items-center justify-center text-xs font-bold border border-blue-500/20">{student.clusteringVector?.chronotype}</div>
                        <div title={`Соціалізація: ${student.clusteringVector?.sociability}`} className="w-8 h-8 rounded-lg nm-inset-sm bg-[rgb(var(--surface))] text-purple-500 flex items-center justify-center text-xs font-bold border border-purple-500/20">{student.clusteringVector?.sociability}</div>
                        <div title={`Шум: ${student.clusteringVector?.noiseTolerance}`} className="w-8 h-8 rounded-lg nm-inset-sm bg-[rgb(var(--surface))] text-orange-500 flex items-center justify-center text-xs font-bold border border-orange-500/20">{student.clusteringVector?.noiseTolerance}</div>
                        <div title={`Чистота: ${student.clusteringVector?.cleanliness}`} className="w-8 h-8 rounded-lg nm-inset-sm bg-[rgb(var(--surface))] text-teal-500 flex items-center justify-center text-xs font-bold border border-teal-500/20">{student.clusteringVector?.cleanliness}</div>
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
ssName="w-8 h-8 rounded-lg nm-inset-sm bg-[rgb(var(--surface))] text-purple-500 flex items-center justify-center text-xs font-bold border border-purple-500/20">{student.clusteringVector?.sociability}</div>
                        <div title={`Шум: ${student.clusteringVector?.noiseTolerance}`} className="w-8 h-8 rounded-lg nm-inset-sm bg-[rgb(var(--surface))] text-orange-500 flex items-center justify-center text-xs font-bold border border-orange-500/20">{student.clusteringVector?.noiseTolerance}</div>
                        <div title={`Чистота: ${student.clusteringVector?.cleanliness}`} className="w-8 h-8 rounded-lg nm-inset-sm bg-[rgb(var(--surface))] text-teal-500 flex items-center justify-center text-xs font-bold border border-teal-500/20">{student.clusteringVector?.cleanliness}</div>
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
