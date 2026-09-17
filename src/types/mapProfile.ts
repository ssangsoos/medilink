/** Public-map display data only. Never resolve masked values into private data. */
export interface MapProfile {
  id: string;
  role?: string;
  name?: string;
  hospital_name?: string;
  hospital_type?: string;
  license_type?: string;
  phone?: string;
  mobile_phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  work_radius?: number | null;
  acceptsSms?: boolean;
  accepts_sms?: boolean;
  bio?: string;
  experience?: string;
  desired_hourly_rate?: number | null;
  available_from?: string;
  work_pattern?: string[];
  available_days?: string[];
  available_times?: string[];
  seeking_positions?: string[];
  offered_hourly_rate?: number | null;
  employment_type?: string;
}
