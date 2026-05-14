import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Building, Layers, DoorOpen, Check, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Dormitory, Room, RoomStatus } from '../../types';

export const DormitoryManager: React.FC = () => {
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<RoomStatus>('AVAILABLE');

  useEffect(() => {
    fetchDormitories();
  }, []);

  const fetchDormitories = async () => {
    try {
      // Mock data for compilation and demonstration
      const mockDorms: Dormitory[] = [
        {
          id: 'd1',
          name: 'Гуртожиток №3',
          address: 'вул. Студентська, 5',
          totalCapacity: 400,
          floors: [
            {
              id: 'f1', dormitoryId: 'd1', floorNumber: 1, rooms: [
                { id: 'r1', floorId: 'f1', roomNumber: '101', capacity: 4, currentOccupancy: 2, status: 'AVAILABLE' },
                { id: 'r2', floorId: 'f1', roomNumber: '102', capacity: 4, currentOccupancy: 4, status: 'FULL' },
              ]
            },
            {
              id: 'f2', dormitoryId: 'd1', floorNumber: 2, rooms: [
                { id: 'r3', floorId: 'f2', roomNumber: '201', capacity: 3, currentOccupancy: 0, status: 'MAINTENANCE' },
              ]
            }
          ]
        }
      ];
      setDormitories(mockDorms);
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

  const startEditingRoom = (room: Room) => {
    setEditingRoomId(room.id);
    setSelectedStatus(room.status);
  };

  const saveRoomStatus = async (roomId: string) => {
    try {
      // await api.patch(`/admin/rooms/${roomId}/status`, { status: selectedStatus });
      
      // Update local state
      setDormitories(prev => prev.map(dorm => ({
        ...dorm,
        floors: dorm.floors.map(floor => ({
          ...floor,
          rooms: floor.rooms.map(room => room.id === roomId ? { ...room, status: selectedStatus } : room)
        }))
      })));
      
      toast.success('Статус кімнати оновлено');
      setEditingRoomId(null);
    } catch (error) {
      toast.error('Помилка оновлення статусу');
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
            {/* Dormitory Level */}
            <div 
              className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
              onClick={() => toggleNode(dorm.id)}
            >
              {expandedNodes.has(dorm.id) ? <ChevronDown className="w-5 h-5 text-gray-400 mr-2" /> : <ChevronRight className="w-5 h-5 text-gray-400 mr-2" />}
              <Building className="w-6 h-6 text-indigo-600 mr-3" />
              <span className="font-semibold text-gray-900">{dorm.name}</span>
              <span className="ml-auto text-sm text-gray-500">{dorm.totalCapacity} місць загалом</span>
            </div>

            {/* Floor Level */}
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

                    {/* Room Level */}
                    {expandedNodes.has(floor.id) && (
                      <div className="ml-8 mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-l-2 border-gray-100 pl-4 py-2">
                        {floor.rooms.map(room => (
                          <div key={room.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center">
                                <DoorOpen className="w-5 h-5 text-gray-500 mr-2" />
                                <span className="font-bold text-gray-900">Кімната {room.roomNumber}</span>
                              </div>
                              {editingRoomId === room.id ? (
                                <select 
                                  value={selectedStatus}
                                  onChange={(e) => setSelectedStatus(e.target.value as RoomStatus)}
                                  className="text-sm border border-blue-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="AVAILABLE">Доступна</option>
                                  <option value="FULL">Заповнена</option>
                                  <option value="MAINTENANCE">Ремонт</option>
                                </select>
                              ) : (
                                getStatusBadge(room.status)
                              )}
                            </div>

                            <div className="flex justify-between items-end mt-auto">
                              <div className="text-sm text-gray-600">
                                <div>Зайнято: <span className="font-medium text-gray-900">{room.currentOccupancy}/{room.capacity}</span></div>
                              </div>
                              
                              {editingRoomId === room.id ? (
                                <button 
                                  onClick={() => saveRoomStatus(room.id)}
                                  className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                  title="Зберегти"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              ) : (
                                <button 
                                  onClick={() => startEditingRoom(room)}
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
            Немає даних про гуртожитки.
          </div>
        )}
      </div>
    </div>
  );
};

export default DormitoryManager;
