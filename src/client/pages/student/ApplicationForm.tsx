import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, CheckCircle, FileText, Activity, Smartphone, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import DiiaSocketListener from './DiiaSocketListener';
import { ClusteringVector } from '../../types';
import styles from './ApplicationForm.module.css';

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
  consent: boolean;
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
  const [studentProfile, setStudentProfile] = useState<any>(null);

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
    consent: false,
  });

  const [previews, setPreviews] = useState<{ [key: string]: string[] }>({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/student/dashboard');
        if (res.data.profile) {
          setStudentProfile(res.data.profile);
          setFormData(prev => ({
            ...prev,
            course: res.data.profile.course || 1,
            faculty: res.data.profile.faculty || '',
            previousRoom: res.data.profile.room?.roomNumber || ''
          }));
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };
    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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
      // Limit to 1 file: cleanup old preview if replacing
      if (previews[category as string]?.length > 0) {
        URL.revokeObjectURL(previews[category as string][0]);
      }

      const newFile = validFiles[0];
      const previewUrl = URL.createObjectURL(newFile);

      setFormData(prev => ({
        ...prev,
        [category]: [newFile]
      }));

      setPreviews(prev => ({
        ...prev,
        [category as string]: [previewUrl]
      }));
    }
  }, [previews]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, category: keyof FormData) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = validateFiles(selectedFiles);
      
      if (validFiles.length > 0) {
        // Limit to 1 file: cleanup old preview if replacing
        if (previews[category as string]?.length > 0) {
          URL.revokeObjectURL(previews[category as string][0]);
        }

        const newFile = validFiles[0];
        const previewUrl = URL.createObjectURL(newFile);
        
        setFormData(prev => ({
          ...prev,
          [category]: [newFile]
        }));

        setPreviews(prev => ({
          ...prev,
          [category as string]: [previewUrl]
        }));
      }
    }
  };

  const removeFile = (index: number, category: keyof FormData) => {
    if (previews[category as string]?.[index]) {
      URL.revokeObjectURL(previews[category as string][index]);
    }

    setFormData(prev => ({
      ...prev,
      [category]: (prev[category] as File[]).filter((_, i) => i !== index)
    }));

    setPreviews(prev => ({
      ...prev,
      [category as string]: (prev[category as string] || []).filter((_, i) => i !== index)
    }));
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(previews).flat().forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

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
    const categoryPreviews = previews[category as string] || [];
    
    return (
      <div className={styles.dropzoneWrapper}>
        <label className={styles.dropzoneTitle}>{title}</label>
        <p className={`ui-muted ${styles.dropzoneDesc}`}>{description}</p>
        <div 
          className={`${styles.dropzoneArea} ${
            isDragActive ? `${styles.dropzoneActive} nm-inset-sm` : `${styles.dropzoneInactive} nm-flat hover:nm-inset-sm`
          }`}
          onDragOver={(e) => handleDragOver(e, category)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, category)}
        >
          <div className={`${styles.dropzoneIconBox} nm-raised-sm`}>
            <UploadCloud className={styles.dropzoneIconSvg} />
          </div>
          <p className={styles.dropzoneText}>Перетягніть файл сюди або</p>
          <label className={styles.dropzoneLink}>
            оберіть на комп'ютері
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => handleFileInput(e, category)} />
          </label>
        </div>
        
        {files.length > 0 && (
          <div className={styles.previewList}>
            {files.map((file, idx) => {
              const isImage = file.type.startsWith('image/');
              const isPdf = file.type === 'application/pdf';
              const previewUrl = categoryPreviews[idx];

              return (
                <div key={idx} className={`${styles.previewItem} nm-flat`}>
                  <button 
                    type="button" 
                    onClick={() => removeFile(idx, category)} 
                    className={styles.previewRemove}
                  >
                    <X size={14} />
                  </button>

                  {isImage && previewUrl ? (
                    <img 
                      src={previewUrl} 
                      alt={file.name} 
                      className={styles.previewImg} 
                    />
                  ) : (
                    <div className={styles.previewPdf}>
                      <FileText className={styles.previewPdfIcon} />
                      <span className={styles.previewName}>{file.name}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className={styles.stepContent}>
            <div>
              <h2 className={styles.stepTitle}>Загальні дані</h2>
              <p className={`ui-muted ${styles.radioDesc}`}>Вкажіть основну інформацію для обробки заяви</p>
            </div>
            
            <div className="mb-8">
              <label className={`ui-muted ${styles.sectionLabel}`}>Тип заяви</label>
              <div className={styles.radioGrid}>
                {[
                  { id: 'CHECK_IN', label: 'Поселення', desc: 'Заселення в гуртожиток', icon: '🏠' },
                  { id: 'CHECK_OUT', label: 'Виселення', desc: 'Виїзд з гуртожитку', icon: '🚪' }
                ].map(type => (
                  <label 
                    key={type.id} 
                    className={`${styles.radioCard} ${
                      formData.type === type.id 
                        ? `${styles.radioCardActive} nm-inset` 
                        : `${styles.radioCardInactive} nm-flat hover:nm-raised-sm`
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
                    <div className={styles.radioIcon}>{type.icon}</div>
                    <div className={`${styles.radioLabel} ${formData.type === type.id ? styles.radioLabelActive : styles.radioLabelInactive}`}>{type.label}</div>
                    <div className={`ui-muted ${styles.radioDesc}`}>{type.desc}</div>
                    {formData.type === type.id && (
                      <div className={`${styles.radioCheck} nm-inset-sm`}>
                        <div className={styles.radioCheckInner} />
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className={`${styles.formBox} nm-inset-sm`}>
              {formData.type === 'CHECK_OUT' && (
                <div className={styles.formGrid2}>
                  <div className={styles.displayItem}>
                    <label className={`ui-muted ${styles.inputLabel}`}>Поточний гуртожиток</label>
                    <div className={`${styles.infoDisplayBox} nm-flat`}>
                      {studentProfile?.dormitory?.name || 'Не вказано'}
                    </div>
                  </div>
                  <div className={styles.displayItem}>
                    <label className={`ui-muted ${styles.inputLabel}`}>Поточна кімната</label>
                    <div className={`${styles.infoDisplayBox} nm-flat`}>
                      {studentProfile?.room?.roomNumber || 'Не вказано'}
                    </div>
                  </div>
                  <div className={styles.fullWidth}>
                    <label className={`ui-muted ${styles.inputLabel}`}>Причина виселення</label>
                    <textarea
                      name="checkoutReason"
                      value={formData.checkoutReason}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Завершення навчання, переїзд, тощо..."
                      className="ui-input"
                    />
                  </div>
                </div>
              )}

              {formData.type === 'CHECK_IN' && (
                <div className={styles.formGrid2}>
                  <div className={styles.displayItem}>
                    <label className={`ui-muted ${styles.inputLabel}`}>ПІБ</label>
                    <div className={`${styles.infoDisplayBox} nm-flat`}>
                      {user?.lastName || ''} {user?.firstName || ''}
                    </div>
                  </div>
                  <div className={styles.displayItem}>
                    <label className={`ui-muted ${styles.inputLabel}`}>Курс навчання</label>
                    <div className={`${styles.infoDisplayBox} nm-flat`}>
                      {formData.course} курс
                    </div>
                  </div>
                  <div className={styles.displayItem}>
                    <label className={`ui-muted ${styles.inputLabel}`}>Факультет</label>
                    <div className={`${styles.infoDisplayBox} nm-flat`}>
                      {formData.faculty === 'FI' ? 'Факультет інформатики' : 
                       formData.faculty === 'FEM' ? 'Факультет економіки та менеджменту' :
                       formData.faculty === 'FL' ? 'Факультет лінгвістики' : (formData.faculty || 'Не вказано')}
                    </div>
                  </div>
                  <div className={styles.displayItem}>
                    <label className={`ui-muted ${styles.inputLabel}`}>Категорія пільг</label>
                    <select
                      name="privilegeCategoryId"
                      value={formData.privilegeCategoryId}
                      onChange={handleInputChange}
                      className="ui-input"
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
              <h3 className={styles.subSectionTitle}>Скан-копії документів</h3>
              
              {formData.type === 'CHECK_IN' && (
                <div className={styles.dropzoneList}>
                  {renderDropZone('passportFiles', 'Паспорт', 'Скан-копія паспорта (PDF, JPG, PNG)')}
                  {renderDropZone('idCodeFiles', 'Ідентифікаційний код', 'Скан-копія РНОКПП (ІПН)')}
                  {renderDropZone('medCardFiles', 'Медична довідка', 'Форма 086/о або аналогічна')}
                  {formData.privilegeCategoryId && (
                    renderDropZone('privilegeFiles', 'Документи про пільги', 'Скан-копії документів, що підтверджують пільгу')
                  )}
                </div>
              )}
              
              {formData.type === 'CHECK_OUT' && (
                <div className={styles.dropzoneList}>
                  {renderDropZone('checkoutFiles', 'Документи для виселення', 'Завантажте необхідні документи, наприклад, обхідний лист')}
                </div>
              )}
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className={styles.stepContent}>
            <div>
              <h2 className={styles.stepTitle}>Психометрична анкета</h2>
              <p className={`ui-muted ${styles.consentDesc}`}>
                Ваші відповіді допоможуть нашому AI-алгоритму підібрати вам ідеальних сусідів по кімнаті за допомогою K-means кластеризації.
              </p>
            </div>

            <div className={`${styles.formBox} nm-inset-sm`}>
              {/* Chronotype */}
              <div>
                <div className={styles.sliderHeader}>
                  <label className={styles.sliderLabel}>Хронотип (Режим сну)</label>
                  <span className={`${styles.sliderValueBadge} nm-raised-xs`}>{formData.clusteringVector.chronotype}/10</span>
                </div>
                <div className={`${styles.sliderTrackBox} nm-inset-sm`}>
                  <input
                    type="range"
                    min="1" max="10"
                    value={formData.clusteringVector.chronotype}
                    onChange={(e) => handleSliderChange('chronotype', parseInt(e.target.value))}
                    className={`range-slider ${styles.sliderInput}`}
                  />
                </div>
                <div className={`ui-muted ${styles.sliderLabels}`}>
                  <span>Жайворонок (ранок)</span>
                  <span>Сова (ніч)</span>
                </div>
              </div>

              {/* Sociability */}
              <div>
                <div className={styles.sliderHeader}>
                  <label className={styles.sliderLabel}>Соціалізація</label>
                  <span className={`${styles.sliderValueBadge} nm-raised-xs`}>{formData.clusteringVector.sociability}/10</span>
                </div>
                <div className={`${styles.sliderTrackBox} nm-inset-sm`}>
                  <input
                    type="range"
                    min="1" max="10"
                    value={formData.clusteringVector.sociability}
                    onChange={(e) => handleSliderChange('sociability', parseInt(e.target.value))}
                    className={`range-slider ${styles.sliderInput}`}
                  />
                </div>
                <div className={`ui-muted ${styles.sliderLabels}`}>
                  <span>Інтроверт</span>
                  <span>Екстраверт</span>
                </div>
              </div>

              {/* Noise Tolerance */}
              <div>
                <div className={styles.sliderHeader}>
                  <label className={styles.sliderLabel}>Толерантність до шуму</label>
                  <span className={`${styles.sliderValueBadge} nm-raised-xs`}>{formData.clusteringVector.noiseTolerance}/10</span>
                </div>
                <div className={`${styles.sliderTrackBox} nm-inset-sm`}>
                  <input
                    type="range"
                    min="1" max="10"
                    value={formData.clusteringVector.noiseTolerance}
                    onChange={(e) => handleSliderChange('noiseTolerance', parseInt(e.target.value))}
                    className={`range-slider ${styles.sliderInput}`}
                  />
                </div>
                <div className={`ui-muted ${styles.sliderLabels}`}>
                  <span>Абсолютна тиша</span>
                  <span>Не звертаю уваги</span>
                </div>
              </div>

              {/* Cleanliness */}
              <div>
                <div className={styles.sliderHeader}>
                  <label className={styles.sliderLabel}>Ставлення до чистоти</label>
                  <span className={`${styles.sliderValueBadge} nm-raised-xs`}>{formData.clusteringVector.cleanliness}/10</span>
                </div>
                <div className={`${styles.sliderTrackBox} nm-inset-sm`}>
                  <input
                    type="range"
                    min="1" max="10"
                    value={formData.clusteringVector.cleanliness}
                    onChange={(e) => handleSliderChange('cleanliness', parseInt(e.target.value))}
                    className={`range-slider ${styles.sliderInput}`}
                  />
                </div>
                <div className={`ui-muted ${styles.sliderLabels}`}>
                  <span>Творчий безлад</span>
                  <span>Педантична чистота</span>
                </div>
              </div>

              {/* Data Consent */}
              <div className={styles.consentBox}>
                <label className={`${styles.consentLabel} group`}>
                  <div className={styles.consentCheckboxBox}>
                    <input
                      type="checkbox"
                      name="consent"
                      checked={formData.consent}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className={`${styles.consentCheckbox} ${
                      formData.consent ? `${styles.consentCheckboxChecked} nm-inset-sm` : `${styles.consentCheckboxUnchecked} nm-flat`
                    }`}>
                      {formData.consent && <CheckCircle className={styles.consentCheckIcon} />}
                    </div>
                  </div>
                  <div className={styles.consentText}>
                    <p className={styles.consentTitle}>Згода на автоматизовану обробку даних</p>
                    <p className={`ui-muted ${styles.consentDesc}`}>
                      Я даю згоду на використання моїх психометричних даних AI-алгоритмом для підбору сусідів. Дані будуть використані виключно для розрахунку сумісності та формування плану поселення.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className={styles.step3Content}>
            <div className={`${styles.diiaIconBox} nm-inset-sm`}>
              <Smartphone className={styles.diiaIconSvg} />
            </div>
            <h2 className={styles.diiaTitle}>Верифікація особи</h2>
            <p className={`ui-muted ${styles.diiaDesc}`}>
              Останній крок перед подачею заяви. Пройдіть швидку верифікацію через застосунок Дія.Шеринг, щоб підтвердити вашу особу та автоматично підтягнути необхідні дані.
            </p>
            
            <div>
              <button
                onClick={openDiiaModal}
                disabled={isDiiaLoading}
                className={styles.diiaButton}
              >
                <span className={styles.diiaButtonText}>
                  {isDiiaLoading ? 'ЗАВАНТАЖЕННЯ...' : 'ПРОЙТИ ВЕРИФІКАЦІЮ В ДІЇ'}
                </span>
              </button>
            </div>

            <div className={`ui-muted ${styles.diiaFooterText}`}>
              Ваші дані надійно захищені та використовуються виключно для формування наказу на поселення.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <div className="ui-card overflow-hidden transition-colors">
        {/* Stepper Header */}
        <div className={styles.stepperHeader}>
          <div className={styles.stepperInner}>
            {/* Progress line background */}
            <div className={`${styles.progressBackground} nm-inset-sm`} />
            
            {/* Active progress line */}
            <div className={styles.progressForeground}>
              <div 
                className={styles.progressFill}
                style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
              />
            </div>

            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className={styles.stepItem}>
                  <div 
                    className={`${styles.stepIconBox} ${
                      isActive ? `${styles.stepIconActive} nm-inset-sm` :
                      isCompleted ? `${styles.stepIconCompleted} nm-raised` : `${styles.stepIconPending} nm-flat`
                    }`}
                  >
                    {isCompleted ? <CheckCircle className={styles.iconSvg} /> : <Icon className={styles.iconSvg} />}
                  </div>
                  <span className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : 'ui-muted'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className={styles.contentBox}>
          {renderStepContent()}
        </div>

        {/* Navigation Actions */}
        <div className={styles.actionFooter}>
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
        <div className={`nm-modal-backdrop ${styles.modalBackdrop}`}>
          <div className={`nm-modal-content ${styles.modalContent}`}>
            <button 
              onClick={closeDiiaModal}
              className={`${styles.modalClose} nm-flat hover:nm-inset-sm`}
            >
              <X className={styles.iconSvg} />
            </button>
            {diiaSessionId && diiaData ? (
              <DiiaSocketListener onSuccess={handleDiiaSuccess} sessionId={diiaSessionId} diiaData={diiaData} />
            ) : (
              <div className={`ui-muted ${styles.modalLoading}`}>ЗАВАНТАЖЕННЯ ДАНИХ ДЛЯ ДІЇ...</div>
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
