import type { PaymentMethod } from "../types";

export const SITE_NAME = "Odhay BD";
export const SITE_TAGLINE = "Bangladesh's Book Universe";

export const FREE_SHIPPING_THRESHOLD = 1000;
export const FLAT_SHIPPING = 60;
export const DHAKA_SHIPPING = 60;
export const OUTSIDE_SHIPPING = 120;

export const DISTRICTS = [
  "Dhaka",
  "Chattogram",
  "Sylhet",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Rangpur",
  "Mymensingh",
  "Cumilla",
  "Gazipur",
];

export const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  hint: string;
}[] = [
  {
    id: "cod",
    label: "Cash on Delivery",
    hint: "Pay when you receive",
  },
  { id: "bkash", label: "bKash", hint: "Mobile wallet" },
  { id: "nagad", label: "Nagad", hint: "Mobile wallet" },
  { id: "rocket", label: "Rocket", hint: "Mobile wallet" },
  {
    id: "sslcommerz",
    label: "SSLCommerz",
    hint: "Cards & banking",
  },
  {
    id: "stripe",
    label: "Stripe",
    hint: "International cards",
  },
];

export const SORT_OPTIONS: { value: string; label: string }[] =
  [
    { value: "popularity", label: "Popularity" },
    { value: "newest", label: "Newest" },
    { value: "price_asc", label: "Price: Low to High" },
    { value: "price_desc", label: "Price: High to Low" },
    { value: "rating", label: "Top Rated" },
  ];

export const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "All Books", to: "/books" },
  { label: "Bestsellers", to: "/books?flag=bestseller" },
  { label: "New Arrivals", to: "/books?flag=new" },
  { label: "Authors", to: "/authors" },
  { label: "Publishers", to: "/publishers" },
  { label: "Blog", to: "/blog" },
];