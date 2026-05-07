import { getPOSDashboardService } from "../services/posDashboard.service.js";

export const getPOSDashboard = async (req, res) => {
  try {
    const data = await getPOSDashboardService(req.query);

    res.json(data);
  } catch (err) {
    console.error("POS DASHBOARD ERROR:", err);

    res.status(500).json({
      message: err.message || "Failed to load POS dashboard",
    });
  }
};
