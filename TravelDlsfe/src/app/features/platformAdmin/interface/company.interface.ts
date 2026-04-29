export interface Company {
  idCompany: number;
  businessName: string;
  ruc: string;
  photoUrl: string | null;
  deletedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyPaginator {
  meta: {
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
    firstPage: number;
  };
  data: Company[];
}

export interface CreateCompanyDto {
  businessName: string;
  ruc: string;
  photoUrl?: string | null;
}

export interface UpdateCompanyDto {
  businessName?: string;
  ruc?: string;
  photoUrl?: string | null;
}
