import express from "express";
import {
  getBusiness,
  createBusiness,
  updateBusiness,
  deleteBusiness,
} from "../controllers/business.controller.js";

const router = express.Router();

/*----------------------------------------
  BUSINESS ROUTES (PUBLIC)
------------------------------------------*/
//LIST ALL BUSINESSES
router.get("/", getBusiness);

//CREATE NEW BUSINESS
router.post("/", createBusiness);

//UPDATE BUSINESS
router.put("/:business_id", updateBusiness);

//DELETE BUSINESS
router.delete("/:business_id", deleteBusiness);

export default router;
