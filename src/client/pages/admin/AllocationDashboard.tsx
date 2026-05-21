import React, { useState, useEffect } from 'react';
import { Play, Loader2, Users, FileCheck, CheckCircle2, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { StudentProfile } from '../../types';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useTheme } from '../../components/ThemeProvider';

interface AllocationResult {
  roomId: string;
  roomNumber: string;
  capacity: number;
  currentOccupancy?: number;
  students: StudentProfile[];
  compatibilityScore: number;
}

export const AllocationDashboard: React.FC = () => {
  const { theme } = useTheme();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [results, setResults] = useState<AllocationResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Progress state
  const [isRunningAlgorithm, setIsRunningAlgorithm] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');

  useEffect(() => {
    fetchAllocationPool();
  }, []);

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
    }, 1500); // Simulate heavy computation
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

  const baseColor = theme === 'dark' ? '#1f2937' : '#e5e7eb';
  const highlightColor = theme === 'dark' ? '#374151' : '#f3f4f6';

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <Skeleton height={28} width={280} baseColor={baseColor} highlightColor={highlightColor} />
        <Skeleton height={220} baseColor={baseColor} highlightColor={highlightColor} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <header className="mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Дашборд розподілу (AHP + K-means)</h1>
          <p className="text-gray-500 dark:text-gray-400">Автоматизований підбір ідеальних сусідів на основі психометрики</p>
        </div>
        {!results && !isRunningAlgorithm && (
          <button 
            onClick={runAlgorithm}
            className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors font-bold shadow-lg shadow-indigo-200/60 dark:shadow-indigo-900/30"
          >
            <Play className="w-5 h-5 mr-2" />
            Запустити кластеризацію
          </button>
        )}
      </header>

      {/* Progress Bar Overlay / Section */}
      {isRunningAlgorithm && (
        <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-lg shadow-sm border border-indigo-100 dark:border-indigo-900/40 mb-6 animate-pulse transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-200 flex items-center">
              <Loader2 className="w-5 h-5 mr-3 animate-spin text-indigo-600 dark:text-indigo-400" />
              Робота AI алгоритму
            </h3>
            <span className="text-indigo-600 dark:text-indigo-300 font-mono font-bold">{progress}%</span>
          </div>
          <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-500 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite]"></div>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{progressStatus}</p>
        </div>
      )}

      {/* Results View */}
      {results && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800/50 transition-colors">
            <div className="flex items-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400 mr-4" />
              <div>
                <h3 className="text-lg font-bold text-green-900 dark:text-green-200">Розподіл завершено</h3>
                <p className="text-sm text-green-700 dark:text-green-300">Згенеровано попередній план поселення. Перевірте результати.</p>
              </div>
            </div>
            <button 
              onClick={confirmAllocation}
              disabled={isConfirming}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-400 transition-colors font-bold shadow-sm disabled:opacity-60"
            >
              <FileCheck className="w-5 h-5 mr-2" />
              {isConfirming ? 'Затвердження...' : 'Затвердити наказ'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {results.map(result => (
              <div key={result.roomId} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4 border-b border-gray-100 dark:border-gray-700 pb-4">
                  <div>
                    <h4 className="font-bold text-xl text-gray-900 dark:text-white">Кімната {result.roomNumber}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Місткість: {result.capacity} місця</p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Сумісність: {result.compatibilityScore}%
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {result.students.map((st, idx) => (
                    <div key={st.id} className="flex items-center bg-gray-50 dark:bg-gray-700/60 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-200 mr-3">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{st.user?.lastName} {st.user?.firstName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-0.5">
                          AHP Score: <span className="font-mono text-indigo-600 dark:text-indigo-300 ml-1">{st.priorityScore.toFixed(1)}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                  {/* Empty beds placeholders */}
                  {Array.from({ length: Math.max(0, result.capacity - (result.currentOccupancy || 0) - result.students.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex items-center border-2 border-dashed border-gray-200 dark:border-gray-700 bg-transparent p-3 rounded-lg opacity-50">
                      <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center mr-3"></div>
                      <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">Вільне місце</span>
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center">
            <Users className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
            <h3 className="font-bold text-gray-700 dark:text-gray-200">Пул студентів, готових до розподілу (Сортування за AHP пріоритетом)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Рейтинг</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Студент</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">AHP Score (Пріоритет)</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">AI Вектор (Психометрика)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {students.map((student, index) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-sm">
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{student.user?.lastName} {student.user?.firstName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{student.studentIdNumber} • {student.faculty}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-full max-w-[100px] bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                          <div className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full" style={{ width: `${student.priorityScore}%` }}></div>
                        </div>
                        <span className="text-sm font-mono font-bold text-indigo-700 dark:text-indigo-300">{student.priorityScore.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-1">
                        <div title={`Хронотип: ${student.clusteringVector?.chronotype}`} className="w-6 h-6 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 flex items-center justify-center text-xs font-bold">{student.clusteringVector?.chronotype}</div>
                        <div title={`Соціалізація: ${student.clusteringVector?.sociability}`} className="w-6 h-6 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 flex items-center justify-center text-xs font-bold">{student.clusteringVector?.sociability}</div>
                        <div title={`Шум: ${student.clusteringVector?.noiseTolerance}`} className="w-6 h-6 rounded bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 flex items-center justify-center text-xs font-bold">{student.clusteringVector?.noiseTolerance}</div>
                        <div title={`Чистота: ${student.clusteringVector?.cleanliness}`} className="w-6 h-6 rounded bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 flex items-center justify-center text-xs font-bold">{student.clusteringVector?.cleanliness}</div>
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
