import type { Condition, ListingType, SizeCategory } from "@/types";

export interface ReviewFormData {
  listing_type: ListingType;
  title: string;
  description: string;
  category: string;
  condition: Condition;
  price: number | null;
  area: string;
  size_category: SizeCategory;
  pickup_address: string;
}
