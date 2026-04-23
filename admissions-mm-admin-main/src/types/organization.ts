export interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  logoUrl?: string;
  subscriptionStart: string;
  subscriptionEnd: string;
  status: "active" | "expired" | "suspended" | string;
  createdAt: string;
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  logoUrl?: string;
  subscriptionStart: string;
  subscriptionEnd: string;
}
