export interface User {
  id: string;
  name: string;
  email: string;
  role: "doctor" | "assistant";
}

export interface Patient {
  id: string;
  name: string;
  age: number | null;
  phone: string | null;
  address: string | null;
  status: "pending" | "approved" | "treated";
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  paymentStatus: "clear" | "due" | "processing" | null;
}

export interface Billing {
  id: string;
  patientId: string;
  totalBill: string;
  amountPaid: string;
  paymentStatus: "clear" | "due" | "processing";
  updatedAt: string;
}

export interface Treatment {
  id: string;
  patientId: string;
  notes: string | null;
  completed: boolean;
  completedAt: string | null;
  updatedBy: string;
}

export interface LoginResponse {
  status: string;
  accessToken: string;
  user: {
    id: string;
    name: string;
    role: "doctor" | "assistant";
  };
}

export interface PaginatedResponse<T> {
  status: string;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ApiResponse<T> {
  status: string;
  data: T;
}
