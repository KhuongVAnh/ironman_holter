"use strict"

const express = require("express")
const controller = require("../controllers/medicalVisitController")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

router.get("/patient/:userId", authenticateToken, controller.getVisitsByPatient)
router.post("/", authenticateToken, controller.createVisit)
router.put("/:visitId", authenticateToken, controller.updateVisit)
router.delete("/:visitId", authenticateToken, controller.deleteVisit)

module.exports = router
