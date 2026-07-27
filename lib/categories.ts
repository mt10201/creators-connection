export const productCategories = [
  "Jewelry",
  "Home Décor",
  "Clothing",
  "Painting",
  "Sculpting",
  "Woodworking",
  "Furniture",
  "Electronics",
  "Toys",
  "Designs",
  "Unique Craft",
] as const;

export type ProductCategory = (typeof productCategories)[number];
