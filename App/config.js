require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = ['CLIENT_ID', 'CLIENT_SECRET', 'TENANT_ID', 'REDIRECT_URI'];
requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
    }
});

module.exports = {
    msalConfig: {
        auth: {
            clientId: process.env.CLIENT_ID,
            authority: process.env.CLOUD_INSTANCE + process.env.TENANT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            redirectUri: process.env.REDIRECT_URI,
            postLogoutRedirectUri: process.env.POST_LOGOUT_REDIRECT_URI
        },
        system: {
            loggerOptions: {
                loggerCallback(loglevel, message, containsPii) {
                    console.log(message);
                },
                piiLoggingEnabled: false,
                logLevel: "Info"
            }
        }
    },
    authConfig: {
        scopes: ["User.Read", "openid", "profile", "offline_access"],
        purviewScope: ["https://api.purview.microsoft.com/.default"]
    }
}; 