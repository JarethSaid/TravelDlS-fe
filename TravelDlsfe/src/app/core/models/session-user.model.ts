export interface SessionUser {
  idUser: number;
  email: string;
  name: string;
  role: string | null;
  idClient: number | null;
  idCompany: number | null;
  idDriver: number | null;
}
