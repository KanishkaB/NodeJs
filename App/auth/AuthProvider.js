const msal = require('@azure/msal-node');
const axios = require('axios');
const config = require('../config');

class AuthProvider {
    constructor() {
        // Ensure required environment variables are set
        if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.TENANT_ID) {
            throw new Error('Required environment variables are missing. Please check CLIENT_ID, CLIENT_SECRET, and TENANT_ID.');
        }

        this.msalConfig = config.msalConfig;
        this.cryptoProvider = new msal.CryptoProvider();
        
        // Initialize MSAL application with complete configuration
        this.clientApplication = new msal.ConfidentialClientApplication(this.msalConfig);
    }

    async getAuthCodeUrl(parameters) {
        return await this.clientApplication.getAuthCodeUrl(parameters);
    }

    async acquireTokenByCode(parameters) {
        return await this.clientApplication.acquireTokenByCode(parameters);
    }

    async acquireTokenSilent(parameters) {
        try {
            return await this.clientApplication.acquireTokenSilent(parameters);
        } catch (error) {
            console.error('Silent token acquisition failed:', error);
            throw error;
        }
    }

    async acquireTokenByRefreshToken(parameters) {
        try {
            const account = parameters.account;
            const silentRequest = {
                ...parameters,
                forceRefresh: true
            };

            return await this.clientApplication.acquireTokenSilent(silentRequest);
        } catch (error) {
            console.error('Refresh token acquisition failed:', error);
            throw error;
        }
    }

    login(options = {}) {
        return async (req, res, next) => {
            try {
                // Build auth code url
                const authCodeUrlParameters = {
                    scopes: options.scopes || [],
                    redirectUri: options.redirectUri,
                    responseMode: 'form_post'
                };

                // Get url to sign user in
                const response = await this.getAuthCodeUrl(authCodeUrlParameters);
                res.redirect(response);
            } catch (error) {
                next(error);
            }
        };
    }

    handleRedirect(options = {}) {
        return async (req, res, next) => {
            try {
                const tokenRequest = {
                    code: req.body.code || req.query.code,
                    scopes: options.scopes || [],
                    redirectUri: options.redirectUri,
                };

                const response = await this.acquireTokenByCode(tokenRequest);
                req.session.account = response.account;
                req.session.isAuthenticated = true;
                req.session.accessToken = response.accessToken;

                res.redirect('/');
            } catch (error) {
                next(error);
            }
        };
    }

    acquireToken(options = {}) {
        return async (req, res, next) => {
            try {
                const tokenRequest = {
                    scopes: options.scopes,
                    redirectUri: options.redirectUri,
                    account: req.session.account
                };

                try {
                    const response = await this.acquireTokenSilent(tokenRequest);
                    res.json({ accessToken: response.accessToken });
                } catch (error) {
                    if (error.name === 'InteractionRequiredAuthError') {
                        const authCodeUrlParameters = {
                            scopes: options.scopes,
                            redirectUri: options.redirectUri,
                        };
                        const response = await this.getAuthCodeUrl(authCodeUrlParameters);
                        res.redirect(response);
                    } else {
                        throw error;
                    }
                }
            } catch (error) {
                next(error);
            }
        };
    }

    logout(options = {}) {
        return (req, res, next) => {
            try {
                const logoutUri = `${this.msalConfig.auth.authority}/oauth2/v2.0/logout?post_logout_redirect_uri=${options.postLogoutRedirectUri}`;
                req.session.destroy(() => {
                    res.redirect(logoutUri);
                });
            } catch (error) {
                next(error);
            }
        };
    }

    /**
     * Retrieves cloud discovery metadata from the /discovery/instance endpoint
     * @returns 
     */
    async getCloudDiscoveryMetadata(authority) {
        const endpoint = 'https://login.microsoftonline.com/common/discovery/instance';

        try {
            const response = await axios.get(endpoint, {
                params: {
                    'api-version': '1.1',
                    'authorization_endpoint': `${authority}/oauth2/v2.0/authorize`
                }
            });

            return await response.data;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Retrieves oidc metadata from the openid endpoint
     * @returns
     */
    async getAuthorityMetadata(authority) {
        const endpoint = `${authority}/v2.0/.well-known/openid-configuration`;

        try {
            const response = await axios.get(endpoint);
            return await response.data;
        } catch (error) {
            console.log(error);
        }
    }
}

const authProvider = new AuthProvider();

module.exports = { authProvider };