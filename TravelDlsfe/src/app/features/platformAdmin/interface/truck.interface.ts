export interface Truck {
  idTruck: number;
  idCompany: number;
  idDriver: number | null;
  idCategory: number | null;
  chassis: string;
  plate: string;
  status?: string;
  deletedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  company?: { idCompany: number; businessName: string };
  driver?: { idDriver: number; user?: { name: string } };
  category?: { idCategory: number; nameCategory: string };
}

export interface TruckPaginator {
  meta: {
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
    firstPage: number;
  };
  data: Truck[];
}

export interface CreateTruckDto {
  idCompany: number;
  idDriver?: number | null;
  idCategory?: number | null;
  chassis: string;
  plate: string;
  status?: string;
}

export interface UpdateTruckDto {
  idCompany?: number;
  idDriver?: number | null;
  idCategory?: number | null;
  chassis?: string;
  plate?: string;
  status?: string;
}
