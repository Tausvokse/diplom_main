import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

export default function AdminAnnouncementsPage() {
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMsg, setNotificationMsg] = useState('');
  const [jarTitle, setJarTitle] = useState('');
  const [jarGoal, setJarGoal] = useState('');
  const [jarDesc, setJarDesc] = useState('');
  const [dormitoryId, setDormitoryId] = useState('');

  const handleSendMassNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/notifications/mass', { title: notificationTitle, message: notificationMsg });
      toast.success('Повідомлення надіслано успішно');
      setNotificationTitle('');
      setNotificationMsg('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Помилка при надсиланні повідомлення');
    }
  };

  const handleCreateJar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/jars', { 
        title: jarTitle, 
        goalAmount: Number(jarGoal), 
        description: jarDesc,
        dormitoryId 
      });
      toast.success('Банку створено успішно');
      setJarTitle('');
      setJarGoal('');
      setJarDesc('');
      setDormitoryId('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Помилка при створенні банки');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Оголошення та збори</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Масове повідомлення</h2>
        <form onSubmit={handleSendMassNotification} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Заголовок</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              value={notificationTitle}
              onChange={(e) => setNotificationTitle(e.target.value)}
              placeholder="Увага, студенти..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Текст повідомлення</label>
            <textarea
              required
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              value={notificationMsg}
              onChange={(e) => setNotificationMsg(e.target.value)}
              placeholder="Введіть текст повідомлення для всіх студентів..."
            />
          </div>
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Надіслати всім
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Створити банку (Збір)</h2>
        <form onSubmit={handleCreateJar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Назва збору</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              value={jarTitle}
              onChange={(e) => setJarTitle(e.target.value)}
              placeholder="На дрони..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Цільова сума</label>
            <input
              type="number"
              required
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              value={jarGoal}
              onChange={(e) => setJarGoal(e.target.value)}
              placeholder="10000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Опис збору</label>
            <textarea
              required
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              value={jarDesc}
              onChange={(e) => setJarDesc(e.target.value)}
              placeholder="Опис цілей..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ID Гуртожитку (UUID)</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              value={dormitoryId}
              onChange={(e) => setDormitoryId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </div>
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Опублікувати збір
          </button>
        </form>
      </div>
    </div>
  );
}
