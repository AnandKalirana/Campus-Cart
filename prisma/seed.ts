/**
 * Seeds reference data only: categories and campuses. No users, no listings.
 * Campus rows are PLACEHOLDERS. emailDomains is empty on purpose: an admin must set the real
 * institutional domains before students can verify against a campus.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required to seed");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const categories = [
  ["books", "Books", "Textbooks & good reads", "BookOpen"],
  ["stationery", "Stationery", "Tools for your next idea", "PencilLine"],
  ["laptops", "Laptops", "Upgrade for less", "Laptop"],
  ["electronics", "Electronics", "Tech you'll love", "Headphones"],
  ["hostel-essentials", "Hostel essentials", "Make yourself at home", "Home"],
  ["bicycles", "Bicycles", "Ride across campus", "Bike"],
  ["furniture", "Furniture", "Settle in comfortably", "Sofa"],
  ["clothing", "Clothing & accessories", "Wear it again", "Shirt"],
  ["sports", "Sports & fitness", "Stay active, spend less", "Dumbbell"],
  ["other", "Other essentials", "Everything else you need", "Backpack"],
] as const;

const universities = [
  ["University of Washington", "university-of-washington"],
  ["IIT Bombay", "iit-bombay"],
  ["TCET Mumbai", "tcet-mumbai"],
  ["University of Mumbai", "university-of-mumbai"],
  ["VJTI Mumbai", "vjti-mumbai"],
] as const;

async function main() {
  for (const [i, [slug, name, blurb, icon]] of categories.entries()) {
    await prisma.category.upsert({ where: { slug }, update: { name, blurb, icon, sortOrder: i + 1 }, create: { slug, name, blurb, icon, sortOrder: i + 1 } });
  }
  for (const [name, slug] of universities) {
    await prisma.university.upsert({ where: { slug }, update: {}, create: { name, slug, emailDomains: [] } });
  }
  console.log(`Seeded ${categories.length} categories and ${universities.length} placeholder campuses.`);
}

main().finally(() => prisma.$disconnect());
