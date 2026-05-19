export type Role = 'STUDENT' | 'ADMIN' | 'ADMIN_CAMPUS' | 'ADMIN_COMMANDANT' | 'MASTER_SLESAR' | 'MASTER_SANTEKHNIK' | 'MASTER_ELECTRIC';

export type RoomStatus = 'AVAILABLE' | 'FULL' | 'MAINTENANCE';

export type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrivilegeCategory {
  id: string;
  name: string;
  multiplier: number;
  description: string;
}

export interface ClusteringVector {
  chronotype: number; // 1-10: 1 - Яскраво виражений "Жайворонок", 10 - Яскраво виражена "Сова"
  sociability: number; // 1-10: 1 - Інтроверт (любить тишу), 10 - Екстраверт (любить компанії)
  noiseTolerance: number; // 1-10: 1 - Абсолютна тиша, 10 - Висока толерантність до шуму
  cleanliness: number; // 1-10: 1 - Творчий безлад, 10 - Педантична чистота
}

export interface StudentProfile {
  id: string;
  userId: string;
  studentIdNumber: string; // Номер студентського квитка
  course: number; // Курс (1-6)
  faculty: string;
  privilegeCategoryId: string | null;
  clusteringVector: ClusteringVector | null;
  priorityScore: number;
  groupId: string | null;
  user?: User;
  privilege?: PrivilegeCategory;
}

export interface Dormitory {
  id: string;
  name: string;
  address: string;
  totalCapacity: number;
  floors: Floor[];
}

export interface Floor {
  id: string;
  dormitoryId: string;
  floorNumber: number;
  rooms: Room[];
}

export interface Room {
  id: string;
  floorId: string;
  roomNumber: string;
  capacity: number;
  currentOccupancy: number;
  status: RoomStatus;
  occupants?: StudentProfile[];
}

export interface Application {
  id: string;
  studentId: string;
  status: ApplicationStatus;
  scanDocumentsUrl: string[];
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  student?: StudentProfile;
}

export interface GroupReferral {
  id: string;
  code: string;
  creatorId: string;
  maxMembers: number;
  currentMembers: number;
  members: StudentProfile[];
  createdAt: string;
  expiresAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}
