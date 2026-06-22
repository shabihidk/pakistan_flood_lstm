export type BoundaryLevel = 'province' | 'district' | 'tehsil';

export interface RegionFilter {
  level: 'country' | 'province' | 'district' | 'tehsil';
  province?: string;
  district?: string;
  tehsil?: string;
  regionId?: string;
  regionName?: string;
}

export interface AdminFeatureProps {
  id: string;
  name: string;
  level: BoundaryLevel | 'province';
  province: string;
  district?: string;
}

export const COUNTRY_FILTER: RegionFilter = {
  level: 'country',
  regionId: 'pk',
  regionName: 'Pakistan',
};
