/**
 * SAMPLE DATA ONLY. The dashboard UI renders this until listings, messages and wishlists exist
 * (Phases 4-5). The page shows a visible "sample data" label; never present this as the user's real activity.
 */
export type ListingStatus = "active" | "draft" | "sold";
export interface SampleListing { id: string; title: string; category: string; age: string; price: number; views: number; saves: number; status: ListingStatus; image: string; alt: string }

export const SAMPLE_LISTINGS: SampleListing[] = [
  { id: "l1", title: "Semester Starter Stack", category: "Books", age: "2 days ago", price: 450, views: 48, saves: 6, status: "active", image: "/images/demo/books.svg", alt: "Stack of textbooks" },
  { id: "l2", title: "Sony WH-1000XM4", category: "Electronics", age: "5 days ago", price: 12000, views: 76, saves: 9, status: "active", image: "/images/demo/headphones.svg", alt: "Black over-ear headphones" },
  { id: "l3", title: "A Little Light For Late Nights", category: "Hostel essentials", age: "3 days ago", price: 800, views: 32, saves: 4, status: "active", image: "/images/demo/lamp.svg", alt: "Adjustable desk lamp" },
  { id: "l4", title: "MacBook Air M1 // 256GB", category: "Laptops", age: "1 day ago", price: 35000, views: 21, saves: 3, status: "active", image: "/images/demo/laptop.svg", alt: "Silver laptop" },
  { id: "d1", title: "Hostel Mini Fridge (draft)", category: "Hostel essentials", age: "Not published", price: 4500, views: 0, saves: 0, status: "draft", image: "/images/demo/lamp.svg", alt: "Draft listing placeholder" },
  ...[["Calculus Notes Bundle", 150], ["Scientific Calculator", 600], ["Desk Organiser", 250], ["Study Lamp Clamp", 300], ["Drafting Kit", 900]].map(([title, price], i): SampleListing =>
    ({ id: `s${i}`, title: title as string, category: "Sold", age: "Last month", price: price as number, views: 20 + i * 7, saves: 2 + i, status: "sold", image: "/images/demo/books.svg", alt: "Sold item placeholder" })),
];

export const SAMPLE_INBOX = [
  { id: "m1", name: "Jamie L.", ago: "2m ago", text: "Is the book set still available for pickup today?", unread: 2 },
  { id: "m2", name: "Sam R.", ago: "18m ago", text: "Can I pick it up after class at the library?", unread: 0 },
];

export const SAMPLE_PICKUP = { title: "Textbook pickup with Maya", place: "Main library, main entrance", when: "TODAY, 4:30 PM" };
export const SAMPLE_STATS = { active: 4, unread: 3, conversations: 2, earned: 15000, saved: 8 };
