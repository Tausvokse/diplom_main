import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Building, Layers, DoorOpen, Check, Edit2, Users, UserMinus, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Dormitory, Room, RoomStatus } from '../../types';
import { api } from '../../services/api';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import styles from './DormitoryManager.module.css';

interface AllocationCandidate {
  id: string;
  fullName: string;
  studentIdNumber: string;
  faculty: string;
  course: number;
  priorityScore: number;
}

export const DormitoryManager: React.FC = () => {
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<RoomStatus>('AVAILABLE');
  
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomStudents, setRoomStudents] = useState<any[]>([]);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [allocationPool, setAllocationPool] = useState<AllocationCandidate[]>([]);
  const [poolSearch, setPoolSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isAllocating, setIsAllocating] = useState(false);
  const [isPoolLoading, setIsPoolLoading] = useState(false);

  useEffect(() => {
    fetchDormitories();
  }, []);

  const fetchDormitories = async () => {
    try {
      const res = await api.get('/admin/dormitories');
      const sortedDormitories = res.data.sort((a: Dormitory, b: Dormitory) => 
        a.name.localeCompare(b.name, 'uk', { numeric: true })
      );
      setDormitories(sortedDormitories);
    } catch (error) {
      toast.error('Помилка завантаження структури гуртожитків');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllocationPool = async () => {
    setIsPoolLoading(true);
    try {
      const res = await api.get('/admin/allocation/pool');
      setAllocationPool(res.data);
    } catch (error) {
      toast.error('Не вдалося завантажити пул студентів');
    } finally {
      setIsPoolLoading(false);
    }
  };

  const fetchRoomStudents = async (roomId: string) => {
    setIsModalLoading(true);
    try {
      const res = await api.get(`/admin/rooms/${roomId}/students`);
      setRoomStudents(res.data);
    } catch (error) {
      toast.error('Не вдалося завантажити мешканців кімнати');
    } finally {
      setIsModalLoading(false);
    }
  };

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteRoom = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    if (!window.confirm('Ви впевнені, що хочете видалити цю кімнату?')) return;
    try {
      await api.delete(`/admin/rooms/${roomId}`);
      toast.success('Кімнату видалено');
      await fetchDormitories();
    } catch {
      toast.error('Помилка при видаленні кімнати');
    }
  };

  const startEditingRoom = (e: React.MouseEvent, room: Room) => {
    e.stopPropagation();
    setEditingRoomId(room.id);
    setSelectedStatus(room.status);
  };

  const saveRoomStatus = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    try {
      await api.patch(`/admin/rooms/${roomId}/status`, { status: selectedStatus });
      
      setDormitories(prev => prev.map(dorm => ({
        ...dorm,
        floors: dorm.floors.map(floor => ({
          ...floor,
          rooms: floor.rooms.map(room => room.id === roomId ? { ...room, status: selectedStatus } : room)
        }))
      })));
      
      toast.success('Статус кімнати оновлено');
      setEditingRoomId(null);
      if (selectedRoom?.id === roomId) {
        setSelectedRoom({ ...selectedRoom, status: selectedStatus });
      }
    } catch (error) {
      toast.error('Помилка оновлення статусу');
    }
  };

  const openRoomDetails = async (room: Room) => {
    setSelectedRoom(room);
    setSelectedStudentId('');
    setPoolSearch('');
    setIsRoomModalOpen(true);
    await Promise.all([fetchRoomStudents(room.id), fetchAllocationPool()]);
  };

  const evictStudent = async (studentId: string) => {
    if (!window.confirm('Ви впевнені, що хочете виселити цього студента з кімнати?')) return;
    try {
      const res = await api.post(`/admin/allocation/evict`, { studentId });
      toast.success('Студента виселено');
      setRoomStudents(prev => prev.filter(s => s.id !== studentId));
      if (res.data.room) {
        setSelectedRoom(prev => prev && prev.id === res.data.room.id ? {
          ...prev,
          currentOccupancy: res.data.room.currentOccupancy,
          status: res.data.room.status
        } : prev);
      }
      await fetchDormitories();
      await fetchAllocationPool();
    } catch (error) {
      toast.error('Помилка при виселенні');
    }
  };

  const handleAllocateStudent = async () => {
    if (!selectedRoom) return;
    if (!selectedStudentId) {
      toast.error('Оберіть студента для поселення');
      return;
    }
    setIsAllocating(true);
    const studentId = selectedStudentId;
    try {
      const res = await api.post(`/admin/rooms/${selectedRoom.id}/allocate`, { studentId });
      toast.success('Студента заселено');
      setSelectedStudentId('');
      await fetchRoomStudents(selectedRoom.id);
      await fetchDormitories();
      if (res.data.room) {
        setSelectedRoom(prev => prev ? {
          ...prev,
          currentOccupancy: res.data.room.currentOccupancy,
          status: res.data.room.status
        } : prev);
      }
      setAllocationPool((prev) => prev.filter((s) => s.id !== studentId));
    } catch (error) {
      console.error(error);
    } finally {
      setIsAllocating(false);
    }
  };

  const getStatusBadge = (status: RoomStatus) => {
    const config = {
      AVAILABLE: { color: styles.statusGreen, label: 'Доступна' },
      FULL: { color: styles.statusRed, label: 'Заповнена' },
      MAINTENANCE: { color: styles.statusYellow, label: 'Ремонт' }
    };
    const c = config[status];
    return <span className={`${styles.statusBadge} ${c.color}`}>{c.label}</span>;
  };

  const availableSeats = selectedRoom ? Math.max(0, selectedRoom.capacity - selectedRoom.currentOccupancy) : 0;
  const isRoomAssignable = selectedRoom ? selectedRoom.status !== 'MAINTENANCE' && availableSeats > 0 : false;
  const filteredPool = allocationPool.filter((student) => {
    const query = poolSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      student.fullName.toLowerCase().includes(query) ||
      student.studentIdNumber.toLowerCase().includes(query) ||
      student.faculty.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Skeleton height={28} width={220} />
        <Skeleton height={240} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Управління фондом</h1>
          <p className={styles.pageSubtitle}>Візуальний конструктор та моніторинг стану кімнат</p>
        </div>
      </header>

      <div className={`ui-card ${styles.card}`}>
        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
        >
        {dormitories.map(dorm => (
          <motion.div 
            key={dorm.id} 
            className={styles.dormitoryItem}
            variants={{
              hidden: { opacity: 0, y: 15 },
              visible: { opacity: 1, y: 0 }
            }}
          >
            <div 
              className={styles.dormitoryHeader}
              onClick={() => toggleNode(dorm.id)}
            >
              <div className={styles.expandIconWrapper}>
                {expandedNodes.has(dorm.id) ? <ChevronDown className={styles.expandIcon} /> : <ChevronRight className={styles.expandIcon} />}
              </div>
              <div className={styles.dormIconWrapper}>
                <Building className={styles.dormIcon} />
              </div>
              <span className={styles.dormName}>{dorm.name}</span>
              <span className={`ui-pill nm-inset-sm ${styles.capacityBadge}`}>{dorm.totalCapacity} місць</span>
            </div>

            <AnimatePresence>
            {expandedNodes.has(dorm.id) && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={styles.floorsContainer}
              >
                {dorm.floors.map(floor => (
                  <div key={floor.id}>
                    <div 
                      className={styles.floorHeader}
                      onClick={() => toggleNode(floor.id)}
                    >
                      {expandedNodes.has(floor.id) ? <ChevronDown className={styles.floorExpandIcon} /> : <ChevronRight className={styles.floorExpandIcon} />}
                      <Layers className={styles.floorIcon} />
                      <span className={styles.floorName}>Поверх {floor.floorNumber}</span>
                      <span className={styles.floorCapacity}>{floor.rooms.reduce((acc, r) => acc + r.capacity, 0)} місць ({floor.rooms.length} кімнат)</span>
                    </div>

                    <AnimatePresence>
                    {expandedNodes.has(floor.id) && (
                      <motion.div 
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={{
                          hidden: { opacity: 0, height: 0 },
                          visible: { opacity: 1, height: 'auto', transition: { staggerChildren: 0.05 } }
                        }}
                        className={styles.roomsGrid}
                      >
                        {floor.rooms.map(room => (
                          <motion.div 
                            key={room.id} 
                            variants={{
                              hidden: { opacity: 0, scale: 0.95 },
                              visible: { opacity: 1, scale: 1 }
                            }}
                            onClick={() => openRoomDetails(room)}
                            className={`${styles.roomCard} ${room.currentOccupancy === 0 ? styles.roomEmpty : styles.roomOccupied}`}
                          >
                            <div className={styles.roomHeader}>
                              <div className={styles.flexCenter}>
                                <DoorOpen className={styles.roomIcon} />
                                <span className={styles.roomNumber}>{room.roomNumber}</span>
                              </div>
                              {editingRoomId === room.id ? (
                                <div onClick={e => e.stopPropagation()}>
                                  <select 
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value as RoomStatus)}
                                    className={`ui-input ${styles.statusSelect}`}
                                  >
                                    <option value="AVAILABLE">Доступна</option>
                                    <option value="FULL">Заповнена</option>
                                    <option value="MAINTENANCE">Ремонт</option>
                                  </select>
                                </div>
                              ) : (
                                getStatusBadge(room.status)
                              )}
                            </div>

                            <div className={styles.roomFooter}>
                              <div className={styles.occupancyBadge}>
                                <Users className={styles.occupancyIcon} />
                                <span className={styles.currentOccupancy}>{room.currentOccupancy}</span>
                                <span className={styles.totalOccupancy}>/ {room.capacity}</span>
                              </div>
                              
                              <div className={styles.actions}>
                                <button 
                                  onClick={(e) => handleDeleteRoom(e, room.id)}
                                  className={`${styles.btnAction} ${styles.btnDelete}`}
                                  title="Видалити кімнату"
                                >
                                  <span className="font-bold">&times;</span>
                                </button>
                                {editingRoomId === room.id ? (
                                  <button 
                                    onClick={(e) => saveRoomStatus(e, room.id)}
                                    className={`${styles.btnAction} ${styles.btnSave}`}
                                    title="Зберегти"
                                  >
                                    <Check className={styles.actionIcon} />
                                  </button>
                                ) : (
                                  <button 
                                    onClick={(e) => startEditingRoom(e, room)}
                                    className={`${styles.btnAction} ${styles.btnEdit}`}
                                    title="Змінити статус"
                                  >
                                    <Edit2 className={styles.actionIcon} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                    </AnimatePresence>
                  </div>
                ))}
              </motion.div>
            )}
            </AnimatePresence>
          </motion.div>
        ))}
        </motion.div>
      </div>
      {dormitories.length === 0 && (
          <div className={styles.emptyState}>
            Немає даних про гуртожитки. Переконайтесь, що ви запустили seed-скрипт.
          </div>
        )}
      {/* Room Details Modal */}
      {isRoomModalOpen && selectedRoom && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <div className={styles.modalIconWrapper}>
                  <DoorOpen className="w-5 h-5 text-[rgb(var(--accent))]" />
                </div>
                Деталі кімнати {selectedRoom.roomNumber}
              </h3>
              <button onClick={() => setIsRoomModalOpen(false)} className={styles.closeBtn}>
                <span className="sr-only">Закрити</span>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <p className={styles.statLabel}>Статус</p>
                  <div>{getStatusBadge(selectedRoom.status)}</div>
                </div>
                <div className={styles.statCard}>
                  <p className={styles.statLabel}>Заповненість</p>
                  <p className={styles.statValue}>{selectedRoom.currentOccupancy} <span className={styles.statSubValue}>з {selectedRoom.capacity}</span></p>
                </div>
              </div>

              <div className={styles.allocateSection}>
                <div className={styles.allocateHeader}>
                  <h4 className={styles.allocateTitle}>
                    <UserPlus className="w-5 h-5 mr-2 text-[rgb(var(--accent))]" /> Заселити студента
                  </h4>
                  <span className={styles.availableSeatsBadge}>Вільні місця: {availableSeats}</span>
                </div>
                
                <div className={styles.allocateGrid}>
                  <div className={styles.allocateCol5}>
                    <input
                      type="text"
                      placeholder="Пошук за ПІБ, квитком..."
                      value={poolSearch}
                      onChange={(e) => setPoolSearch(e.target.value)}
                      className={`ui-input ${styles.allocateInput}`}
                    />
                  </div>
                  <div className={styles.allocateCol5}>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      disabled={isPoolLoading || !isRoomAssignable}
                      className={`ui-input ${styles.allocateInput}`}
                    >
                      <option value="">{isPoolLoading ? 'Завантаження пулу...' : 'Оберіть студента'}</option>
                      {filteredPool.slice(0, 50).map(student => (
                        <option key={student.id} value={student.id}>
                          {student.fullName} • {student.faculty}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.allocateCol2}>
                    <button
                      onClick={handleAllocateStudent}
                      disabled={!isRoomAssignable || isAllocating || !selectedStudentId}
                      className={`ui-button ui-button-primary ${styles.btnAllocate}`}
                    >
                      {isAllocating ? '...' : 'Заселити'}
                    </button>
                  </div>
                </div>
                {!isRoomAssignable && (
                  <p className={styles.errorText}>
                    * Заселення недоступне: {selectedRoom.status === 'MAINTENANCE' ? 'кімната на ремонті' : 'немає вільних місць'}.
                  </p>
                )}
                {isRoomAssignable && !isPoolLoading && allocationPool.length === 0 && (
                  <p className={styles.warningText}>
                    * Пул студентів порожній або немає схвалених заяв.
                  </p>
                )}
              </div>

              <div>
                <h4 className={styles.studentsTitle}>
                  <Users className="w-5 h-5 mr-3 text-[rgb(var(--accent))]" /> Мешканці
                </h4>
                
                {isModalLoading ? (
                  <div className={styles.loadingText}>Завантаження...</div>
                ) : roomStudents.length === 0 ? (
                  <div className={styles.emptyStudents}>
                    Кімната порожня. Додайте студентів через систему розподілу.
                  </div>
                ) : (
                  <ul className={styles.studentsList}>
                    {roomStudents.map(student => (
                      <li key={student.id} className={styles.studentItem}>
                        <div className={styles.flexCenter}>
                          <div className={styles.studentAvatar}>
                            {student.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className={styles.studentName}>{student.fullName}</p>
                            <p className={styles.studentInfo}>{student.faculty}, {student.course} курс • {student.studentIdNumber}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => evictStudent(student.id)}
                          className={styles.btnEvict}
                          title="Виселити"
                        >
                          <UserMinus className="w-4 h-4 mr-2" />
                          <span className={styles.btnEvictText}>Виселити</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button
                onClick={() => setIsRoomModalOpen(false)}
                className={`ui-button ui-button-outline ${styles.btnClose}`}
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DormitoryManager;

