/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

const express = require('express');
const router = express.Router();
const { authProvider } = require('../auth/AuthProvider');
const config = require('../config');

// Initial sign-in route with User.Read scope
router.get('/signin', async (req, res) => {
    const urlParameters = {
        scopes: config.authConfig.scopes,
        redirectUri: process.env.REDIRECT_URI,
        responseMode: 'form_post'
    };

    try {
        const authUrl = await authProvider.getAuthCodeUrl(urlParameters);
        res.redirect(authUrl);
    } catch (error) {
        console.error('Error during sign-in:', error);
        res.status(500).send(error);
    }
});

// Handle redirect
router.post('/redirect', async (req, res) => {
    if (req.body.error) {
        console.error('Error during authentication:', req.body.error_description);
        return res.status(500).send(req.body.error_description);
    }

    const tokenRequest = {
        code: req.body.code,
        scopes: config.authConfig.scopes,
        redirectUri: process.env.REDIRECT_URI
    };

    try {
        const response = await authProvider.acquireTokenByCode(tokenRequest);
        req.session.account = response.account;

        // Store user's name in the session
        req.session.userName = response.account.name || response.account.username;
        
        // Acquire Purview token separately
        try {
            const purviewTokenRequest = {
                scopes: config.authConfig.purviewScope,
                account: response.account
            };
            const purviewResponse = await authProvider.acquireTokenSilent(purviewTokenRequest);
            req.session.purviewToken = purviewResponse.accessToken;
            console.log('Successfully acquired Purview token');
        } catch (purviewError) {
            console.error('Error acquiring Purview token:', purviewError);
            // Continue without Purview token
        }
        
        res.redirect('/chat');
    } catch (error) {
        console.error('Error acquiring token:', error);
        res.status(500).send(error);
    }
});

router.get('/signout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Purview token route with interactive authentication if needed
router.get('/purviewToken', async (req, res) => {
    console.log('Purview token request received');
    
    if (!req.session.account) {
        console.log('No session account found');
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        console.log('Attempting to acquire Purview token with scope:', config.authConfig.purviewScope);
        
        const tokenRequest = {
            account: req.session.account,
            scopes: config.authConfig.purviewScope,
            forceRefresh: true
        };

        const response = await authProvider.acquireTokenSilent(tokenRequest);
        console.log('Purview token acquired successfully');
        
        res.json({ 
            accessToken: response.accessToken,
            expiresOn: response.expiresOn
        });
    } catch (error) {
        console.error('Error acquiring Purview token:', error);
        res.status(500).json({ 
            error: 'Failed to acquire Purview token',
            details: error.message
        });
    }
});

module.exports = router;
