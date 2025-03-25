const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid'); // Import uuid package

/**
 * Calls the Purview ProtectionScope API.
 * @param {string} userId - The user ID.
 * @param {string} accessToken - The Purview access token.
 * @param {string} scopeIdentifier - The scope identifier.
 * @returns {Promise<object>} - The API response.
 */
async function callProtectionScopeAPI(userId, accessToken, scopeIdentifier = '{}') {
    const url = `https://api.purview.microsoft.com/v1/users/{${userId}}/ProtectionScopes/Query`;
    console.log('Access Token Protection Scope:', accessToken);

    try {
        const response = await axios.post(
            url,
            scopeIdentifier,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error calling ProtectionScope API:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Calls the Purview ProcessContent API.
 * @param {string} activity - The activity.
 * @param {string} message - The user message.
 * @param {string} userId - The user ID.
 * @param {string} conversationId - The conversation ID.
 * @param {number} sequenceNumber - The sequence number.
 * @param {string} accessToken - The Purview access token.
 * @param {string} scopeIdentifier - The scope identifier.
 * @returns {Promise<object>} - The API response.
 */
async function callProcessContentAPI(activity, message, userId, conversationId, sequenceNumber, accessToken, scopeIdentifier) {
    const url = `https://api.purview.microsoft.com/v1/users/{${userId}}/Processors/ProcessContent`;

    // Prepare metadata
    const metadata = {
        contentMetadata: {
            name: "Purview API Explorer",
            id: uuidv4(), // Ensure uuidv4 is defined
            ownerId: userId,
            conversationId: uuidv4(), // Ensure uuidv4 is defined
            sequenceNo: sequenceNumber.toString()
        },
        activityMetadata: {
            activity: activity,
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

    // Create FormData
    const form = new FormData();
    form.append("metadata", JSON.stringify(metadata), { contentType: "application/json" });
    form.append("text", message, { contentType: "text/plain" });

    try {
        const response = await axios.post(url, form, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                ...form.getHeaders(),
                Accept: 'application/json'
            }
        });
        console.log('Response:', response.data);
        console.log('Response:', response);
        return response.data;
    } catch (error) {
        console.error('Error calling ProcessContent API:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = {
    callProtectionScopeAPI,
    callProcessContentAPI,
};
