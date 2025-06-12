// types/contract.ts
export interface Party {
  name: string;
  email: string;
  role: string;
  signed: boolean;
  signedAt?: string;
  signatureData?: string;
}

export interface Contract {
  _id: string;
  userId: string;
  title: string;
  content: string;
  parties: Party[];
  status: string;
}