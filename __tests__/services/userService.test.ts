import { updateUser } from '../../services/userService';
import { uploadFileToCloudinary } from '../../services/imageService';
import { updateDoc } from 'firebase/firestore';

jest.mock('../../services/imageService', () => ({
  uploadFileToCloudinary: jest.fn(),
}));

describe('userService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateUser', () => {
    it('updates user doc directly if no image uri is provided', async () => {
      const mockUpdateDoc = updateDoc as jest.Mock;
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      const res = await updateUser('user-1', { name: 'Test' } as any);
      
      expect(res).toEqual({ success: true, msg: "Updated successfully" });
      expect(uploadFileToCloudinary).not.toHaveBeenCalled();
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    });

    it('uploads image and then updates user doc if image uri is provided', async () => {
      const mockUpload = uploadFileToCloudinary as jest.Mock;
      const mockUpdateDoc = updateDoc as jest.Mock;

      mockUpload.mockResolvedValueOnce({ success: true, data: 'https://cloudinary.com/test.jpg' });
      mockUpdateDoc.mockResolvedValueOnce(undefined);

      const res = await updateUser('user-2', { name: 'Test', image: { uri: 'file://local/img.jpg' } } as any);
      
      expect(mockUpload).toHaveBeenCalledWith({ uri: 'file://local/img.jpg' }, "users");
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const updateData = mockUpdateDoc.mock.calls[0][1];
      expect(updateData.image).toBe('https://cloudinary.com/test.jpg');
      expect(res).toEqual({ success: true, msg: "Updated successfully" });
    });

    it('returns failure if image upload fails', async () => {
      const mockUpload = uploadFileToCloudinary as jest.Mock;
      mockUpload.mockResolvedValueOnce({ success: false, msg: 'Upload Error' });

      const res = await updateUser('user-3', { name: 'Test', image: { uri: 'file://local/img.jpg' } } as any);
      
      expect(res).toEqual({ success: false, msg: 'Upload Error' });
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('returns failure if firestore updateDoc throws', async () => {
      const mockUpdateDoc = updateDoc as jest.Mock;
      mockUpdateDoc.mockRejectedValueOnce(new Error('Firestore Error'));

      const res = await updateUser('user-4', { name: 'Test' } as any);
      
      expect(res).toEqual({ success: false, msg: 'Firestore Error' });
    });
  });
});
