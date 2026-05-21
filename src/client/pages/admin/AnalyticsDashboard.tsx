import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { BarChart3, Users, Home, TrendingUp, AlertCircle } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useTheme } from '../../components/ThemeProvider';

interface Analytics {
  occupancy: { name: string; totalCapacity: number; currentOccupancy: number }[];
  clusters: { clusterId: number; count: number }[];
  complaints: { status: string; count: number }[];
  averageRating: number;
  faculties: { faculty: string; count: number }[];
  payments: { status: string; count: number }[];
  roomStatuses: { status: string; count: number }[];
}

const AnalyticsDashboard: React.FC = () => {
  const { theme } = useTheme();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/admin/analytics');
      setData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const baseColor = theme === 'dark' ? '#1f2937' : '#e5e7eb';
  const highlightColor = theme === 'dark' ? '#374151' : '#f3f4f6';

  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <Skeleton height={28} width={240} baseColor={baseColor} highlightColor={highlightColor} />
        <Skeleton height={200} baseColor={baseColor} highlightColor={highlightColor} />
      </div>
    );
  }

  const totalCapacity = data.occupancy.reduce((acc, curr) => acc + curr.totalCapacity, 0);
  const currentOccupancy = data.occupancy.reduce((acc, curr) => acc + curr.currentOccupancy, 0);
  const occupancyPercentage = totalCapacity ? Math.round((currentOccupancy / totalCapacity) * 100) : 0;

  const totalComplaints = data.complaints.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Аналітика та Статистика</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center transition-colors">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mr-4">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Всього поселено</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{currentOccupancy}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center transition-colors">
          <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mr-4">
            <Home className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Заповненість фонду</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{occupancyPercentage}%</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center transition-colors">
          <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 mr-4">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Середній рейтинг</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.averageRating.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center transition-colors">
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mr-4">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Скарги (всього)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalComplaints}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Occupancy by Dormitory */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center"><BarChart3 className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" /> Заповненість по гуртожитках</h2>
          <div className="space-y-4">
            {data.occupancy.map((dorm) => {
              const percent = dorm.totalCapacity ? Math.round((dorm.currentOccupancy / dorm.totalCapacity) * 100) : 0;
              return (
                <div key={dorm.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-200">{dorm.name}</span>
                    <span className="text-gray-500 dark:text-gray-400">{dorm.currentOccupancy} / {dorm.totalCapacity} ({percent}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className={`h-2 rounded-full ${percent > 90 ? 'bg-red-500' : percent > 75 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cluster Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center"><Users className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" /> Психотипи (K-Means Кластери)</h2>
          <div className="space-y-4">
            {data.clusters.map((cluster) => {
              const clusterNames = ['Сови (Інтроверти)', 'Жайворонки (Екстраверти)', 'Збалансовані', 'Любителі тиші', 'Толерантні до шуму'];
              const name = clusterNames[cluster.clusterId] || `Кластер ${cluster.clusterId}`;
              const totalStudents = data.clusters.reduce((acc, curr) => acc + curr.count, 0);
              const percent = totalStudents ? Math.round((cluster.count / totalStudents) * 100) : 0;
              
              return (
                <div key={cluster.clusterId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-200">{name}</span>
                    <span className="text-gray-500 dark:text-gray-400">{cluster.count} чол. ({percent}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="h-2 rounded-full bg-blue-500 dark:bg-blue-400" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;