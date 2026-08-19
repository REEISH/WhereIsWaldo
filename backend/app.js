import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { createRequire } from "module";

// Load environment variables
dotenv.config();

// ESM workaround for PrismaClient
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

// Initialize the PostgreSQL connection pool and Prisma Adapter
const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Initialize Prisma WITH the adapter
const prisma = new PrismaClient({ adapter });

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend requests (adjust origin if using a different port)
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST']
}));

app.use(express.json());

// Fetch all maps and character names (without exposing coordinates)
app.get("/api/maps", async (req, res) => {
  try {
    const maps = await prisma.map.findMany({
      include: {
        characters: {
          select: { id: true, name: true }, // Exclude minX, maxX, minY, maxY
        },
      },
    });
    res.json(maps);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch maps" });
  }
});

//  Validate click coordinates for a character
app.post("/api/game/validate", async (req, res) => {
  const { mapSlug, characterName, clickX, clickY } = req.body;

  if (
    !mapSlug ||
    !characterName ||
    clickX === undefined ||
    clickY === undefined
  ) {
    return res.status(400).json({ error: "Missing required parameters." });
  }

  try {
    const character = await prisma.character.findFirst({
      where: {
        name: characterName,
        map: { slug: mapSlug },
      },
    });

    if (!character) {
      return res.status(404).json({ error: "Character or map not found." });
    }

    // Check if the click percentage falls within the bounding box
    const isFound =
      clickX >= character.minX &&
      clickX <= character.maxX &&
      clickY >= character.minY &&
      clickY <= character.maxY;

    return res.json({
      found: isFound,
      characterName: character.name,
      message: isFound ? `You found ${character.name}!` : "Keep looking!",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during validation." });
  }
});

// Post a new score to the leaderboard
app.post("/api/leaderboard", async (req, res) => {
  const { mapSlug, playerName, timeInSeconds } = req.body;

  try {
    const map = await prisma.map.findUnique({ where: { slug: mapSlug } });
    if (!map) return res.status(404).json({ error: "Map not found" });

    const score = await prisma.leaderboard.create({
      data: {
        playerName: playerName || "Anonymous",
        timeInSeconds: parseFloat(timeInSeconds),
        mapId: map.id,
      },
    });

    res.status(201).json(score);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to record score." });
  }
});

app.get('/api/leaderboard/:mapSlug', async (req, res) => {
  try {
    const scores = await prisma.leaderboard.findMany({
      where: {
        map: {
          slug: req.params.mapSlug
        }
      },
      orderBy: {
        timeInSeconds: 'asc'
      },
      take: 10,
      select: {
        id: true,
        playerName: true,
        timeInSeconds: true
      }
    });

    res.json(scores);
  } catch (error) {
    console.error("PRISMA ORM ERROR:", error);
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

