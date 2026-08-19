import { createRequire } from "module";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing records
  await prisma.leaderboard.deleteMany();
  await prisma.character.deleteMany();
  await prisma.map.deleteMany();

  await prisma.map.create({
    data: {
      slug: "doraemon",
      title: "Doraemon",
      imageUrl: "/DORAEMON.png",
      characters: {
        create: [
          { name: "Doraemon", minX: 77.0, maxX: 82.0, minY: 76.0, maxY: 84.0 },
          { name: "Nobita", minX: 22.5, maxX: 26.0, minY: 54.0, maxY: 61.5 },
          { name: "Shizuka", minX: 36.5, maxX: 40.5, minY: 52.5, maxY: 59.0 },
        ],
      },
    },
  });
  await prisma.map.create({
    data: {
      slug: "it",
      title: "IT Festival",
      imageUrl: "/IT.png",
      characters: {
        create: [
          { name: "Pennywise", minX: 64.0, maxX: 68.5, minY: 39.0, maxY: 50.5 },
          { name: "Bill", minX: 38.5, maxX: 42.0, minY: 41.5, maxY: 49.5 },
          { name: "Beverly", minX: 49.0, maxX: 52.5, minY: 71.0, maxY: 80.0 },
        ],
      },
    },
  });
  await prisma.map.create({
    data: {
      slug: "lotr",
      title: "Lord of the Rings",
      imageUrl: "/LOTR.png",
      characters: {
        create: [
          { name: "Aragorn", minX: 47.5, maxX: 51.5, minY: 52.0, maxY: 60.0 },
          { name: "Legolas", minX: 72.0, maxX: 75.5, minY: 55.0, maxY: 63.5 },
          { name: "Gimli", minX: 70.0, maxX: 73.5, minY: 74.0, maxY: 82.5 },
        ],
      },
    },
  });

  console.log("Database seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
