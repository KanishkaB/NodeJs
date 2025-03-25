const express = require('express');
const router = express.Router();
const { callProcessContentAPI, callProtectionScopeAPI } = require('../helpers/purviewHelper'); // Remove generateGUID import
const { v4: uuidv4 } = require('uuid'); // Import uuid package

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (!req.session.account) {
        return res.redirect('/auth/signin');
    }
    next();
}

// Helper function to generate random responses
function getRandomResponse(userMessage) {
    const responses = {
        hello: ["Hi there!", "Hello!", "Hey! How can I help you?"],
        howAreYou: ["I'm just a bot, but I'm doing great!", "I'm here to assist you!", "Feeling helpful today!"],
        default: ["I'm not sure how to respond to that.", "Can you rephrase?", "Let me think about that."]
    };

    if (userMessage.toLowerCase().includes("hello")) {
        return responses.hello[Math.floor(Math.random() * responses.hello.length)];
    } else if (userMessage.toLowerCase().includes("how are you")) {
        return responses.howAreYou[Math.floor(Math.random() * responses.howAreYou.length)];
    } else {
        return responses.default[Math.floor(Math.random() * responses.default.length)];
    }
}

// Get chat page
router.get('/', isAuthenticated, (req, res) => {
    res.render('chat', {
        title: 'Chat',
        user: {
            name: req.session.account.name || req.session.account.username,
        },
        messages: [
            { type: 'user', text: 'Hello!' },
            { type: 'bot', text: 'Hi there! How can I help you?' }
        ] // Example messages to render dynamically
    });
});

// Handle message submission and call Purview API
router.post('/send', isAuthenticated, async (req, res) => {
    const { message } = req.body;
    const userId = req.session.account.idTokenClaims.oid;
    const accessToken = req.session.purviewToken;

    console.log('Sending request with userId:', userId);
    console.log('Session account:', req.session.account);

    try {
        // First call ProtectionScope API to get the scope identifier
        const scopeResponse = await callProtectionScopeAPI(userId, accessToken);
        console.log('ProtectionScope raw response:', scopeResponse);
        
        // Use the scope identifier directly without additional wrapping
        const scopeIdentifier = scopeResponse.scopeIdentifier;
        console.log('Using scopeIdentifier:', scopeIdentifier);

        // Check if conversationId exists in the session; if not, generate a new one
        if (!req.session.conversationId) {
            req.session.conversationId = uuidv4(); // Generate a random conversation ID
            console.log('Generated new conversationId:', req.session.conversationId);
        } else {
            console.log('Reusing existing conversationId:', req.session.conversationId);
        }

        const conversationId = req.session.conversationId; // Use session-stored conversationId
        let sequenceNo = Math.floor(Math.random() * (9999999 - 1000000 + 1)) + 1000000; // Generate random sequence ID

        const metadata = {
            contentMetadata: {
                name: "Purview API Explorer",
                id: uuidv4(), // Replace generateGUID() with uuidv4()
                ownerId: userId,
                conversationId: conversationId, // Use session-stored conversationId
                sequenceNo: sequenceNo.toString()
            },
            activityMetadata: {
                activity: "uploadText",
                applicationLocation: "PurviewDeveloperPlatformAPIExplorer"
            },
            deviceMetadata: {
                managementType: "managed",
                operatingSystem: "Windows 11",
                operatingSystemVersion: "10.0.26100.0"
            },
            protectedAppMetadata: {
                name: "Purview Developer Platform API Explorer",
                version: "0.1"
            },
            integratedAppMetadata: {
                name: "Purview Developer Platform API Explorer",
                version: "0.1"
            },
            scopeIdentifier: scopeIdentifier
        };

        console.log('Final scopeIdentifier value:', metadata.scopeIdentifier);
        console.log('Final scopeIdentifier type:', typeof metadata.scopeIdentifier);
        console.log('Sending metadata:', JSON.stringify(metadata, null, 2));
        console.log('Message being sent:', message);

        // Prepare payload for "uploadText"
        // const uploadPayload = {
        //     activity: "uploadText",
        //     message: message,
        //     userId: userId,
        //     conversationId: conversationId,
        //     sequenceNo: sequenceNo.toString(),
        //     accessToken: accessToken,
        //     scopeIdentifier: scopeIdentifier
        // };
        // console.log('Payload for uploadText:', JSON.stringify(uploadPayload, null, 2)); // Print payload

        // // Call ProcessContent API with "uploadText" activity
        // console.log('Sequence number before uploadText:', sequenceNo); // Print sequence number
        // console.log('Conversation ID before uploadText:', conversationId); // Print conversation ID

        const purviewResponse = await callProcessContentAPI(
            "uploadText", 
            message, 
            userId, 
            conversationId, // Pass session-stored conversationId
            sequenceNo.toString(), 
            accessToken, 
            scopeIdentifier
        );
        // Log full response

        sequenceNo++; // Increment sequence number

        // Bot processes the user's message and generates a response
        const botResponse = getRandomResponse(message);

        // Prepare payload for "downloadText"
        // const downloadPayload = {
        //     activity: "downloadText",
        //     message: botResponse,
        //     userId: userId,
        //     conversationId: conversationId,
        //     sequenceNo: sequenceNo.toString(),
        //     accessToken: accessToken,
        //     scopeIdentifier: scopeIdentifier
        // };
        // console.log('Payload for downloadText:', JSON.stringify(downloadPayload, null, 2)); // Print payload

        // Call ProcessContent API with "downloadText" activity before responding
        console.log('Sequence number before downloadText:', sequenceNo); // Print sequence number
        console.log('Conversation ID before downloadText:', conversationId); // Print conversation ID

        const downloadResponse = await callProcessContentAPI(
            "downloadText", 
            botResponse, 
            userId, 
            conversationId, // Pass session-stored conversationId
            sequenceNo.toString(), 
            accessToken, 
            scopeIdentifier
        );
        // Log full response

        res.json({ success: true, purviewResponse, botResponse });
        console.log('Bot response successfully sent:', botResponse); // Log success
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
module.exports.getRandomResponse = getRandomResponse;