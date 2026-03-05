export interface Order {
  id: number;
  order_number: string;
  order_date: string;
  customer_name: string;
  customer_contact: string;
  delivery_charges: number;
  outsource_charges: number;
  customer_address: string;
  map_pin: string;
  profit?: number;
  created_at: string;
}

export interface Stats {
  total_orders: number;
  total_delivery: number;
  total_outsource: number;
  total_profit: number;
}

export interface Profile {
  company_name: string;
  company_email: string;
  company_phone: string;
  company_logo: string | null;
}

export type FilterPeriod = 'today' | 'this_month' | 'last_3_months' | 'last_6_months' | 'yearly' | 'custom';
