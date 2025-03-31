const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');

/**
 * Calls the Purview ProtectionScope API.
 * @param {string} userId - The user ID.
 * @param {string} accessToken - The Purview access token.
 * @returns {Promise<string>} - The scope identifier.
 */
async function callProtectionScopeAPI(userId, accessToken) {
    const url = `https://api.purview.microsoft.com/v1/users/{${userId}}/ProtectionScopes/Query`;
    console.log('[callProtectionScopeAPI] Starting API call');
    console.log('[callProtectionScopeAPI] URL:', url);
    console.log('[callProtectionScopeAPI] Access Token:', accessToken);

    try {
        const response = await axios.post(
            url,
            '{}', // Empty scope identifier payload
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        console.log('[callProtectionScopeAPI] API call successful');
        console.log('[callProtectionScopeAPI] Response Status:', response.status);
        console.log('[callProtectionScopeAPI] Response Headers:', response.headers);
        console.log('[callProtectionScopeAPI] Response Data:', response.data);
        return response.data.scopeIdentifier; // Assuming the response contains 'scopeIdentifier'
    } catch (error) {
        console.error('[callProtectionScopeAPI] API call failed');
        console.error('[callProtectionScopeAPI] Error Status:', error.response?.status);
        console.error('[callProtectionScopeAPI] Error Headers:', error.response?.headers);
        console.error('[callProtectionScopeAPI] Error Data:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Calls the Purview ProcessContent API.
 * @param {string} activity - The activity ("UploadText" or "DownloadText").
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
    console.log('[callProcessContentAPI] Starting API call');
    console.log('[callProcessContentAPI] Activity:', activity);
    console.log('[callProcessContentAPI] Scope Identifier:', scopeIdentifier);

    try { // Handle "UploadText" activity
            const metadata = {
                contentMetadata: {
                    name: "Purview API Explorer",
                    id: uuidv4(),
                    ownerId: userId,
                    conversationId: uuidv4(),
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

            const form = new FormData();
            form.append("metadata", JSON.stringify(metadata), { contentType: "application/json" });
            form.append("text", message, { contentType: "text/plain" });

            const response = await axios.post(url, form, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    ...form.getHeaders(),
                    Accept: 'application/json'
                }
            });
            console.log('[callProcessContentAPI] UploadText API call successful');
            console.log('[callProcessContentAPI] Response Data:', response.data);
            return response.data;
        }
    catch (error) {
        console.error('[callProcessContentAPI] API call failed');
        console.error('[callProcessContentAPI] Error:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = {
    callProtectionScopeAPI,
    callProcessContentAPI,
};
