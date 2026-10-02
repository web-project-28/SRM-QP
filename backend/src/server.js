import express from "express";
import cors from "cors";
import { searchQuestionPapers, refreshIndex } from "./search.js";

const app = express();

const PORT = process.env.PORT || 4000;

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || "https://web-project-28.github.io";

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  })
);

app.use(express.json());

/* Health check */
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "SRM AP Question Paper Finder"
  });
});

/* Search question papers */
app.get("/api/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.status(400).json({
        error: "Missing q"
      });
    }

    const results = await searchQuestionPapers(q);

    return res.json({
      query: q,
      count: results.length,
      results
    });
  } catch (error) {
    console.error("Search error:", error);

    return res.status(500).json({
      error: "Search failed"
    });
  }
});

/* Manual refresh */
app.post("/api/admin/refresh", async (_req, res) => {
  try {
    const result = await refreshIndex();

    return res.json(result);
  } catch (error) {
    console.error("Refresh error:", error);

    return res.status(500).json({
      error: "Refresh failed"
    });
  }
});

/* Root endpoint */
app.get("/", (_req, res) => {
  res.json({
    service: "SRM AP Question Paper Finder Backend",
    status: "running"
  });
});

app.listen(PORT, () => {
  console.log(
    `SRM AP Question Paper Finder backend running on port ${PORT}`
  );
});
