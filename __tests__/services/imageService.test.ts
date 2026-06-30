import { uploadFileToCloudinary, getProfileImage } from '../../services/imageService';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('@/constants', () => ({
  CLOUDINARY_CLOUD_NAME: 'mock-cloud-name',
  CLOUDINARY_UPLOAD_PRESET: 'mock-upload-preset',
}));

describe('imageService', () => {
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

    it('uploads file via axios and returns secure_url', async () => {
      const mockResponse = { data: { secure_url: 'https://cloudinary.com/secure.jpg' } };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await uploadFileToCloudinary({ uri: 'file://test/image.jpg' }, 'testFolder');
      
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const args = mockedAxios.post.mock.calls[0];
      expect(args[0]).toContain('mock-cloud-name');
      expect(args[1]).toBeInstanceOf(FormData);
      expect(result).toEqual({ success: true, data: 'https://cloudinary.com/secure.jpg' });
    });

    it('returns false if axios request fails', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      const result = await uploadFileToCloudinary({ uri: 'file://test/image.png' }, 'testFolder');
      expect(result).toEqual({ success: false, msg: 'Network error' });
    });
  });

  describe('getProfileImage', () => {
    it('returns the string if file is a string', () => {
      expect(getProfileImage('https://example.com/img.jpg')).toBe('https://example.com/img.jpg');
    });

    it('returns uri if file is an object with uri', () => {
      expect(getProfileImage({ uri: 'file://local/img.jpg' })).toBe('file://local/img.jpg');
    });

    it('returns default avatar image if file is null or undefined', () => {
      const result = getProfileImage(null);
      // Since require returns a number in React Native, we just check truthy or the specific mock output
      expect(result).toBeTruthy();
    });
  });
});
