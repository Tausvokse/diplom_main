import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { BarChart3, Users, Home, TrendingUp, AlertCircle } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

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
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <Skeleton height={28} width={240} />
        <Skeleton height={200} />
      </div>
    );
  }

  const totalCapacity = data.occupancy.reduce((acc, curr) => acc + curr.totalCapacity, 0);
  const currentOccupancy = data.occupancy.reduce((acc, curr) => acc + curr.currentOccupancy, 0);
  const occupancyPercentage = totalCapacity ? Math.round((currentOccupancy / totalCapacity) * 100) : 0;

  const totalComplaints = data.complaints.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-[rgb(var(--text))] tracking-tight">Аналітика та Статистика</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="ui-card p-6 flex items-center">
          <div className="p-3 rounded-2xl nm-inset-sm bg-[rgb(var(--surface-2))] text-blue-500 mr-4 flex-shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider ui-muted mb-1">Всього поселено</p>
            <p className="text-2xl font-black text-[rgb(var(--text))]">{currentOccupancy}</p>
          </div>
        </div>
        
        <div className="ui-card p-6 flex items-center">
          <div className="p-3 rounded-2xl nm-inset-sm bg-[rgb(var(--surface-2))] text-indigo-500 mr-4 flex-shrink-0">
            <Home className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider ui-muted mb-1">Заповненість</p>
            <p className="text-2xl font-black text-[rgb(var(--text))]">{occupancyPercentage}%</p>
          </div>
        </div>

        <div className="ui-card p-6 flex items-center">
          <div className="p-3 rounded-2xl nm-inset-sm bg-[rgb(var(--surface-2))] text-yellow-500 mr-4 flex-shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider ui-muted mb-1">Середній рейтинг</p>
            <p className="text-2xl font-black text-[rgb(var(--text))]">{data.averageRating.toFixed(2)}</p>
          </div>
        </div>

        <div className="ui-card p-6 flex items-center">
          <div className="p-3 rounded-2xl nm-inset-sm bg-[rgb(var(--surface-2))] text-red-500 mr-4 flex-shrink-0">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider ui-muted mb-1">Скарги</p>
            <p className="text-2xl font-black text-[rgb(var(--text))]">{totalComplaints}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Occupancy by Dormitory */}
        <div className="ui-card p-6 md:p-8">
          <h2 className="text-xl font-bold text-[rgb(var(--text))] mb-6 flex items-center">
            <BarChart3 className="h-5 w-5 mr-3 text-[rgb(var(--accent))]" /> 
            Заповненість по гуртожитках
          </h2>
          <div className="space-y-6">
            {data.occupancy.map((dorm) => {
              const percent = dorm.totalCapacity ? Math.round((dorm.currentOccupancy / dorm.totalCapacity) * 100) : 0;
              return (
                <div key={dorm.name}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-bold text-[rgb(var(--text))]">{dorm.name}</span>
                    <span className="font-medium ui-muted">{dorm.currentOccupancy} / {dorm.totalCapacity} ({percent}%)</span>
                  </div>
                  <div className="w-full bg-[rgb(var(--surface-2))] nm-inset rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] ${percent > 90 ? 'bg-red-500' : percent > 75 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cluster Distribution */}
        <div className="ui-card p-6 md:p-8">
          <h2 className="text-xl font-bold text-[rgb(var(--text))] mb-6 flex items-center">
            <Users className="h-5 w-5 mr-3 text-[rgb(var(--accent))]" /> 
            Психотипи (K-Means Кластери)
          </h2>
          <div className="space-y-6">
            {data.clusters.map((cluster) => {
              const clusterNames = ['Сови (Інтроверти)', 'Жайворонки (Екстраверти)', 'Збалансовані', 'Любителі тиші', 'Толерантні до шуму'];
              const name = clusterNames[cluster.clusterId] || `Кластер ${cluster.clusterId}`;
              const totalStudents = data.clusters.reduce((acc, curr) => acc + curr.count, 0);
              const percent = totalStudents ? Math.round((cluster.count / totalStudents) * 100) : 0;
              
              return (
                <div key={cluster.clusterId}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-bold text-[rgb(var(--text))]">{name}</span>
                    <span className="font-medium ui-muted">{cluster.count} чол. ({percent}%)</span>
                  </div>
                  <div className="w-full bg-[rgb(var(--surface-2))] nm-inset rounded-full h-3">
                    <div 
                      className="h-3 rounded-full bg-[rgb(var(--accent))] shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)]" 
                      style={{ width: `${percent}%` }}
                    ></div>
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