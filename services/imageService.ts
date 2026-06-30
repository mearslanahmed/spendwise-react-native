import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "@/constants";
import { ResponseType } from "@/types";
import axios from "axios";

const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export const uploadFileToCloudinary = async (file: {uri?: string} | string, folderName: string): Promise<ResponseType> => {
    try{
        if(!file) return {success: true, data: null};
        if(typeof file == 'string'){
            return {success: true, data: file};
        }

        // Guard: fail clearly if env vars are missing rather than uploading to wrong account
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
            return { success: false, msg: "Image upload is not configured. Please contact support." };
        }

        if(file && file.uri){
            const uriParts = file.uri.split('.');
            const fileType = uriParts[uriParts.length - 1];
            let mimeType = "image/jpeg";
            if (fileType === 'png') mimeType = "image/png";
            else if (fileType === 'webp') mimeType = "image/webp";
            else if (fileType === 'gif') mimeType = "image/gif";

            // 1. Fetch Signature from Vercel Backend
            const apiUrl = process.env.EXPO_PUBLIC_API_URL;
            if (!apiUrl) {
                return { success: false, msg: "Backend API URL is not configured." };
            }

            const signatureRes = await axios.post(`${apiUrl}/generate-signature`, {
                folder: folderName
            });

            const { signature, timestamp } = signatureRes.data;

            const apiKey = process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY;
            if (!apiKey) {
                return { success: false, msg: "Missing EXPO_PUBLIC_CLOUDINARY_API_KEY in .env" };
            }

            const formData = new FormData();
            formData.append("file",
            {
                uri: file?.uri,
                type: mimeType,
                name: file?.uri?.split('/')?.pop() || `file.${fileType || 'jpg'}`
            } as any);

            // 2. Append Signature and necessary fields for signed upload (NO PRESET)
            formData.append("folder", folderName);
            formData.append("api_key", apiKey);
            formData.append("timestamp", timestamp.toString());
            formData.append("signature", signature);

            const response = await axios.post(CLOUDINARY_API_URL, formData,{
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });

            return {success: true, data: response?.data?.secure_url};
        }

        return{success: true, msg: "Image uploaded successfully"};
    }catch(error: any){
        console.log("IMAGE UPLOAD ERROR DETAILS:", error?.response?.data || error.message || error);
        let msg = "Failed to upload image. Please check your internet connection and try again.";
        
        if (error?.response?.status === 401 || error?.response?.status === 400 || error.message?.includes('401') || error.message?.includes('500')) {
            msg = "We're having trouble connecting to our secure image server. Please try again later.";
        }

        return {success: false, msg};
    }
}


export const getProfileImage = (file: any) => {
    // If it's already a string URL, return it
    if (typeof file === 'string' && file) return file;

    // Check for uri (image picker result)
    if (file && typeof file === 'object' && 'uri' in file && file.uri) {
        return file.uri;
    }

    // If it's an object with a url field, return that
    if (file && typeof file === 'object' && 'url' in file && file.url) {
        return (file as { url: string }).url;
    }

    // Fallback to local default avatar
    return require('../assets/images/defaultAvatar.png');
};