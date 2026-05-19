import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { BarChart3, Users, Home, TrendingUp, AlertCircle } from 'lucide-react';

interface Analytics {
  occupancy: { name: string; totalCapacity: number; currentOccupancy: number }[];
  clusters: { clusterId: number; count: number }[];
  complaints: { status: string; count: number }[];
  averageRating: number;
}

const AnalyticsDashboard: React.FC = () => {
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

  if (loading || !data) {
    return <div className="p-8 text-center text-gray-500">Завантаження аналітики...</div>;
  }

  const totalCapacity = data.occupancy.reduce((acc, curr) => acc + curr.totalCapacity, 0);
  const currentOccupancy = data.occupancy.reduce((acc, curr) => acc + curr.currentOccupancy, 0);
  const occupancyPercentage = totalCapacity ? Math.round((currentOccupancy / totalCapacity) * 100) : 0;

  const totalComplaints = data.complaints.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Аналітика та Статистика</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Всього поселено</p>
            <p className="text-2xl font-bold text-gray-900">{currentOccupancy}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center">
          <div className="p-3 rounded-full bg-indigo-100 text-indigo-600 mr-4">
            <Home className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Заповненість фонду</p>
            <p className="text-2xl font-bold text-gray-900">{occupancyPercentage}%</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center">
          <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Середній рейтинг</p>
            <p className="text-2xl font-bold text-gray-900">{data.averageRating.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center">
          <div className="p-3 rounded-full bg-red-100 text-red-600 mr-4">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Скарги (всього)</p>
            <p className="text-2xl font-bold text-gray-900">{totalComplaints}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Occupancy by Dormitory */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><BarChart3 className="h-5 w-5 mr-2 text-gray-500" /> Заповненість по гуртожитках</h2>
          <div className="space-y-4">
            {data.occupancy.map((dorm) => {
              const percent = dorm.totalCapacity ? Math.round((dorm.currentOccupancy / dorm.totalCapacity) * 100) : 0;
              return (
                <div key={dorm.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{dorm.name}</span>
                    <span className="text-gray-500">{dorm.currentOccupancy} / {dorm.totalCapacity} ({percent}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full ${percent > 90 ? 'bg-red-500' : percent > 75 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cluster Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><Users className="h-5 w-5 mr-2 text-gray-500" /> Психотипи (K-Means Кластери)</h2>
          <div className="space-y-4">
            {data.clusters.map((cluster) => {
              const clusterNames = ['Сови (Інтроверти)', 'Жайворонки (Екстраверти)', 'Збалансовані', 'Любителі тиші', 'Толерантні до шуму'];
              const name = clusterNames[cluster.clusterId] || `Кластер ${cluster.clusterId}`;
              const totalStudents = data.clusters.reduce((acc, curr) => acc + curr.count, 0);
              const percent = totalStudents ? Math.round((cluster.count / totalStudents) * 100) : 0;
              
              return (
                <div key={cluster.clusterId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{name}</span>
                    <span className="text-gray-500">{cluster.count} чол. ({percent}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${percent}%` }}></div>
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