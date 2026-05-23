import { describe, it, expect, vi, beforeEach } from 'vitest';

import { StorageService } from './storage.service';
import { supabase } from '../lib/supabase';

vi.mock('../lib/prisma');

vi.mock('../lib/supabase', () => {
  return {
    supabase: {
      storage: {
        from: vi.fn().mockReturnThis(),
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        remove: vi.fn()
      }
    }
  };
});

vi.mock('../config', () => ({
  config: {
    supabase: {
      bucket: 'test-bucket'
    }
  }
}));

describe('StorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should throw if file buffer is empty', async () => {
      const mockFile = { originalname: 'test.png', buffer: null as any } as any;
      await expect(StorageService.uploadFile(mockFile)).rejects.toThrow('File buffer is empty');
    });

    it('should throw if upload errors', async () => {
      const mockFile = { originalname: 'test.png', mimetype: 'image/png', buffer: Buffer.from('test') } as any;
      (supabase.storage.from('test-bucket').upload as any).mockResolvedValue({ error: { message: 'upload error' } });
      
      await expect(StorageService.uploadFile(mockFile)).rejects.toThrow('Помилка завантаження файлу: upload error');
    });

    it('should upload successfully and return url', async () => {
      const mockFile = { originalname: 'test.png', mimetype: 'image/png', buffer: Buffer.from('test') } as any;
      (supabase.storage.from('test-bucket').upload as any).mockResolvedValue({ error: null });
      (supabase.storage.from('test-bucket').getPublicUrl as any).mockReturnValue({
        data: { publicUrl: 'https://supabase.com/test.png' }
      });
      
      const url = await StorageService.uploadFile(mockFile);
      expect(url).toBe('https://supabase.com/test.png');
      expect(supabase.storage.from('test-bucket').upload).toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('should remove file based on URL', async () => {
      (supabase.storage.from('test-bucket').remove as any).mockResolvedValue({ error: null });
      
      await StorageService.deleteFile('https://supabase.com/public/test-bucket/general/test.png');
      
      expect(supabase.storage.from('test-bucket').remove).toHaveBeenCalledWith(['general/test.png']);
    });
  });
});
