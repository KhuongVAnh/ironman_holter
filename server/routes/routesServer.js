const express = require("express")
const router = express.Router()

router.get("/readings", async (req, res) => {
    const { Reading } = require("../models");
    const data = await Reading.findAll({
        order: [["timestamp", "DESC"]],
        limit: 20,
    });
    res.render("readings", { readings: data });
});

module.exports = router