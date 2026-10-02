import express from "express";
import cors from "cors";

import {
  searchQuestionPapers,
  refreshIndex
} from "./search.js";

const app = express();

const PORT = process.env.PORT || 4000;

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ||
  "https://web-project-28.github.io";

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  })
);

app.use(express.json());

/*
 * Health
 */
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "SRM AP Question Paper Finder"
  });
});

/*
 * Search / filter papers
 *
 * Examples:
 *
 * /api/search
 *
 * /api/search?examType=Mid%20Term
 *
 * /api/search?examType=End%20Term&year=2025
 *
 * /api/search?semester=Odd
 *
 * /api/search?q=2025
 */
app.get("/api/search", async (req, res) => {
  try {
    const query = String(
      req.query.q || ""
    ).trim();

    const examType = String(
      req.query.examType || "all"
    ).trim();

    const year = String(
      req.query.year || "all"
    ).trim();

    const semester = String(
      req.query.semester || "all"
    ).trim();

    const results =
      await searchQuestionPapers(
        query,
        {
          examType,
          year,
          semester
        }
      );

    res.json({
      query,
      filters: {
        examType,
        year,
        semester
      },
      count: results.length,
      results
    });

  } catch (error) {
    console.error(
      "Search failed:",
      error
    );

    res.status(500).json({
      error: "Search failed",
      message: error.message
    });
  }
});

/*
 * Manual index refresh
 */
app.post(
  "/api/admin/refresh",
  async (_req, res) => {
    try {
      const result =
        await refreshIndex();

      res.json(result);

    } catch (error) {
      console.error(
        "Refresh failed:",
        error
      );

      res.status(500).json({
        error: "Refresh failed",
        message: error.message
      });
    }
  }
);

/*
 * Root
 */
app.get("/", (_req, res) => {
  res.json({
    service:
      "SRM AP Question Paper Finder Backend",
    status: "running"
  });
});

app.listen(PORT, () => {
  console.log(
    `SRM AP Question Paper Finder running on port ${PORT}`
  );
});
