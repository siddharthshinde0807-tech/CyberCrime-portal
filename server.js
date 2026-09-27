const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Serve static files from both public folder AND root directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Temporary in-memory database
let reports = [];

// Fallback route to serve index.html wherever it is located
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
        if (err) {
            res.sendFile(path.join(__dirname, 'index.html'));
        }
    });
});

// 1. Submit Report API
app.post('/api/reports', (req, res) => {
    const { category, description, date, reporter } = req.body;
    
    // Check if reporter field exists and has both Name & Surname
    const nameParts = reporter ? reporter.trim().split(/\s+/) : [];
    
    if (!category || !description || !reporter || nameParts.length < 2) {
        return res.status(400).json({ 
            error: "Category, Description, and Full Name (First Name & Surname) are required." 
        });
    }
    
    const newReport = {
        id: "CR-" + Math.floor(1000 + Math.random() * 9000),
        category: category,
        description: description,
        date: date || new Date().toISOString().split('T')[0],
        reporter: reporter.trim(),
        status: "Pending",
        createdAt: new Date().toISOString()
    };
    
    reports.push(newReport);
    res.status(201).json({ message: "Report submitted successfully!", report: newReport });
});


// 2. Get All Reports API
app.get('/api/reports', (req, res) => {
    res.json(reports);
});

// 3. Search Report Status by ID API
app.get('/api/reports/:id', (req, res) => {
    const report = reports.find(r => r.id.toLowerCase() === req.params.id.toLowerCase());
    if (!report) {
        return res.status(404).json({ error: "Report ID not found." });
    }
    res.json(report);
});

// 4. Update Report Status API
app.patch('/api/reports/:id/status', (req, res) => {
    const { status } = req.body;
    const report = reports.find(r => r.id === req.params.id);
    if (!report) {
        return res.status(404).json({ error: "Report not found." });
    }
    report.status = status;
    res.json({ message: "Status updated successfully.", report });
});

// 5. Dashboard Statistics API
app.get('/api/stats', (req, res) => {
    const stats = {
        total: reports.length,
        pending: reports.filter(r => r.status === 'Pending').length,
        investigating: reports.filter(r => r.status === 'Under Investigation').length,
        resolved: reports.filter(r => r.status === 'Resolved').length
    };
    res.json(stats);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
