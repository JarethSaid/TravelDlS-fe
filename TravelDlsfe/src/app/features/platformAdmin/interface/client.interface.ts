export interface Client {
  idClient: number;
  companyName: string;
  ruc: string;
  address: string;
  typeClient: 'legal' | 'natural';
  photoUrl: string | null;
  deletedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientPaginator {
  meta: {
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
    firstPage: number;
  };
  data: Client[];
}

export interface CreateClientDto {
  companyName: string;
  ruc: string;
  address: string;
  typeClient: 'legal' | 'natural';
  photoUrl?: string | null;
}
