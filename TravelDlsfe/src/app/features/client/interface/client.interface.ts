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
  payment?: Payment | null;
}

export interface OrderTracking {
  id: number;
  orderId: number;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'card' | 'transfer';
export type PaymentStatus = 'pendiente' | 'pagado' | 'fallido' | 'cancelado';

export interface Payment {
  idPayment: number;
  idOrder: number;
  idClient: number;
  idCompany: number;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  billingEmail: string;
  cardHolderName: string | null;
  cardBrand: string | null;
  last4: string | null;
  transferReference: string | null;
  referenceCode: string;
  cancellationReason?: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  order?: { idOrder: number; status: string } | null;
  client?: { companyName?: string; user?: { name?: string; email?: string } } | null;
  company?: { businessName?: string } | null;
}

export interface PaymentPaginator {
  meta: {
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
    firstPage: number;
  };
  data: Payment[];
  summary?: { totalAmount: number };
}

export interface SimulatePaymentPayload {
  method: PaymentMethod;
  billingEmail: string;
  cardHolderName?: string;
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
  transferReference?: string;
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
