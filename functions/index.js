const { onCall, HttpsError } = require("firebase-functions/v2/https");
const cloudinary = require("cloudinary").v2;

exports.generateCloudinarySignature = onCall({ secrets: ["CLOUDINARY_API_SECRET"] }, (request) => {
    // Only allow authenticated users
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in");
    }

    const timestamp = Math.round((new Date).getTime() / 1000);
    const folder = request.data.folder || "spendwise_uploads";
    const upload_preset = request.data.upload_preset || "images";
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    if (!apiSecret) {
        console.error("Missing CLOUDINARY_API_SECRET");
        throw new HttpsError("internal", "Server misconfiguration");
    }

    try {
        const signature = cloudinary.utils.api_sign_request({
            timestamp: timestamp,
            folder: folder,
            upload_preset: upload_preset
        }, apiSecret);

        return {
            signature,
            timestamp,
            folder,
            upload_preset
        };
    } catch (error) {
        console.error(error);
        throw new HttpsError("internal", "Failed to generate signature");
    }
});
