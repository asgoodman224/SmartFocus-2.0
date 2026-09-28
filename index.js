require("dotenv").config();

const express = require("express");
const db = require("./db");

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err.message);
        return;
    }

    console.log("Connected to MySQL!");
});

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/", (req, res) => {
    res.send("SmartFocus API is running!");
});

app.get("/users", (req, res) => {
    db.query("SELECT * FROM users", (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json(results);
    });
});

app.get("/health-data", (req, res) => {
    db.query("SELECT * FROM daily_health_data", (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json(results);
    });
});

app.listen(PORT, () => {
    console.log(`SmartFocus API running on port ${PORT}`);
});