import { uploadFileToCloudinary, getProfileImage, getImageSource } from '../../services/imageService';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('@/constants', () => ({
  CLOUDINARY_CLOUD_NAME: 'mock-cloud-name',
  CLOUDINARY_UPLOAD_PRESET: 'mock-upload-preset',
}));

describe('imageService', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com';
    process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY = 'mock-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFileToCloudinary', () => {
    it('returns null data if no file provided', async () => {
      const result = await uploadFileToCloudinary(null as any, 'testFolder');
      expect(result).toEqual({ success: true, data: null });
    });

    it('returns the string directly if file is a string', async () => {
      const result = await uploadFileToCloudinary('https://example.com/image.jpg', 'testFolder');
      expect(result).toEqual({ success: true, data: 'https://example.com/image.jpg' });
    });

    it('uploads file via axios after signing and returns url and publicId', async () => {
      const mockSignatureRes = { data: { signature: 'mock-sig', timestamp: 123456789 } };
      const mockUploadRes = { data: { secure_url: 'https://cloudinary.com/secure.jpg', public_id: 'spendwise/mock-user/testFolder/img123' } };
      
      mockedAxios.post
        .mockResolvedValueOnce(mockSignatureRes)
        .mockResolvedValueOnce(mockUploadRes);

      const result = await uploadFileToCloudinary({ uri: 'file://test/image.jpg' }, 'testFolder', 'mock-user');
      
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      
      // Signature call assertions
      expect(mockedAxios.post.mock.calls[0][0]).toBe('https://api.example.com/generate-signature');
      expect(mockedAxios.post.mock.calls[0][1]).toEqual({ folder: 'spendwise/mock-user/testFolder' });
      
      // Upload call assertions
      expect(mockedAxios.post.mock.calls[1][0]).toContain('mock-cloud-name');
      expect(mockedAxios.post.mock.calls[1][1]).toBeInstanceOf(FormData);
      
      expect(result).toEqual({
        success: true,
        data: {
          url: 'https://cloudinary.com/secure.jpg',
          publicId: 'spendwise/mock-user/testFolder/img123'
        }
      });
    });

    it('returns false if axios request fails', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      const result = await uploadFileToCloudinary({ uri: 'file://test/image.png' }, 'testFolder');
      expect(result).toEqual({ success: false, msg: 'Failed to upload image. Please check your internet connection and try again.' });
    });
  });

  describe('getProfileImage', () => {
    it('returns the string if file is a string', () => {
      expect(getProfileImage('https://example.com/img.jpg')).toBe('https://example.com/img.jpg');
    });

    it('returns uri if file is an object with uri', () => {
      expect(getProfileImage({ uri: 'file://local/img.jpg' })).toBe('file://local/img.jpg');
    });

    it('returns url if file is an object with url', () => {
      expect(getProfileImage({ url: 'https://example.com/img.jpg', publicId: 'id' })).toBe('https://example.com/img.jpg');
    });

    it('returns default avatar image if file is null or undefined', () => {
      const result = getProfileImage(null);
      expect(result).toBeTruthy();
    });
  });

  describe('getImageSource', () => {
    it('returns the string if file is a string', () => {
      expect(getImageSource('https://example.com/img.jpg')).toBe('https://example.com/img.jpg');
    });

    it('returns uri if file is an object with uri', () => {
      expect(getImageSource({ uri: 'file://local/img.jpg' })).toBe('file://local/img.jpg');
    });

    it('returns url if file is an object with url', () => {
      expect(getImageSource({ url: 'https://example.com/img.jpg', publicId: 'id' })).toBe('https://example.com/img.jpg');
    });

    it('returns number if file is a number', () => {
      expect(getImageSource(123)).toBe(123);
    });

    it('returns null if file is invalid', () => {
      expect(getImageSource(null)).toBeNull();
    });
  });
});
