import React, { useState, useEffect } from 'react';
import { Play, Loader2, Users, FileCheck, CheckCircle2, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { StudentProfile } from '../../types';

interface AllocationResult {
  roomId: string;
  roomNumber: string;
  capacity: number;
  students: StudentProfile[];
  compatibilityScore: number;
}

export const AllocationDashboard: React.FC = () => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [results, setResults] = useState<AllocationResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Progress state
  const [isRunningAlgorithm, setIsRunningAlgorithm] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');

  useEffect(() => {
    fetchAllocationPool();
  }, []);

  const fetchAllocationPool = async () => {
    try {
      // Mock data for compilation
      const mockStudents: StudentProfile[] = [
        {
          id: 's1', userId: 'u1', studentIdNumber: 'KB-001', course: 1, faculty: 'FI', priorityScore: 95.5,
          privilegeCategoryId: 'id_orphans', clusteringVector: { chronotype: 8, sociability: 2, noiseTolerance: 1, cleanliness: 9 }, groupId: null,
          user: { id: 'u1', email: '', role: 'STUDENT', firstName: 'Іван', lastName: 'Петренко', createdAt: '', updatedAt: '' }
        },
        {
          id: 's2', userId: 'u2', studentIdNumber: 'KB-002', course: 2, faculty: 'FI', priorityScore: 60.2,
          privilegeCategoryId: null, clusteringVector: { chronotype: 7, sociability: 3, noiseTolerance: 2, cleanliness: 8 }, groupId: null,
          user: { id: 'u2', email: '', role: 'STUDENT', firstName: 'Максим', lastName: 'Коваль', createdAt: '', updatedAt: '' }
        },
        {
          id: 's3', userId: 'u3', studentIdNumber: 'KB-003', course: 3, faculty: 'FEM', priorityScore: 45.0,
          privilegeCategoryId: null, clusteringVector: { chronotype: 2, sociability: 9, noiseTolerance: 8, cleanliness: 3 }, groupId: null,
          user: { id: 'u3', email: '', role: 'STUDENT', firstName: 'Олег', lastName: 'Сидорчук', createdAt: '', updatedAt: '' }
        }
      ];
      // Sort by AHP Priority Score descending
      setStudents(mockStudents.sort((a, b) => b.priorityScore - a.priorityScore));
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

    // Simulate K-means algorithm execution steps
    const steps = [
      { p: 20, text: 'Розрахунок матриці відстаней...' },
      { p: 40, text: 'Групування за ко-лівінг рефералами...' },
      { p: 60, text: 'Оптимізація K-means кластерів...' },
      { p: 80, text: 'Валідація AHP пріоритетів...' },
      { p: 100, text: 'Формування результатів розподілу...' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].p);
        setProgressStatus(steps[currentStep].text);
        currentStep++;
      } else {
        clearInterval(interval);
        finishAlgorithm();
      }
    }, 1500); // Simulate heavy computation
  };

  const finishAlgorithm = () => {
    setIsRunningAlgorithm(false);
    
    // Mock results
    setResults([
      {
        roomId: 'r1',
        roomNumber: '101',
        capacity: 2,
        compatibilityScore: 92.5,
        students: [students[0], students[1]] // Highly compatible based on vectors
      },
      {
        roomId: 'r2',
        roomNumber: '102',
        capacity: 2,
        compatibilityScore: 45.0,
        students: [students[2]] // Alone for now
      }
    ]);
    
    toast.success('Алгоритм успішно завершив роботу!');
  };

  const confirmAllocation = async () => {
    try {
      // await api.post('/admin/allocation/confirm', { results });
      toast.success('Наказ на поселення успішно згенеровано!');
      setResults(null);
      fetchAllocationPool(); // Refresh pool
    } catch (error) {
      toast.error('Помилка при збереженні розподілу');
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Завантаження...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Дашборд розподілу (AHP + K-means)</h1>
          <p className="text-gray-500">Автоматизований підбір ідеальних сусідів на основі психометрики</p>
        </div>
        {!results && !isRunningAlgorithm && (
          <button 
            onClick={runAlgorithm}
            className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold shadow-lg shadow-indigo-200"
          >
            <Play className="w-5 h-5 mr-2" />
            Запустити кластеризацію
          </button>
        )}
      </header>

      {/* Progress Bar Overlay / Section */}
      {isRunningAlgorithm && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-indigo-100 mb-6 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-indigo-900 flex items-center">
              <Loader2 className="w-5 h-5 mr-3 animate-spin text-indigo-600" />
              Робота AI алгоритму
            </h3>
            <span className="text-indigo-600 font-mono font-bold">{progress}%</span>
          </div>
          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-indigo-600 transition-all duration-500 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite]"></div>
            </div>
          </div>
          <p className="text-sm text-gray-500 text-center">{progressStatus}</p>
        </div>
      )}

      {/* Results View */}
      {results && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center bg-green-50 p-4 rounded-xl border border-green-200">
            <div className="flex items-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 mr-4" />
              <div>
                <h3 className="text-lg font-bold text-green-900">Розподіл завершено</h3>
                <p className="text-sm text-green-700">Згенеровано попередній план поселення. Перевірте результати.</p>
              </div>
            </div>
            <button 
              onClick={confirmAllocation}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold shadow-sm"
            >
              <FileCheck className="w-5 h-5 mr-2" />
              Затвердити наказ
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map(result => (
              <div key={result.roomId} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-4">
                  <div>
                    <h4 className="font-bold text-xl text-gray-900">Кімната {result.roomNumber}</h4>
                    <p className="text-xs text-gray-500 mt-1">Місткість: {result.capacity} місця</p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Сумісність: {result.compatibilityScore}%
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {result.students.map((st, idx) => (
                    <div key={st.id} className="flex items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-700 mr-3">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{st.user?.lastName} {st.user?.firstName}</p>
                        <p className="text-xs text-gray-500 flex items-center mt-0.5">
                          AHP Score: <span className="font-mono text-indigo-600 ml-1">{st.priorityScore.toFixed(1)}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                  {/* Empty beds placeholders */}
                  {Array.from({ length: result.capacity - result.students.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex items-center border-2 border-dashed border-gray-200 bg-transparent p-3 rounded-lg opacity-50">
                      <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center mr-3"></div>
                      <span className="text-sm text-gray-400 font-medium">Вільне місце</span>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center">
            <Users className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="font-bold text-gray-700">Пул студентів, готових до розподілу (Сортування за AHP пріоритетом)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Рейтинг</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Студент</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">AHP Score (Пріоритет)</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Вектор (Психометрика)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student, index) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-800 font-bold text-sm">
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900">{student.user?.lastName} {student.user?.firstName}</p>
                      <p className="text-xs text-gray-500">{student.studentIdNumber} • {student.faculty}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-full max-w-[100px] bg-gray-200 rounded-full h-2 mr-2">
                          <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${student.priorityScore}%` }}></div>
                        </div>
                        <span className="text-sm font-mono font-bold text-indigo-700">{student.priorityScore.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-1">
                        <div title={`Хронотип: ${student.clusteringVector?.chronotype}`} className="w-6 h-6 rounded bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">{student.clusteringVector?.chronotype}</div>
                        <div title={`Соціалізація: ${student.clusteringVector?.sociability}`} className="w-6 h-6 rounded bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-bold">{student.clusteringVector?.sociability}</div>
                        <div title={`Шум: ${student.clusteringVector?.noiseTolerance}`} className="w-6 h-6 rounded bg-orange-100 text-orange-800 flex items-center justify-center text-xs font-bold">{student.clusteringVector?.noiseTolerance}</div>
                        <div title={`Чистота: ${student.clusteringVector?.cleanliness}`} className="w-6 h-6 rounded bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold">{student.clusteringVector?.cleanliness}</div>
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
