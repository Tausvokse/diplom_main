import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, CheckCircle, FileText, Activity, Smartphone, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import DiiaSocketListener from './DiiaSocketListener';
import { ClusteringVector } from '../../types';
import InputMask from 'react-input-mask';

interface FormData {
  type: string;
  course: number;
  faculty: string;
  privilegeCategoryId: string;
  previousRoom: string;
  checkoutReason: string;
  passportFiles: File[];
  idCodeFiles: File[];
  medCardFiles: File[];
  privilegeFiles: File[];
  checkoutFiles: File[];
  clusteringVector: ClusteringVector;
}

const STEPS = [
  { id: 1, title: 'Загальні дані', icon: FileText },
  { id: 2, title: 'Психометрія', icon: Activity },
  { id: 3, title: 'Верифікація', icon: Smartphone },
];

export const ApplicationForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [diiaSessionId, setDiiaSessionId] = useState<string | null>(null);
  const [diiaData, setDiiaData] = useState<Record<string, unknown> | null>(null);
  const [showDiiaModal, setShowDiiaModal] = useState(false);
  const [isDiiaLoading, setIsDiiaLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    type: 'CHECK_IN',
    course: 1,
    faculty: '',
    privilegeCategoryId: '',
    previousRoom: '',
    checkoutReason: '',
    passportFiles: [],
    idCodeFiles: [],
    medCardFiles: [],
    privilegeFiles: [],
    checkoutFiles: [],
    clusteringVector: {
      chronotype: 5,
      sociability: 5,
      noiseTolerance: 5,
      cleanliness: 5,
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSliderChange = (parameter: keyof ClusteringVector, value: number) => {
    setFormData(prev => ({
      ...prev,
      clusteringVector: {
        ...prev.clusteringVector,
        [parameter]: value
      }
    }));
  };

  const [draggingCategory, setDraggingCategory] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent, category: string) => {
    e.preventDefault();
    setDraggingCategory(category);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDraggingCategory(null);
  }, []);

  const validateFiles = (files: File[]) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const validFiles: File[] = [];

    files.forEach(file => {
      if (!validTypes.includes(file.type)) {
        toast.error(`Файл ${file.name} має недопустимий формат. Дозволені: PDF, JPG, PNG.`);
      } else if (file.size > maxSize) {
        toast.error(`Файл ${file.name} завеликий. Максимальний розмір: 5MB.`);
      } else {
        validFiles.push(file);
      }
    });
    return validFiles;
  };

  const handleDrop = useCallback((e: React.DragEvent, category: keyof FormData) => {
    e.preventDefault();
    setDraggingCategory(null);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = validateFiles(droppedFiles);
    
    if (validFiles.length > 0) {
      setFormData(prev => ({
        ...prev,
        [category]: [...(prev[category] as File[]), ...validFiles]
      }));
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, category: keyof FormData) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = validateFiles(selectedFiles);
      
      if (validFiles.length > 0) {
        setFormData(prev => ({
          ...prev,
          [category]: [...(prev[category] as File[]), ...validFiles]
        }));
      }
    }
  };

  const removeFile = (index: number, category: keyof FormData) => {
    setFormData(prev => ({
      ...prev,
      [category]: (prev[category] as File[]).filter((_, i) => i !== index)
    }));
  };
  // -----------------------------

  const nextStep = () => {
    if (currentStep === 1) {
      if (formData.type === 'CHECK_IN' && (!formData.faculty || formData.course < 1)) {
        toast.error('Будь ласка, заповніть всі обов\'язкові поля');
        return;
      }
      if (formData.type === 'CHECK_OUT' && (!formData.previousRoom || !formData.checkoutReason)) {
        toast.error('Будь ласка, вкажіть кімнату та причину виселення');
        return;
      }
      if (formData.type === 'CHECK_OUT') {
        setCurrentStep(3); // Skip psychometry for check out
        return;
      }
    }
    if (currentStep < 3) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) {
      if (currentStep === 3 && formData.type === 'CHECK_OUT') {
        setCurrentStep(1);
      } else {
        setCurrentStep(prev => prev - 1);
      }
    }
  };

  const closeDiiaModal = () => {
    setShowDiiaModal(false);
    setDiiaSessionId(null);
    setDiiaData(null);
  };

  const openDiiaModal = async () => {
    setIsDiiaLoading(true);
    try {
      const response = await api.get('/diia/request');
      setDiiaSessionId(response.data.sessionId);
      setDiiaData(response.data.diiaData);
      setShowDiiaModal(true);
    } catch (error) {
      toast.error('Не вдалося ініціалізувати верифікацію через Дію');
    } finally {
      setIsDiiaLoading(false);
    }
  };

  const handleDiiaSuccess = () => {
    closeDiiaModal();
    submitApplication();
  };

  const submitApplication = async () => {
    setIsSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('type', formData.type);
      if (formData.type === 'CHECK_IN') {
        payload.append('course', formData.course.toString());
        payload.append('faculty', formData.faculty);
        if (formData.privilegeCategoryId) {
          payload.append('privilegeCategoryId', formData.privilegeCategoryId);
        }
      } else if (formData.type === 'CHECK_OUT') {
        payload.append('previousRoom', formData.previousRoom);
        payload.append('checkoutReason', formData.checkoutReason);
      }
      payload.append('clusteringVector', JSON.stringify(formData.clusteringVector));

      formData.passportFiles.forEach(file => payload.append('passport', file));
      formData.idCodeFiles.forEach(file => payload.append('idCode', file));
      formData.medCardFiles.forEach(file => payload.append('medCard', file));
      formData.privilegeFiles.forEach(file => payload.append('privilegeDocs', file));
      formData.checkoutFiles.forEach(file => payload.append('documents', file));

      await api.post('/student/application', payload, {        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Заяву успішно подано!');
      navigate('/student/dashboard');
    } catch (error) {
      toast.error('Помилка при подачі заяви');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDropZone = (category: keyof FormData, title: string, description: string) => {
    const isDragActive = draggingCategory === category;
    const files = formData[category] as File[];
    
    return (
      <div className="mb-6">
        <label className="block text-sm font-semibold text-[rgb(var(--text))] mb-1">{title}</label>
        <p className="text-xs ui-muted mb-4">{description}</p>
        <div 
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 ${
            isDragActive ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent-soft))] nm-inset-sm' : 'border-[rgb(var(--border)/0.5)] bg-[rgb(var(--surface))] nm-flat hover:nm-inset-sm'
          }`}
          onDragOver={(e) => handleDragOver(e, category)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, category)}
        >
          <div className="w-12 h-12 rounded-full nm-raised-sm flex items-center justify-center mx-auto mb-3 bg-[rgb(var(--surface-2))] text-[rgb(var(--accent))]">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-[rgb(var(--text))] text-sm font-medium mb-1">Перетягніть файли сюди або</p>
          <label className="cursor-pointer text-[rgb(var(--accent))] text-sm font-bold hover:underline">
            оберіть на комп'ютері
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => handleFileInput(e, category)} />
          </label>
        </div>
        
        {files.length > 0 && (
          <ul className="mt-3 space-y-2">
            {files.map((file, idx) => (
              <li key={idx} className="flex items-center justify-between p-3 nm-flat bg-[rgb(var(--surface))] rounded-xl">
                <div className="flex items-center overflow-hidden">
                  <div className="w-8 h-8 rounded-lg nm-inset-sm flex items-center justify-center bg-[rgb(var(--surface-2))] mr-3 flex-shrink-0">
                    <FileText className="w-4 h-4 text-[rgb(var(--accent))]" />
                  </div>
                  <span className="text-xs font-medium text-[rgb(var(--text))] truncate">{file.name}</span>
                </div>
                <button type="button" onClick={() => removeFile(idx, category)} className="w-6 h-6 rounded-full nm-flat hover:nm-inset-sm text-red-500 flex items-center justify-center transition-all ml-3">
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-bold text-[rgb(var(--text))] mb-1 tracking-tight">Загальні дані</h2>
              <p className="text-sm ui-muted">Вкажіть основну інформацію для обробки заяви</p>
            </div>
            
            <div className="mb-8">
              <label className="block text-xs font-bold uppercase tracking-wider ui-muted mb-4">Тип заяви</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'CHECK_IN', label: 'Поселення', desc: 'Заселення в гуртожиток', icon: '🏠' },
                  { id: 'CHECK_OUT', label: 'Виселення', desc: 'Виїзд з гуртожитку', icon: '🚪' }
                ].map(type => (
                  <label 
                    key={type.id} 
                    className={`relative flex flex-col p-5 cursor-pointer rounded-2xl transition-all duration-200 border-2 border-transparent ${
                      formData.type === type.id 
                        ? 'nm-inset bg-[rgb(var(--surface-2))] border-[rgb(var(--accent)/0.3)]' 
                        : 'nm-flat hover:nm-raised-sm bg-[rgb(var(--surface))] hover:text-[rgb(var(--accent))]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={type.id}
                      checked={formData.type === type.id}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className="text-3xl mb-3">{type.icon}</div>
                    <div className={`font-semibold text-lg ${formData.type === type.id ? 'text-[rgb(var(--accent))]' : 'text-[rgb(var(--text))]'}`}>{type.label}</div>
                    <div className="text-sm ui-muted mt-1">{type.desc}</div>
                    {formData.type === type.id && (
                      <div className="absolute top-5 right-5 w-6 h-6 rounded-full nm-inset-sm flex items-center justify-center bg-[rgb(var(--surface))]">
                        <div className="w-3 h-3 rounded-full bg-[rgb(var(--accent))]" />
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-[rgb(var(--surface-2))] nm-inset-sm p-6 md:p-8 rounded-3xl space-y-6">
              {formData.type === 'CHECK_OUT' && (
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium ui-muted mb-2">Попередня кімната</label>
                    <InputMask
                      mask="999"
                      maskChar=""
                      name="previousRoom"
                      value={formData.previousRoom}
                      onChange={handleInputChange}
                      placeholder="Напр. 405"
                      className="ui-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium ui-muted mb-2">Причина виселення</label>
                    <textarea
                      name="checkoutReason"
                      value={formData.checkoutReason}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Завершення навчання, переїзд, тощо..."
                      className="ui-input w-full"
                    />
                  </div>
                </div>
              )}

              {formData.type === 'CHECK_IN' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium ui-muted mb-2">ПІБ</label>
                    <input
                      type="text"
                      disabled
                      value={`${user?.lastName || ''} ${user?.firstName || ''}`}
                      className="ui-input w-full opacity-60 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium ui-muted mb-2">Курс</label>
                    <input
                      type="number"
                      name="course"
                      min="1"
                      max="6"
                      value={formData.course}
                      onChange={handleInputChange}
                      className="ui-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium ui-muted mb-2">Факультет</label>
                    <select
                      name="faculty"
                      value={formData.faculty}
                      onChange={handleInputChange}
                      className="ui-input w-full"
                    >
                      <option value="">Оберіть факультет...</option>
                      <option value="FI">Факультет інформатики</option>
                      <option value="FEM">Факультет економіки та менеджменту</option>
                      <option value="FL">Факультет лінгвістики</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium ui-muted mb-2">Категорія пільг</label>
                    <select
                      name="privilegeCategoryId"
                      value={formData.privilegeCategoryId}
                      onChange={handleInputChange}
                      className="ui-input w-full"
                    >
                      <option value="">Немає пільг</option>
                      <option value="id_orphans">Діти-сироти</option>
                      <option value="id_disabled">Особи з інвалідністю</option>
                      <option value="id_combat">Учасники бойових дій</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold text-[rgb(var(--text))] mb-4 border-b border-[rgb(var(--border)/0.2)] pb-2">Скан-копії документів</h3>
              
              {formData.type === 'CHECK_IN' && (
                <div className="space-y-2">
                  {renderDropZone('passportFiles', 'Паспорт', 'Скан-копія паспорта (PDF, JPG, PNG)')}
                  {renderDropZone('idCodeFiles', 'Ідентифікаційний код', 'Скан-копія РНОКПП (ІПН)')}
                  {renderDropZone('medCardFiles', 'Медична довідка', 'Форма 086/о або аналогічна')}
                  {formData.privilegeCategoryId && (
                    renderDropZone('privilegeFiles', 'Документи про пільги', 'Скан-копії документів, що підтверджують пільгу')
                  )}
                </div>
              )}
              
              {formData.type === 'CHECK_OUT' && (
                <div className="space-y-2">
                  {renderDropZone('checkoutFiles', 'Документи для виселення', 'Завантажте необхідні документи, наприклад, обхідний лист')}
                </div>
              )}
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-10 animate-fadeIn">
            <div>
              <h2 className="text-2xl font-bold text-[rgb(var(--text))] mb-2 tracking-tight">Психометрична анкета</h2>
              <p className="ui-muted text-sm leading-relaxed">
                Ваші відповіді допоможуть нашому AI-алгоритму підібрати вам ідеальних сусідів по кімнаті за допомогою K-means кластеризації.
              </p>
            </div>

            <div className="bg-[rgb(var(--surface-2))] nm-inset-sm p-6 md:p-10 rounded-3xl space-y-10">
              {/* Chronotype */}
              <div>
                <div className="flex justify-between mb-4">
                  <label className="text-sm font-semibold text-[rgb(var(--text))] uppercase tracking-wider">Хронотип (Режим сну)</label>
                  <span className="text-sm font-bold text-[rgb(var(--accent))] px-3 py-1 nm-raised-xs rounded-full bg-[rgb(var(--surface))]">{formData.clusteringVector.chronotype}/10</span>
                </div>
                <div className="relative pt-1 nm-inset-sm bg-[rgb(var(--surface))] rounded-full p-2">
                  <input
                    type="range"
                    min="1" max="10"
                    value={formData.clusteringVector.chronotype}
                    onChange={(e) => handleSliderChange('chronotype', parseInt(e.target.value))}
                    className="w-full h-3 bg-transparent rounded-lg appearance-none cursor-pointer range-slider"
                  />
                </div>
                <div className="flex justify-between text-xs ui-muted mt-3 font-medium">
                  <span>Жайворонок (ранок)</span>
                  <span>Сова (ніч)</span>
                </div>
              </div>

              {/* Sociability */}
              <div>
                <div className="flex justify-between mb-4">
                  <label className="text-sm font-semibold text-[rgb(var(--text))] uppercase tracking-wider">Соціалізація</label>
                  <span className="text-sm font-bold text-[rgb(var(--accent))] px-3 py-1 nm-raised-xs rounded-full bg-[rgb(var(--surface))]">{formData.clusteringVector.sociability}/10</span>
                </div>
                <div className="relative pt-1 nm-inset-sm bg-[rgb(var(--surface))] rounded-full p-2">
                  <input
                    type="range"
                    min="1" max="10"
                    value={formData.clusteringVector.sociability}
                    onChange={(e) => handleSliderChange('sociability', parseInt(e.target.value))}
                    className="w-full h-3 bg-transparent rounded-lg appearance-none cursor-pointer range-slider"
                  />
                </div>
                <div className="flex justify-between text-xs ui-muted mt-3 font-medium">
                  <span>Інтроверт</span>
                  <span>Екстраверт</span>
                </div>
              </div>

              {/* Noise Tolerance */}
              <div>
                <div className="flex justify-between mb-4">
                  <label className="text-sm font-semibold text-[rgb(var(--text))] uppercase tracking-wider">Толерантність до шуму</label>
                  <span className="text-sm font-bold text-[rgb(var(--accent))] px-3 py-1 nm-raised-xs rounded-full bg-[rgb(var(--surface))]">{formData.clusteringVector.noiseTolerance}/10</span>
                </div>
                <div className="relative pt-1 nm-inset-sm bg-[rgb(var(--surface))] rounded-full p-2">
                  <input
                    type="range"
                    min="1" max="10"
                    value={formData.clusteringVector.noiseTolerance}
                    onChange={(e) => handleSliderChange('noiseTolerance', parseInt(e.target.value))}
                    className="w-full h-3 bg-transparent rounded-lg appearance-none cursor-pointer range-slider"
                  />
                </div>
                <div className="flex justify-between text-xs ui-muted mt-3 font-medium">
                  <span>Абсолютна тиша</span>
                  <span>Не звертаю уваги</span>
                </div>
              </div>

              {/* Cleanliness */}
              <div>
                <div className="flex justify-between mb-4">
                  <label className="text-sm font-semibold text-[rgb(var(--text))] uppercase tracking-wider">Ставлення до чистоти</label>
                  <span className="text-sm font-bold text-[rgb(var(--accent))] px-3 py-1 nm-raised-xs rounded-full bg-[rgb(var(--surface))]">{formData.clusteringVector.cleanliness}/10</span>
                </div>
                <div className="relative pt-1 nm-inset-sm bg-[rgb(var(--surface))] rounded-full p-2">
                  <input
                    type="range"
                    min="1" max="10"
                    value={formData.clusteringVector.cleanliness}
                    onChange={(e) => handleSliderChange('cleanliness', parseInt(e.target.value))}
                    className="w-full h-3 bg-transparent rounded-lg appearance-none cursor-pointer range-slider"
                  />
                </div>
                <div className="flex justify-between text-xs ui-muted mt-3 font-medium">
                  <span>Творчий безлад</span>
                  <span>Педантична чистота</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-fadeIn text-center py-10">
            <div className="w-24 h-24 rounded-3xl nm-inset-sm mx-auto flex items-center justify-center mb-8 bg-[rgb(var(--surface-2))]">
              <Smartphone className="w-12 h-12 text-[rgb(var(--text))]" />
            </div>
            <h2 className="text-2xl font-bold text-[rgb(var(--text))] tracking-tight mb-4">Верифікація особи</h2>
            <p className="ui-muted max-w-md mx-auto leading-relaxed mb-10">
              Останній крок перед подачею заяви. Пройдіть швидку верифікацію через застосунок Дія.Шеринг, щоб підтвердити вашу особу та автоматично підтягнути необхідні дані.
            </p>
            
            <div>
              <button
                onClick={openDiiaModal}
                disabled={isDiiaLoading}
                className="inline-flex items-center px-8 py-4 bg-[rgb(var(--text))] text-[rgb(var(--surface))] rounded-2xl hover:opacity-90 transition-all transform hover:-translate-y-1 active:translate-y-0 shadow-lg"
              >
                <span className="font-bold text-lg tracking-wide">
                  {isDiiaLoading ? 'ЗАВАНТАЖЕННЯ...' : 'ПРОЙТИ ВЕРИФІКАЦІЮ В ДІЇ'}
                </span>
              </button>
            </div>

            <div className="text-xs ui-muted mt-10 max-w-sm mx-auto">
              Ваші дані надійно захищені та використовуються виключно для формування наказу на поселення.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="ui-card overflow-hidden transition-colors">
        {/* Stepper Header */}
        <div className="px-6 md:px-10 py-8 border-b border-[rgb(var(--border)/0.2)] bg-[rgb(var(--surface-2))]">
          <div className="flex items-center justify-between relative">
            {/* Progress line background */}
            <div className="absolute top-7 left-12 right-12 h-1.5 nm-inset-sm bg-[rgb(var(--surface))] rounded-full hidden sm:block z-0" />
            
            {/* Active progress line */}
            <div className="absolute top-7 left-12 right-12 h-1.5 hidden sm:block z-0 overflow-hidden rounded-full">
              <div 
                className="h-full bg-[rgb(var(--accent))] transition-all duration-500 ease-out shadow-[0_0_10px_rgba(var(--accent),0.5)]"
                style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
              />
            </div>

            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex flex-col items-center relative z-10">
                  <div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 ${
                      isActive ? 'nm-inset-sm bg-[rgb(var(--surface))] text-[rgb(var(--accent))] border border-[rgb(var(--accent)/0.3)]' :
                      isCompleted ? 'nm-raised bg-[rgb(var(--surface))] text-green-500' : 'nm-flat bg-[rgb(var(--surface-2))] text-[rgb(var(--muted))]'
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-[rgb(var(--accent))]' : 'ui-muted'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 md:p-10">
          {renderStepContent()}
        </div>

        {/* Navigation Actions */}
        <div className="px-6 md:px-10 py-6 bg-[rgb(var(--surface-2))] border-t border-[rgb(var(--border)/0.2)] flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={currentStep === 1 || isSubmitting}
            className="ui-button ui-button-outline px-8 py-3 disabled:opacity-30 disabled:hover:nm-flat"
          >
            Назад
          </button>
          
          {currentStep < 3 ? (
            <button
              onClick={nextStep}
              className="ui-button ui-button-primary px-10 py-3"
            >
              Продовжити
            </button>
          ) : (
              <button
                onClick={submitApplication}
                disabled={isSubmitting}
                className="ui-button bg-green-500 text-white hover:bg-green-600 px-8 py-3 disabled:opacity-50 flex items-center font-bold tracking-wide"
                style={{ boxShadow: 'var(--nm-raised)' }}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    ОБРОБКА...
                  </>
                ) : (
                  'ПОДАТИ ЗАЯВУ (ОБХІД ДІЇ)'
                )}
              </button>
          )}
        </div>
      </div>

      {/* Diia Modal Overlay */}
      {showDiiaModal && (
        <div className="nm-modal-backdrop p-4">
          <div className="nm-modal-content w-full max-w-md animate-slideUp">
            <button 
              onClick={closeDiiaModal}
              className="absolute top-4 right-4 w-10 h-10 nm-flat hover:nm-inset-sm rounded-full flex items-center justify-center text-[rgb(var(--muted))] transition-all z-10"
            >
              <X className="w-5 h-5" />
            </button>
            {diiaSessionId && diiaData ? (
              <DiiaSocketListener onSuccess={handleDiiaSuccess} sessionId={diiaSessionId} diiaData={diiaData} />
            ) : (
              <div className="p-12 text-center text-sm ui-muted font-medium">ЗАВАНТАЖЕННЯ ДАНИХ ДЛЯ ДІЇ...</div>
            )}
          </div>
        </div>
      )}
      
      {/* Add global styles for range slider thumb */}
      <style>{`
        .range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgb(var(--surface));
          box-shadow: var(--nm-raised-sm);
          cursor: pointer;
          border: 2px solid rgb(var(--accent));
        }
        .range-slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgb(var(--surface));
          box-shadow: var(--nm-raised-sm);
          cursor: pointer;
          border: 2px solid rgb(var(--accent));
        }
      `}</style>
    </div>
  );
};

export default ApplicationForm;
