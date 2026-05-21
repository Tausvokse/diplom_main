import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Building, Layers, DoorOpen, Check, Edit2, Users, UserMinus, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Dormitory, Room, RoomStatus } from '../../types';
import { api } from '../../services/api';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useTheme } from '../../components/ThemeProvider';

interface AllocationCandidate {
  id: string;
  fullName: string;
  studentIdNumber: string;
  faculty: string;
  course: number;
  priorityScore: number;
}

export const DormitoryManager: React.FC = () => {
  const { theme } = useTheme();
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<RoomStatus>('AVAILABLE');
  
  // Room details modal state
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
      AVAILABLE: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: 'Доступна' },
      FULL: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', label: 'Заповнена' },
      MAINTENANCE: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', label: 'Ремонт' }
    };
    const c = config[status];
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.color}`}>{c.label}</span>;
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

  const baseColor = theme === 'dark' ? '#1f2937' : '#e5e7eb';
  const highlightColor = theme === 'dark' ? '#374151' : '#f3f4f6';

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <Skeleton height={28} width={220} baseColor={baseColor} highlightColor={highlightColor} />
        <Skeleton height={240} baseColor={baseColor} highlightColor={highlightColor} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Управління фондом</h1>
          <p className="text-gray-500 dark:text-gray-400">Візуальний конструктор та моніторинг стану кімнат</p>
        </div>
      </header>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors">
        {dormitories.map(dorm => (
          <div key={dorm.id} className="mb-4 select-none">
            <div 
              className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors"
              onClick={() => toggleNode(dorm.id)}
            >
              {expandedNodes.has(dorm.id) ? <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" /> : <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" />}
              <Building className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mr-3" />
              <span className="font-semibold text-gray-900 dark:text-white">{dorm.name}</span>
              <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">{dorm.totalCapacity} місць загалом</span>
            </div>

            {expandedNodes.has(dorm.id) && (
              <div className="ml-8 mt-2 space-y-2 border-l-2 border-gray-100 dark:border-gray-700 pl-4">
                {dorm.floors.map(floor => (
                  <div key={floor.id}>
                    <div 
                      className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700/40 rounded-lg cursor-pointer transition-colors"
                      onClick={() => toggleNode(floor.id)}
                    >
                      {expandedNodes.has(floor.id) ? <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" /> : <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />}
                      <Layers className="w-5 h-5 text-blue-500 dark:text-blue-400 mr-3" />
                      <span className="font-medium text-gray-700 dark:text-gray-200">Поверх {floor.floorNumber}</span>
                      <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">{floor.rooms.length} кімнат</span>
                    </div>

                    {expandedNodes.has(floor.id) && (
                      <div className="ml-8 mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-l-2 border-gray-100 dark:border-gray-700 pl-4 py-2">
                        {floor.rooms.map(room => (
                          <div 
                            key={room.id} 
                            onClick={() => openRoomDetails(room)}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/60 transition-all cursor-pointer flex flex-col justify-between"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center">
                                <DoorOpen className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
                                <span className="font-bold text-gray-900 dark:text-white">Кімната {room.roomNumber}</span>
                              </div>
                              {editingRoomId === room.id ? (
                                <div onClick={e => e.stopPropagation()}>
                                  <select 
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value as RoomStatus)}
                                    className="text-sm border border-blue-300 dark:border-blue-600 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
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
                              <div className="text-sm text-gray-600 dark:text-gray-300">
                                <div className="flex items-center">
                                  <Users className="w-4 h-4 mr-1 text-gray-400 dark:text-gray-500" />
                                  <span className="font-medium text-gray-900 dark:text-white">{room.currentOccupancy}</span>/{room.capacity}
                                </div>
                              </div>
                              
                              <div className="flex space-x-1">
                                <button 
                                  onClick={(e) => handleDeleteRoom(e, room.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                  title="Видалити кімнату"
                                >
                                  <span className="text-lg leading-none">&times;</span>
                                </button>
                                {editingRoomId === room.id ? (
                                  <button 
                                    onClick={(e) => saveRoomStatus(e, room.id)}
                                    className="p-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/40 transition-colors"
                                    title="Зберегти"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button 
                                    onClick={(e) => startEditingRoom(e, room)}
                                    className="p-1.5 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    title="Змінити статус"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {dormitories.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            Немає даних про гуртожитки. Переконайтесь, що ви запустили seed-скрипт.
          </div>
        )}
      </div>

      {/* Room Details Modal */}
      {isRoomModalOpen && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden animate-slideUp border border-gray-200 dark:border-gray-800">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <DoorOpen className="w-6 h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                Деталі кімнати {selectedRoom.roomNumber}
              </h3>
              <button onClick={() => setIsRoomModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <span className="sr-only">Закрити</span>
                &times;
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Статус кімнати</p>
                  <p className="font-medium">{getStatusBadge(selectedRoom.status)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Заповненість</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedRoom.currentOccupancy} з {selectedRoom.capacity} місць</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Заселити студента</h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Вільні місця: {availableSeats}</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Пошук за ПІБ, квитком або факультетом"
                    value={poolSearch}
                    onChange={(e) => setPoolSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 rounded-lg text-sm"
                  />
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    disabled={isPoolLoading || !isRoomAssignable}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 rounded-lg text-sm"
                  >
                    <option value="">{isPoolLoading ? 'Завантаження пулу...' : 'Оберіть студента'}</option>
                    {filteredPool.slice(0, 50).map(student => (
                      <option key={student.id} value={student.id}>
                        {student.fullName} • {student.studentIdNumber} • {student.faculty}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAllocateStudent}
                    disabled={!isRoomAssignable || isAllocating || !selectedStudentId}
                    className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {isAllocating ? 'Заселення...' : 'Заселити'}
                  </button>
                </div>
                {!isRoomAssignable && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Заселення недоступне: {selectedRoom.status === 'MAINTENANCE' ? 'кімната на ремонті' : 'немає вільних місць'}.
                  </p>
                )}
                {isRoomAssignable && !isPoolLoading && allocationPool.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Пул студентів порожній або немає схвалених заяв.</p>
                )}
              </div>

              <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" /> Мешканці
              </h4>
              
              {isModalLoading ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">Завантаження мешканців...</div>
              ) : roomStudents.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                  Кімната порожня. Додайте студентів через систему розподілу.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {roomStudents.map(student => (
                    <li key={student.id} className="py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{student.fullName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{student.faculty}, {student.course} курс • Квиток: {student.studentIdNumber}</p>
                      </div>
                      <button 
                        onClick={() => evictStudent(student.id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 p-2 rounded-lg transition-colors flex items-center"
                        title="Виселити"
                      >
                        <UserMinus className="w-4 h-4 mr-1" />
                        <span className="text-sm font-medium">Виселити</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex justify-end">
              <button
                onClick={() => setIsRoomModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
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
