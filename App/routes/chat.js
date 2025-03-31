const express = require('express');
const router = express.Router();
const { callProcessContentAPI, callProtectionScopeAPI } = require('../helpers/purviewHelper'); // Re-import callProtectionScopeAPI
const { v4: uuidv4 } = require('uuid'); // Import uuid package
const axios = require('axios'); // Import axios for API calls
const fs = require('fs'); // Import fs for file operations
const path = require('path'); // Import path for file paths

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (!req.session.account) {
        return res.redirect('/auth/signin');
    }
    next();
}

// Helper function to generate random response
// Helper function to decode JWT token
const decodeToken = (token) => {
    try {
        const payload = token.split('.')[1];
        const decodedPayload = Buffer.from(payload, 'base64').toString();
        return JSON.parse(decodedPayload);
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

// Helper function to call Process Content API
async function callProcessContentAPIWrapper(activity, content, userId, conversationId, sequenceNumber, token, metadata, scopeIdentifier) {
    console.log('[Helper] Calling Process Content API');
    console.log('[Helper] Payload:', {
        activity,
        content,
        userId,
        conversationId,
        sequenceNumber,
        token,
        metadata,
        scopeIdentifier
    });

    return await callProcessContentAPI(
        activity,
        content,
        userId,
        conversationId,
        sequenceNumber,
        token,
        metadata,
        scopeIdentifier
    );
}

// Get chat page
router.get('/', isAuthenticated, (req, res) => {
    res.render('chat', {
        title: 'Chat',
        userName: req.session.userName, // Pass user's name to the view
        messages: [
            { type: 'user', text: 'Hello!' },
            { type: 'bot', text: 'Hi there! How can I help you?' }
        ] // Example messages to render dynamically
    });
});

// Handle message submission and call Azure OpenAI API
router.post('/send', isAuthenticated, async (req, res) => {
    console.log('[POST /send] Received request');
    const { message } = req.body;
    console.log('[POST /send] User message:', message);

    try {
        if (!req.session.purviewToken) {
            return res.status(401).json({ error: 'Purview token not available' });
        }

        const decodedToken = decodeToken(req.session.purviewToken);
        if (!decodedToken) {
            return res.status(500).json({ error: 'Failed to decode Purview token' });
        }

        const userId = decodedToken.oid || decodedToken.sub;
        if (!userId) {
            return res.status(500).json({ error: 'User ID not found in token' });
        }

        console.log('[POST /send] Using user ID:', userId);

        const conversationId = req.session.conversationId || uuidv4();
        req.session.conversationId = conversationId;
        const sequenceNumber = req.session.sequenceNumber || 1;
        req.session.sequenceNumber = sequenceNumber + 1;

        // Call Protection Scope API to fetch scope identifier
        const protectionScopeResponse = await callProtectionScopeAPI(userId, req.session.purviewToken);
        console.log('[POST /send] Protection Scope API response:', protectionScopeResponse);

        const scopeIdentifier = protectionScopeResponse?.scopeIdentifier || "default-scope-id"; // Extract scopeIdentifier
        console.log('[POST /send] Fetched scopeIdentifier:', scopeIdentifier);

        // Call Process Content API for user prompt
        const promptResponse = await callProcessContentAPIWrapper(
            'uploadText',
            message,
            userId,
            conversationId,
            sequenceNumber,
            req.session.purviewToken,
            '{}',
            scopeIdentifier
        );
        console.log('[POST /send] Process Content API response for user prompt:', promptResponse);

        const openAiResponse = await axios.post(
            process.env.AZURE_OPENAI_ENDPOINT,
            {
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: message }
                ],
                max_tokens: 100,
                temperature: 0.7,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': process.env.AZURE_OPENAI_API_KEY,
                },
            }
        );

        console.log('[POST /send] Azure OpenAI API call successful');
        const botResponse = openAiResponse.data.choices[0].message.content.trim();

        // Call Process Content API for bot response
        const botResponseContent = await callProcessContentAPIWrapper(
            'downloadText',
            botResponse,
            userId,
            conversationId,
            req.session.sequenceNumber,
            req.session.purviewToken,
            '{}',
            scopeIdentifier
        );
        console.log('[POST /send] Process Content API response for bot response:', botResponseContent);

        req.session.sequenceNumber += 1;

        res.json({ success: true, botResponse });
    } catch (error) {
        console.error('[POST /send] API call failed');
        console.error('[POST /send] Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.response?.data || error.message });
    }
});

module.exports = router;
