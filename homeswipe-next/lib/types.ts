export interface Listing {
  id: number;
  price: number;
  address: string;
  city: string;
  state: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  imageUrl: string;
  propertyType: string;
  subtype?: string | null;
  description: string;
  saved: boolean;
}
