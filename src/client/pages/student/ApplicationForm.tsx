import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, CheckCircle, FileText, Activity, Smartphone, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import DiiaSocketListener from './DiiaSocketListener';
import { ClusteringVector } from '../../types';

interface FormData {
  course: number;
  faculty: string;
  privilegeCategoryId: string;
  files: File[];
  clusteringVector: ClusteringVector;
}

const STEPS = [
  { id: 1, title: 'Загальні дані', icon: FileText },
  { id: 2, title: 'Психометрія', icon: Activity },
  { id: 3, title: 'Верифікація', icon: Smartphone },
];

export const ApplicationForm: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [diiaSessionId] = useState(() => Math.random().toString(36).substring(7));
  const [showDiiaModal, setShowDiiaModal] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    course: 1,
    faculty: '',
    privilegeCategoryId: '',
    files: [],
    clusteringVector: {
      chronotype: 5,
      sociability: 5,
      noiseTolerance: 5,
      cleanliness: 5,
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

  // --- Drag & Drop Handlers ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFormData(prev => ({
      ...prev,
      files: [...prev.files, ...droppedFiles]
    }));
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFormData(prev => ({
        ...prev,
        files: [...prev.files, ...selectedFiles]
      }));
    }
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };
  // -----------------------------

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.faculty || formData.course < 1) {
        toast.error('Будь ласка, заповніть всі обов\'язкові поля');
        return;
      }
    }
    if (currentStep < 3) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleDiiaSuccess = () => {
    setShowDiiaModal(false);
    submitApplication();
  };

  const submitApplication = async () => {
    setIsSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('course', formData.course.toString());
      payload.append('faculty', formData.faculty);
      if (formData.privilegeCategoryId) {
        payload.append('privilegeCategoryId', formData.privilegeCategoryId);
      }
      payload.append('clusteringVector', JSON.stringify(formData.clusteringVector));
      
      formData.files.forEach(file => {
        payload.append('documents', file);
      });

      // API call to save application
      await api.post('/student/application', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Заяву успішно подано!');
      navigate('/student/dashboard');
    } catch (error) {
      toast.error('Помилка при подачі заяви');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-xl font-bold text-gray-900">Загальні дані</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Курс</label>
                <input
                  type="number"
                  name="course"
                  min="1"
                  max="6"
                  value={formData.course}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Факультет</label>
                <select
                  name="faculty"
                  value={formData.faculty}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Оберіть факультет...</option>
                  <option value="FI">Факультет інформатики</option>
                  <option value="FEM">Факультет економіки та менеджменту</option>
                  <option value="FL">Факультет лінгвістики</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Категорія пільг (за наявності)</label>
                <select
                  name="privilegeCategoryId"
                  value={formData.privilegeCategoryId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Немає пільг</option>
                  <option value="id_orphans">Діти-сироти</option>
                  <option value="id_disabled">Особи з інвалідністю</option>
                  <option value="id_combat">Учасники бойових дій</option>
                </select>
              </div>
            </div>

            <div className="mt-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">Скан-копії документів (якщо є пільги)</label>
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <UploadCloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Перетягніть файли сюди або</p>
                <label className="cursor-pointer text-blue-600 font-medium hover:text-blue-700">
                  оберіть на комп'ютері
                  <input type="file" multiple className="hidden" onChange={handleFileInput} />
                </label>
                <p className="text-xs text-gray-400 mt-2">PDF, JPG, PNG (макс. 5MB)</p>
              </div>
              
              {formData.files.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {formData.files.map((file, idx) => (
                    <li key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="flex items-center overflow-hidden">
                        <FileText className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
                        <span className="text-sm text-gray-700 truncate">{file.name}</span>
                      </div>
                      <button type="button" onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-700 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Психометрична анкета</h2>
              <p className="text-gray-500 text-sm">
                Ваші відповіді допоможуть нашому AI-алгоритму підібрати вам ідеальних сусідів по кімнаті за допомогою K-means кластеризації.
              </p>
            </div>

            <div className="space-y-10">
              {/* Chronotype */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-900">Хронотип (Режим сну)</label>
                  <span className="text-sm font-bold text-blue-600">{formData.clusteringVector.chronotype}/10</span>
                </div>
                <input
                  type="range"
                  min="1" max="10"
                  value={formData.clusteringVector.chronotype}
                  onChange={(e) => handleSliderChange('chronotype', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Яскравий Жайворонок (ранок)</span>
                  <span>Яскрава Сова (ніч)</span>
                </div>
              </div>

              {/* Sociability */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-900">Соціалізація</label>
                  <span className="text-sm font-bold text-blue-600">{formData.clusteringVector.sociability}/10</span>
                </div>
                <input
                  type="range"
                  min="1" max="10"
                  value={formData.clusteringVector.sociability}
                  onChange={(e) => handleSliderChange('sociability', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Інтроверт (люблю усамітнення)</span>
                  <span>Екстраверт (люблю компанії)</span>
                </div>
              </div>

              {/* Noise Tolerance */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-900">Толерантність до шуму</label>
                  <span className="text-sm font-bold text-blue-600">{formData.clusteringVector.noiseTolerance}/10</span>
                </div>
                <input
                  type="range"
                  min="1" max="10"
                  value={formData.clusteringVector.noiseTolerance}
                  onChange={(e) => handleSliderChange('noiseTolerance', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Потребую абсолютної тиші</span>
                  <span>Не звертаю уваги на шум</span>
                </div>
              </div>

              {/* Cleanliness */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-900">Ставлення до чистоти</label>
                  <span className="text-sm font-bold text-blue-600">{formData.clusteringVector.cleanliness}/10</span>
                </div>
                <input
                  type="range"
                  min="1" max="10"
                  value={formData.clusteringVector.cleanliness}
                  onChange={(e) => handleSliderChange('cleanliness', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Творчий безлад</span>
                  <span>Педантична чистота</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-fadeIn text-center">
            <h2 className="text-xl font-bold text-gray-900">Верифікація особи</h2>
            <p className="text-gray-500">
              Останній крок перед подачею заяви. Пройдіть швидку верифікацію через застосунок Дія.Шеринг, щоб підтвердити вашу особу та автоматично підтягнути необхідні дані.
            </p>
            
            <div className="py-8">
              <button
                onClick={() => setShowDiiaModal(true)}
                className="inline-flex items-center px-8 py-4 bg-[#000000] text-white rounded-2xl hover:bg-gray-800 transition-all shadow-lg transform hover:-translate-y-1"
              >
                <Smartphone className="w-6 h-6 mr-3" />
                <span className="font-bold text-lg">Пройти верифікацію в Дії</span>
              </button>
            </div>

            <div className="text-sm text-gray-400 mt-4">
              Ваші дані надійно захищені та використовуються виключно для формування наказу на поселення.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Stepper Header */}
        <div className="bg-gray-50 px-8 py-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex flex-col items-center relative z-10">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                      isActive ? 'bg-blue-600 text-white shadow-md' :
                      isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? 'text-blue-900' : 'text-gray-500'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
            {/* Progress line */}
            <div className="absolute top-11 left-12 right-12 h-0.5 bg-gray-200 z-0 hidden sm:block">
              <div 
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-8">
          {renderStepContent()}
        </div>

        {/* Navigation Actions */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={currentStep === 1 || isSubmitting}
            className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Назад
          </button>
          
          {currentStep < 3 ? (
            <button
              onClick={nextStep}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Далі
            </button>
          ) : (
            import.meta.env.MODE === 'development' && (
              <button
                onClick={submitApplication}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Обробка...
                  </>
                ) : (
                  'Подати заяву (Без Дії)' // Fallback for testing
                )}
              </button>
            )
          )}
        </div>
      </div>

      {/* Diia Modal Overlay */}
      {showDiiaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
            <button 
              onClick={() => setShowDiiaModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <DiiaSocketListener onSuccess={handleDiiaSuccess} sessionId={diiaSessionId} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationForm;
