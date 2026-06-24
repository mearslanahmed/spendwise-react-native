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

        if(file && file.uri){
            const formData = new FormData();
            formData.append("file",
            {
                uri: file?.uri,
                type: "image/jpeg",
                name: file?.uri?.split('/')?.pop() || "file.jpg"
                } as any);

            formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
            formData.append("folder", folderName);

            const response = await axios.post(CLOUDINARY_API_URL, formData,{
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });

            return {success: true, data: response?.data?.secure_url};
        }

        return{success: true, msg: "Image uploaded successfully"};
    }catch(error: any){
        const msg = error instanceof Error ? error.message : "Failed to upload image";
        return {success: false, msg};
    }
}

export const getProfileImage = (file: any) => {
    // If it's already a string URL, return it
    if (typeof file === 'string' && file) return file;

    // If it's an object with a url field, return that
    if (file && typeof file === 'object' && 'url' in file && file.url) {
        return (file as { url: string }).url;
    }

    // Fallback to local default avatar
    return require('../assets/images/defaultAvatar.png');
};

export const getProfilePath = (file: any) => {
    if (typeof file === 'string' && file) return file;

    // Check for uri (image picker result)
    if (file && typeof file === 'object' && 'uri' in file && file.uri) {
        return file.uri;
    }

    // Check for url (uploaded/stored images)
    if (file && typeof file === 'object' && 'url' in file && file.url) {
        return (file as { url: string }).url;
    }

    return null;
};