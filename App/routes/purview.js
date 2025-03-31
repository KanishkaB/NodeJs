const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (!req.session.account) {
        return res.status(401).json({ error: 'User not authenticated' });
    }
    next();
};

// Helper function to decode JWT token
const decodeToken = (token) => {
    try {
        // Split the token and get the payload part (second part)
        const payload = token.split('.')[1];
        // Decode the base64 payload
        const decodedPayload = Buffer.from(payload, 'base64').toString();
        return JSON.parse(decodedPayload);
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

// Route to query Purview protection scopes
router.post('/query', isAuthenticated, async (req, res) => {
    console.log('[POST /query] Received request');
    try {
        if (!req.session.purviewToken) {
            console.log('[POST /query] Purview token not available');
            return res.status(401).json({ error: 'Purview token not available' });
        }

        // Decode the Purview token to get user information
        const decodedToken = decodeToken(req.session.purviewToken);
        console.log('[POST /query] Decoded Purview token:', decodedToken);
        if (!decodedToken) {
            return res.status(500).json({ error: 'Failed to decode Purview token' });
        }

        console.log('Decoded Purview token:', JSON.stringify(decodedToken, null, 2));

        // Get user ID from token claims (usually in 'oid' or 'sub' claim)
        const userId = decodedToken.oid || decodedToken.sub;
        console.log('[POST /query] User ID:', userId);
        if (!userId) {
            return res.status(500).json({ error: 'User ID not found in token' });
        }

        console.log('Using user ID:', userId);

        const headers = {
            'Authorization': `Bearer ${req.session.purviewToken}`,
            'Content-Type': 'application/json'
        };

        const body = { key1: {} };
        console.log('[POST /query] Making API call with headers:', headers);
        console.log('[POST /query] Request body:', body);

        console.log('Making Purview API request to:', `https://api.purview.microsoft.com/v1/users/{${userId}}/ProtectionScopes/Query`);
        console.log('Request headers:', headers);
        console.log('Request body:', body);

        const response = await axios.post(
            `https://api.purview.microsoft.com/v1/users/{${userId}}/ProtectionScopes/Query`,
            body,
            { headers: headers }
        );

        console.log('Purview API Response Status:', response.status);
        console.log('Purview API Response Headers:', JSON.stringify(response.headers, null, 2));
        console.log('Purview API Response Data:', JSON.stringify(response.data, null, 2));

        console.log('[POST /query] API Response:', response.data);
        res.status(response.status).json(response.data);

        console.log('[POST /query] API call successful');
        console.log('[POST /query] Response Data:', response.data);

    } catch (error) {
        console.error('[POST /query] Error:', error.response || error);
        console.error('Purview API Error:', error.response || error);
        console.error('Error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            headers: error.response?.headers,
            data: error.response?.data
        });

        res.status(500).json({
            status: 500,
            statusCode: 'Internal Server Error',
            message: error.message
        });

        console.error('[POST /query] API call failed');
    }
});

// Add a route to check the current Purview token
router.get('/token', isAuthenticated, (req, res) => {
    if (!req.session.purviewToken) {
        return res.status(401).json({ error: 'No Purview token available' });
    }

    const decodedToken = decodeToken(req.session.purviewToken);
    res.json({
        tokenAvailable: true,
        decodedToken: decodedToken
    });
});

module.exports = router;