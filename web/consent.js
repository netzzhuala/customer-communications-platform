const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const Call = require('../models/call');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Serve the consent form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'consent.html'));
});

// Process consent form submission
app.post('/consent', async (req, res) => {
    try {
        const { name, phone, email, consent } = req.body;
        
        if (!consent) {
            return res.status(400).send('Consent is required');
        }
        
        // Check if number already exists
        const existingContact = await Call.findOne({ phoneNumber: phone });
        
        if (existingContact) {
            // Update existing consent
            existingContact.consentSource = 'web_form';
            existingContact.consentTimestamp = new Date();
            existingContact.consentIP = req.ip;
            await existingContact.save();
        } else {
            // Create new consent record
            const newContact = new Call({
                phoneNumber: phone,
                consentSource: 'web_form',
                consentTimestamp: new Date(),
                consentIP: req.ip
            });
            await newContact.save();
        }
        
        res.send(`
            <html>
            <body>
                <h1>Thank You!</h1>
                <p>Your information has been submitted. We will contact you soon.</p>
                <p>If you change your mind, you can opt out at any time by replying STOP to our messages.</p>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error processing consent:', error);
        res.status(500).send('An error occurred. Please try again.');
    }
});

module.exports = app;
