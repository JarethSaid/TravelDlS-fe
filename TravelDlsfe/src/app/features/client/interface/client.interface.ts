export interface ClientProfile {
  idClient: number;
  companyName: string;
  ruc: string;
  address: string;
  typeClient: 'legal' | 'natural';
  photoUrl: string | null;
  user?: { name: string; email: string; phone?: string };
}

export interface ClientOrder {
  idOrder: number;
  idClient: number;
  idCompany: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  company?: { idCompany: number; businessName: string };
}

export interface OrderPaginator {
  meta: {
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
    firstPage: number;
  };
  data: ClientOrder[];
}
