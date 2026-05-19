import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Building, Layers, DoorOpen, Check, Edit2, Users, UserMinus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Dormitory, Room, RoomStatus } from '../../types';
import { api } from '../../services/api';

export const DormitoryManager: React.FC = () => {
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

  useEffect(() => {
    fetchDormitories();
  }, []);

  const fetchDormitories = async () => {
    try {
      const res = await api.get('/admin/dormitories');
      setDormitories(res.data);
    } catch (error) {
      toast.error('Помилка завантаження структури гуртожитків');
    } finally {
      setIsLoading(false);
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
    setIsRoomModalOpen(true);
    setIsModalLoading(true);
    try {
      const res = await api.get(`/admin/rooms/${room.id}/students`);
      setRoomStudents(res.data);
    } catch (error) {
      toast.error('Не вдалося завантажити мешканців кімнати');
    } finally {
      setIsModalLoading(false);
    }
  };

  const evictStudent = async (studentId: string) => {
    if (!window.confirm('Ви впевнені, що хочете виселити цього студента з кімнати?')) return;
    try {
      await api.post(`/admin/allocation/evict`, { studentId }); // We will need to implement this endpoint
      toast.success('Студента виселено');
      setRoomStudents(prev => prev.filter(s => s.id !== studentId));
      fetchDormitories(); // Refresh to update occupancies
    } catch (error) {
      toast.error('Помилка при виселенні');
    }
  };

  const getStatusBadge = (status: RoomStatus) => {
    const config = {
      AVAILABLE: { color: 'bg-green-100 text-green-800', label: 'Доступна' },
      FULL: { color: 'bg-red-100 text-red-800', label: 'Заповнена' },
      MAINTENANCE: { color: 'bg-yellow-100 text-yellow-800', label: 'Ремонт' }
    };
    const c = config[status];
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.color}`}>{c.label}</span>;
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Завантаження...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управління фондом</h1>
          <p className="text-gray-500">Візуальний конструктор та моніторинг стану кімнат</p>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {dormitories.map(dorm => (
          <div key={dorm.id} className="mb-4 select-none">
            <div 
              className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
              onClick={() => toggleNode(dorm.id)}
            >
              {expandedNodes.has(dorm.id) ? <ChevronDown className="w-5 h-5 text-gray-400 mr-2" /> : <ChevronRight className="w-5 h-5 text-gray-400 mr-2" />}
              <Building className="w-6 h-6 text-indigo-600 mr-3" />
              <span className="font-semibold text-gray-900">{dorm.name}</span>
              <span className="ml-auto text-sm text-gray-500">{dorm.totalCapacity} місць загалом</span>
            </div>

            {expandedNodes.has(dorm.id) && (
              <div className="ml-8 mt-2 space-y-2 border-l-2 border-gray-100 pl-4">
                {dorm.floors.map(floor => (
                  <div key={floor.id}>
                    <div 
                      className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      onClick={() => toggleNode(floor.id)}
                    >
                      {expandedNodes.has(floor.id) ? <ChevronDown className="w-4 h-4 text-gray-400 mr-2" /> : <ChevronRight className="w-4 h-4 text-gray-400 mr-2" />}
                      <Layers className="w-5 h-5 text-blue-500 mr-3" />
                      <span className="font-medium text-gray-700">Поверх {floor.floorNumber}</span>
                      <span className="ml-auto text-sm text-gray-500">{floor.rooms.length} кімнат</span>
                    </div>

                    {expandedNodes.has(floor.id) && (
                      <div className="ml-8 mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-l-2 border-gray-100 pl-4 py-2">
                        {floor.rooms.map(room => (
                          <div 
                            key={room.id} 
                            onClick={() => openRoomDetails(room)}
                            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center">
                                <DoorOpen className="w-5 h-5 text-gray-500 mr-2" />
                                <span className="font-bold text-gray-900">Кімната {room.roomNumber}</span>
                              </div>
                              {editingRoomId === room.id ? (
                                <div onClick={e => e.stopPropagation()}>
                                  <select 
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value as RoomStatus)}
                                    className="text-sm border border-blue-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
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
                              <div className="text-sm text-gray-600">
                                <div className="flex items-center">
                                  <Users className="w-4 h-4 mr-1 text-gray-400" />
                                  <span className="font-medium text-gray-900">{room.currentOccupancy}</span>/{room.capacity}
                                </div>
                              </div>
                              
                              {editingRoomId === room.id ? (
                                <button 
                                  onClick={(e) => saveRoomStatus(e, room.id)}
                                  className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                  title="Зберегти"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              ) : (
                                <button 
                                  onClick={(e) => startEditingRoom(e, room)}
                                  className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                  title="Змінити статус"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
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
          <div className="text-center text-gray-500 py-12">
            Немає даних про гуртожитки. Переконайтесь, що ви запустили seed-скрипт.
          </div>
        )}
      </div>

      {/* Room Details Modal */}
      {isRoomModalOpen && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <DoorOpen className="w-6 h-6 mr-2 text-indigo-600" />
                Деталі кімнати {selectedRoom.roomNumber}
              </h3>
              <button onClick={() => setIsRoomModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <span className="sr-only">Закрити</span>
                &times;
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Статус кімнати</p>
                  <p className="font-medium">{getStatusBadge(selectedRoom.status)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Заповненість</p>
                  <p className="font-medium text-gray-900">{selectedRoom.currentOccupancy} з {selectedRoom.capacity} місць</p>
                </div>
              </div>

              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-gray-500" /> Мешканці
              </h4>
              
              {isModalLoading ? (
                <div className="text-center text-gray-500 py-4">Завантаження мешканців...</div>
              ) : roomStudents.length === 0 ? (
                <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  Кімната порожня. Додайте студентів через систему розподілу.
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {roomStudents.map(student => (
                    <li key={student.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{student.fullName}</p>
                        <p className="text-sm text-gray-500">{student.faculty}, {student.course} курс • Квиток: {student.studentIdNumber}</p>
                      </div>
                      <button 
                        onClick={() => evictStudent(student.id)}
                        className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors flex items-center"
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
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setIsRoomModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium"
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
