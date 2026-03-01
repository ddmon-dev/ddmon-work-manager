export interface BusinessInfo {
  id: string;
  name?: string | null;
  ceo?: string | null;
  bizNumber?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublisherInfo {
  bizName?: string;
  ceo?: string;
  bizNumber?: string;
  address?: string;
  issuer?: string;
  phone?: string;
  email?: string;
}
