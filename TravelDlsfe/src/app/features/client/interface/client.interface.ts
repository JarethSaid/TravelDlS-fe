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
  details?: OrderDetail[];
}

export interface OrderTracking {
  id: number;
  orderId: number;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderDetail {
  idDetails: number;
  idOrder: number;
  idDriver: number | null;
  cargoDescription: string;
  amount: number;
  unitWeight: string;
  deliveryAddress: string;
  typePackaging: string;
  createdAt: string;
  updatedAt: string;
  driver?: { idDriver: number; name: string } | null;
}

/** Payload local para el carrito (antes de enviar al backend) */
export interface OrderDetailDraft {
  cargoDescription: string;
  amount: number;
  weightValue: number | null;
  weightUnit: string;
  unitWeight: string;
  deliveryAddress: string;
  typePackaging: string;
}

export const PACKAGING_TYPES: { value: string; label: string }[] = [
  { value: 'pallet',     label: 'Pallet' },
  { value: 'caja',       label: 'Caja' },
  { value: 'granel',     label: 'Granel' },
  { value: 'contenedor', label: 'Contenedor' },
  { value: 'bidon',      label: 'Bidón' },
  { value: 'saco',       label: 'Saco' },
  { value: 'atado',      label: 'Atado' },
  { value: 'otro',       label: 'Otro' },
];

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

export interface Company {
  idCompany: number;
  businessName: string;
  ruc: string;
  photoUrl: string | null;
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
