import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Building, Layers, DoorOpen, Check, Edit2, Users, UserMinus, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Dormitory, Room, RoomStatus } from '../../types';
import { api } from '../../services/api';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

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
      AVAILABLE: { color: 'text-green-500 bg-green-500/10', label: 'Доступна' },
      FULL: { color: 'text-red-500 bg-red-500/10', label: 'Заповнена' },
      MAINTENANCE: { color: 'text-yellow-500 bg-yellow-500/10', label: 'Ремонт' }
    };
    const c = config[status];
    return <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider nm-inset-sm ${c.color}`}>{c.label}</span>;
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <Skeleton height={28} width={220} />
        <Skeleton height={240} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[rgb(var(--text))] tracking-tight mb-2">Управління фондом</h1>
          <p className="ui-muted text-sm">Візуальний конструктор та моніторинг стану кімнат</p>
        </div>
      </header>

      <div className="ui-card p-6 md:p-8">
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
            className="mb-6 select-none"
            variants={{
              hidden: { opacity: 0, y: 15 },
              visible: { opacity: 1, y: 0 }
            }}
          >
            <div 
              className="flex items-center p-4 nm-flat bg-[rgb(var(--surface))] rounded-2xl cursor-pointer hover:nm-inset-sm transition-all"
              onClick={() => toggleNode(dorm.id)}
            >
              <div className="w-8 h-8 flex items-center justify-center mr-2">
                {expandedNodes.has(dorm.id) ? <ChevronDown className="w-5 h-5 text-[rgb(var(--muted))]" /> : <ChevronRight className="w-5 h-5 text-[rgb(var(--muted))]" />}
              </div>
              <div className="w-10 h-10 rounded-xl nm-inset-sm bg-[rgb(var(--surface-2))] flex items-center justify-center mr-4">
                <Building className="w-5 h-5 text-[rgb(var(--accent))]" />
              </div>
              <span className="font-bold text-lg text-[rgb(var(--text))]">{dorm.name}</span>
              <span className="ml-auto text-xs font-bold uppercase tracking-wider ui-pill nm-inset-sm">{dorm.totalCapacity} місць</span>
            </div>

            <AnimatePresence>
            {expandedNodes.has(dorm.id) && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="ml-12 mt-4 space-y-4 border-l-2 border-[rgb(var(--border)/0.2)] pl-6 overflow-hidden"
              >
                {dorm.floors.map(floor => (
                  <div key={floor.id}>
                    <div 
                      className="flex items-center p-3 rounded-xl cursor-pointer hover:bg-[rgb(var(--surface-2))] transition-colors"
                      onClick={() => toggleNode(floor.id)}
                    >
                      {expandedNodes.has(floor.id) ? <ChevronDown className="w-4 h-4 text-[rgb(var(--muted))] mr-3" /> : <ChevronRight className="w-4 h-4 text-[rgb(var(--muted))] mr-3" />}
                      <Layers className="w-4 h-4 text-blue-500 mr-3" />
                      <span className="font-bold text-[rgb(var(--text))]">Поверх {floor.floorNumber}</span>
                      <span className="ml-auto text-xs font-medium ui-muted">{floor.rooms.reduce((acc, r) => acc + r.capacity, 0)} місць ({floor.rooms.length} кімнат)</span>
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
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-4 pl-4 overflow-hidden"
                      >
                        {floor.rooms.map(room => (
                          <motion.div 
                            key={room.id} 
                            variants={{
                              hidden: { opacity: 0, scale: 0.95 },
                              visible: { opacity: 1, scale: 1 }
                            }}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => openRoomDetails(room)}
                            className="nm-flat bg-[rgb(var(--surface))] rounded-2xl p-5 transition-all cursor-pointer flex flex-col justify-between min-h-[140px]"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center">
                                <DoorOpen className="w-4 h-4 text-[rgb(var(--muted))] mr-2" />
                                <span className="font-black text-[rgb(var(--text))] text-lg">{room.roomNumber}</span>
                              </div>
                              {editingRoomId === room.id ? (
                                <div onClick={e => e.stopPropagation()}>
                                  <select 
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value as RoomStatus)}
                                    className="text-xs ui-input py-1 px-2 min-h-0 h-auto"
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

                            <div className="flex justify-between items-end mt-auto">
                              <div className="bg-[rgb(var(--surface-2))] nm-inset-sm px-3 py-1.5 rounded-lg flex items-center">
                                <Users className="w-3.5 h-3.5 mr-2 text-[rgb(var(--muted))]" />
                                <span className="font-bold text-[rgb(var(--text))] text-sm">{room.currentOccupancy}</span>
                                <span className="text-[rgb(var(--muted))] text-sm ml-1">/ {room.capacity}</span>
                              </div>
                              
                              <div className="flex space-x-2">
                                <button 
                                  onClick={(e) => handleDeleteRoom(e, room.id)}
                                  className="w-8 h-8 flex items-center justify-center text-red-500 nm-flat rounded-lg hover:nm-inset-sm transition-all"
                                  title="Видалити кімнату"
                                >
                                  <span className="font-bold">&times;</span>
                                </button>
                                {editingRoomId === room.id ? (
                                  <button 
                                    onClick={(e) => saveRoomStatus(e, room.id)}
                                    className="w-8 h-8 flex items-center justify-center text-green-500 nm-flat rounded-lg hover:nm-inset-sm transition-all"
                                    title="Зберегти"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button 
                                    onClick={(e) => startEditingRoom(e, room)}
                                    className="w-8 h-8 flex items-center justify-center text-[rgb(var(--muted))] nm-flat rounded-lg hover:nm-inset-sm transition-all"
                                    title="Змінити статус"
                                  >
                                    <Edit2 className="w-4 h-4" />
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
          <div className="text-center text-[rgb(var(--muted))] font-medium py-12 nm-inset-sm bg-[rgb(var(--surface-2))] rounded-3xl">
            Немає даних про гуртожитки. Переконайтесь, що ви запустили seed-скрипт.
          </div>
        )}
      {/* Room Details Modal */}
      {isRoomModalOpen && selectedRoom && (
        <div className="nm-modal-backdrop p-4">
          <div className="nm-modal-content w-full max-w-3xl animate-slideUp">
            <div className="px-6 py-5 border-b border-[rgb(var(--border)/0.2)] flex justify-between items-center bg-[rgb(var(--surface-2))]">
              <h3 className="text-xl font-bold text-[rgb(var(--text))] flex items-center">
                <div className="w-10 h-10 rounded-xl nm-raised flex items-center justify-center mr-4 bg-[rgb(var(--surface))]">
                  <DoorOpen className="w-5 h-5 text-[rgb(var(--accent))]" />
                </div>
                Деталі кімнати {selectedRoom.roomNumber}
              </h3>
              <button onClick={() => setIsRoomModalOpen(false)} className="w-10 h-10 nm-flat hover:nm-inset-sm rounded-full flex items-center justify-center text-[rgb(var(--muted))] transition-all">
                <span className="sr-only">Закрити</span>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 md:p-8 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="nm-inset-sm bg-[rgb(var(--surface-2))] p-5 rounded-2xl flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider ui-muted">Статус</p>
                  <div>{getStatusBadge(selectedRoom.status)}</div>
                </div>
                <div className="nm-inset-sm bg-[rgb(var(--surface-2))] p-5 rounded-2xl flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider ui-muted">Заповненість</p>
                  <p className="font-bold text-lg text-[rgb(var(--text))]">{selectedRoom.currentOccupancy} <span className="text-sm ui-muted">з {selectedRoom.capacity}</span></p>
                </div>
              </div>

              <div className="nm-flat bg-[rgb(var(--surface))] p-6 rounded-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                  <h4 className="font-bold text-lg text-[rgb(var(--text))] flex items-center">
                    <UserPlus className="w-5 h-5 mr-2 text-[rgb(var(--accent))]" /> Заселити студента
                  </h4>
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-[rgb(var(--accent-soft))] text-[rgb(var(--accent))] rounded-full nm-inset-sm">Вільні місця: {availableSeats}</span>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-5">
                    <input
                      type="text"
                      placeholder="Пошук за ПІБ, квитком..."
                      value={poolSearch}
                      onChange={(e) => setPoolSearch(e.target.value)}
                      className="ui-input w-full bg-[rgb(var(--surface-2))]"
                    />
                  </div>
                  <div className="lg:col-span-5">
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      disabled={isPoolLoading || !isRoomAssignable}
                      className="ui-input w-full bg-[rgb(var(--surface-2))]"
                    >
                      <option value="">{isPoolLoading ? 'Завантаження пулу...' : 'Оберіть студента'}</option>
                      {filteredPool.slice(0, 50).map(student => (
                        <option key={student.id} value={student.id}>
                          {student.fullName} • {student.faculty}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="lg:col-span-2">
                    <button
                      onClick={handleAllocateStudent}
                      disabled={!isRoomAssignable || isAllocating || !selectedStudentId}
                      className="ui-button ui-button-primary w-full h-full min-h-[48px] px-2 py-0"
                    >
                      {isAllocating ? '...' : 'Заселити'}
                    </button>
                  </div>
                </div>
                {!isRoomAssignable && (
                  <p className="text-xs font-bold text-red-500 mt-4 flex items-center">
                    * Заселення недоступне: {selectedRoom.status === 'MAINTENANCE' ? 'кімната на ремонті' : 'немає вільних місць'}.
                  </p>
                )}
                {isRoomAssignable && !isPoolLoading && allocationPool.length === 0 && (
                  <p className="text-xs font-bold text-yellow-500 mt-4">
                    * Пул студентів порожній або немає схвалених заяв.
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-bold text-lg text-[rgb(var(--text))] mb-6 flex items-center">
                  <Users className="w-5 h-5 mr-3 text-[rgb(var(--accent))]" /> Мешканці
                </h4>
                
                {isModalLoading ? (
                  <div className="text-center font-bold tracking-widest text-[rgb(var(--muted))] py-8 uppercase text-xs">Завантаження...</div>
                ) : roomStudents.length === 0 ? (
                  <div className="text-center text-[rgb(var(--muted))] py-10 bg-[rgb(var(--surface-2))] nm-inset-sm rounded-2xl font-medium text-sm">
                    Кімната порожня. Додайте студентів через систему розподілу.
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {roomStudents.map(student => (
                      <li key={student.id} className="p-4 nm-inset-sm bg-[rgb(var(--surface-2))] rounded-2xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full nm-flat bg-[rgb(var(--surface))] flex items-center justify-center font-bold text-[rgb(var(--accent))] mr-4 flex-shrink-0">
                            {student.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-[rgb(var(--text))] text-sm">{student.fullName}</p>
                            <p className="text-xs text-[rgb(var(--muted))] mt-1 font-medium">{student.faculty}, {student.course} курс • {student.studentIdNumber}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => evictStudent(student.id)}
                          className="text-red-500 nm-flat bg-[rgb(var(--surface))] hover:nm-inset-sm px-4 py-2 rounded-xl transition-all flex items-center justify-center"
                          title="Виселити"
                        >
                          <UserMinus className="w-4 h-4 mr-2" />
                          <span className="text-xs font-bold tracking-wide uppercase">Виселити</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            
            <div className="px-6 py-5 border-t border-[rgb(var(--border)/0.2)] bg-[rgb(var(--surface-2))] flex justify-end">
              <button
                onClick={() => setIsRoomModalOpen(false)}
                className="ui-button ui-button-outline px-8"
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
