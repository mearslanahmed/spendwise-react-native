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