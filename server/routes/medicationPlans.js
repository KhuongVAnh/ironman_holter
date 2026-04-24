"use strict"

const express = require("express")
const controller = require("../controllers/medicationPlanController")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

router.get("/patient/:userId", authenticateToken, controller.getPlansByPatient)
router.post("/", authenticateToken, controller.createPlan)
router.put("/:planId", authenticateToken, controller.updatePlan)
router.delete("/:planId", authenticateToken, controller.deletePlan)

module.exports = router
