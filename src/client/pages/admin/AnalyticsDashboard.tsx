import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { BarChart3, Users, Home, TrendingUp, AlertCircle } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import styles from './AnalyticsDashboard.module.css';

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
      <div className={styles.loadingContainer}>
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
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Аналітика та Статистика</h1>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.kpiIconWrapperBlue}`}>
            <Users className={styles.kpiIcon} />
          </div>
          <div>
            <p className={styles.kpiLabel}>Всього поселено</p>
            <p className={styles.kpiValue}>{currentOccupancy}</p>
          </div>
        </div>
        
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.kpiIconWrapperIndigo}`}>
            <Home className={styles.kpiIcon} />
          </div>
          <div>
            <p className={styles.kpiLabel}>Заповненість</p>
            <p className={styles.kpiValue}>{occupancyPercentage}%</p>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.kpiIconWrapperYellow}`}>
            <TrendingUp className={styles.kpiIcon} />
          </div>
          <div>
            <p className={styles.kpiLabel}>Середній рейтинг</p>
            <p className={styles.kpiValue}>{data.averageRating.toFixed(2)}</p>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.kpiIconWrapperRed}`}>
            <AlertCircle className={styles.kpiIcon} />
          </div>
          <div>
            <p className={styles.kpiLabel}>Скарги</p>
            <p className={styles.kpiValue}>{totalComplaints}</p>
          </div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        {/* Occupancy by Dormitory */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>
            <BarChart3 className={styles.chartIcon} /> 
            Заповненість по гуртожитках
          </h2>
          <div className={styles.chartList}>
            {data.occupancy.map((dorm) => {
              const percent = dorm.totalCapacity ? Math.round((dorm.currentOccupancy / dorm.totalCapacity) * 100) : 0;
              return (
                <div key={dorm.name}>
                  <div className={styles.chartItemHeader}>
                    <span className={styles.chartItemName}>{dorm.name}</span>
                    <span className={styles.chartItemValue}>{dorm.currentOccupancy} / {dorm.totalCapacity} ({percent}%)</span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div 
                      className={`${styles.progressBarFill} ${percent > 90 ? styles.fillRed : percent > 75 ? styles.fillYellow : styles.fillGreen}`} 
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cluster Distribution */}
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>
            <Users className={styles.chartIcon} /> 
            Психотипи (K-Means Кластери)
          </h2>
          <div className={styles.chartList}>
            {data.clusters.map((cluster) => {
              const clusterNames = ['Сови (Інтроверти)', 'Жайворонки (Екстраверти)', 'Збалансовані', 'Любителі тиші', 'Толерантні до шуму'];
              const name = clusterNames[cluster.clusterId] || `Кластер ${cluster.clusterId}`;
              const totalStudents = data.clusters.reduce((acc, curr) => acc + curr.count, 0);
              const percent = totalStudents ? Math.round((cluster.count / totalStudents) * 100) : 0;
              
              return (
                <div key={cluster.clusterId}>
                  <div className={styles.chartItemHeader}>
                    <span className={styles.chartItemName}>{name}</span>
                    <span className={styles.chartItemValue}>{cluster.count} чол. ({percent}%)</span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div 
                      className={`${styles.progressBarFill} ${styles.fillAccent}`} 
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