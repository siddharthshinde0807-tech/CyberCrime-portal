const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Feature 1: Rate Limiting (Prevents Spam & Brute Force)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { error: "Too many requests. Please try again later." }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 PIN attempts allowed every 15 minutes
    message: { error: "Too many failed login attempts. Locked for 15 minutes." }
});

app.use(generalLimiter);
app.use(cors());
app.use(bodyParser.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

let reports = [];

// Secure Server-side PIN (Change if desired)
const OFFICER_PIN = "1930";

// Security Feature 2: Secure Admin Authentication Endpoint
app.post('/api/admin/verify-pin', authLimiter, (req, res) => {
    const { pin } = req.body;
    if (pin === OFFICER_PIN) {
        return res.json({ success: true, message: "Access Granted" });
    }
    res.status(401).json({ error: "Invalid Officer PIN. Access Denied." });
});

// Fallback route for static layout
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
        if (err) res.sendFile(path.join(__dirname, 'index.html'));
    });
});

// Submit Report API
app.post('/api/reports', (req, res) => {
    const { category, description, date, reporter } = req.body;
    
    // Sanitize string length to prevent memory buffer overflow attacks
    if (!category || !description || !reporter) {
        return res.status(400).json({ error: "All required fields must be filled." });
    }

    const nameParts = reporter.trim().split(/\s+/);
    if (nameParts.length < 2) {
        return res.status(400).json({ error: "Full Name (First Name & Surname) is required." });
    }

    const newReport = {
        id: "CR-" + Math.floor(1000 + Math.random() * 9000),
        category: category.slice(0, 100),
        description: description.slice(0, 1000), // Max 1000 chars
        date: date || new Date().toISOString().split('T')[0],
        reporter: reporter.trim().slice(0, 100),
        status: "Pending",
        createdAt: new Date().toISOString()
    };
    
    reports.push(newReport);
    res.status(201).json({ message: "Report submitted successfully!", report: newReport });
});

app.get('/api/reports', (req, res) => {
    res.json(reports);
});

app.get('/api/reports/:id', (req, res) => {
    const report = reports.find(r => r.id.toLowerCase() === req.params.id.toLowerCase());
    if (!report) return res.status(404).json({ error: "Report ID not found." });
    res.json(report);
});

app.patch('/api/reports/:id/status', (req, res) => {
    const { status } = req.body;
    const report = reports.find(r => r.id === req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found." });
    report.status = status;
    res.json({ message: "Status updated successfully.", report });
});

app.get('/api/stats', (req, res) => {
    res.json({
        total: reports.length,
        pending: reports.filter(r => r.status === 'Pending').length,
        investigating: reports.filter(r => r.status === 'Under Investigation').length,
        resolved: reports.filter(r => r.status === 'Resolved').length
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
