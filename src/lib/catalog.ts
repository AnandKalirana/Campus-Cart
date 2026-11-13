import type { LucideIcon } from "lucide-react";
import { Backpack, BookOpen, Bike, Headphones, Home, LayoutGrid, Laptop, PencilLine, Shirt, Sofa, Dumbbell } from "lucide-react";

export type Condition = "Like new" | "Good" | "Used";
export const CONDITIONS = ["All conditions", "Like new", "Good", "Used"] as const;

export interface Category { slug: string; name: string; blurb: string; icon: LucideIcon }

export const CATEGORIES: Category[] = [
  { slug: "all", name: "All finds", blurb: "Explore the marketplace", icon: LayoutGrid },
  { slug: "books", name: "Books", blurb: "Textbooks & good reads", icon: BookOpen },
  { slug: "stationery", name: "Stationery", blurb: "Tools for your next idea", icon: PencilLine },
  { slug: "laptops", name: "Laptops", blurb: "Upgrade for less", icon: Laptop },
  { slug: "electronics", name: "Electronics", blurb: "Tech you'll love", icon: Headphones },
  { slug: "hostel-essentials", name: "Hostel essentials", blurb: "Make yourself at home", icon: Home },
  { slug: "bicycles", name: "Bicycles", blurb: "Ride across campus", icon: Bike },
  { slug: "furniture", name: "Furniture", blurb: "Settle in comfortably", icon: Sofa },
  { slug: "clothing", name: "Clothing & accessories", blurb: "Wear it again", icon: Shirt },
  { slug: "sports", name: "Sports & fitness", blurb: "Stay active, spend less", icon: Dumbbell },
  { slug: "other", name: "Other essentials", blurb: "Everything else you need", icon: Backpack },
];

/** DEMO DATA ONLY — replaced by database-backed listings in Phase 4. Not real inventory. */
export interface DemoProduct {
  id: string; title: string; categorySlug: string; categoryLabel: string; description: string;
  condition: Condition; price: number; originalPrice: number; distance: string; image: string; imageAlt: string;
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  { id: "demo-macbook-air-m1", title: "MacBook Air M1 · 256GB", categorySlug: "laptops", categoryLabel: "Laptops", description: "8GB RAM · Space gray", condition: "Like new", price: 35000, originalPrice: 83900, distance: "0.3 mi away", image: "/images/demo/laptop.svg", imageAlt: "Open silver laptop on a pale studio background" },
  { id: "demo-semester-stack", title: "The semester starter stack", categorySlug: "books", categoryLabel: "Books", description: "Calculus, physics & design · Set of 3", condition: "Good", price: 450, originalPrice: 3800, distance: "On campus", image: "/images/demo/books.svg", imageAlt: "Stack of three hardcover textbooks" },
  { id: "demo-sony-xm4", title: "Sony WH-1000XM4", categorySlug: "electronics", categoryLabel: "Electronics", description: "Noise cancelling · Black", condition: "Like new", price: 12000, originalPrice: 29000, distance: "0.5 mi away", image: "/images/demo/headphones.svg", imageAlt: "Black over-ear headphones" },
  { id: "demo-desk-lamp", title: "A little light for late nights", categorySlug: "hostel-essentials", categoryLabel: "Hostel essentials", description: "Adjustable desk lamp · Sage", condition: "Like new", price: 800, originalPrice: 2100, distance: "0.2 mi away", image: "/images/demo/lamp.svg", imageAlt: "Sage green adjustable desk lamp" },
];

export const formatINR = (n: number) => "₹" + new Intl.NumberFormat("en-IN").format(n);

export const CAMPUSES = ["University of Washington", "IIT Bombay", "TCET Mumbai", "University of Mumbai", "VJTI Mumbai"] as const;
