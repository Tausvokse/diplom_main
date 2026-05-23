import { supabase } from '../lib/supabase';
import { config } from '../config';
import { AppError } from '../utils/AppError';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class StorageService {
  private static bucket = config.supabase.bucket.replace(/['"]/g, '');

  /**
   * Uploads a file to Supabase Storage
   * @param file The file object from Multer (memoryStorage)
   * @param folder The folder path within the bucket
   * @param customName Optional custom filename without extension
   * @returns The public URL of the uploaded file
   */
  static async uploadFile(file: Express.Multer.File, folder: string = 'general', customName?: string): Promise<string> {
    const fileExt = path.extname(file.originalname) || '.png';
    const fileName = customName ? `${customName}${fileExt}` : `${uuidv4()}${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    console.log(`Starting Supabase upload for bucket: ${this.bucket}, path: ${filePath}`);
    
    if (!file.buffer) {
      throw new Error('File buffer is empty');
    }

    const { error } = await supabase.storage
      .from(this.bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) {
      console.error('Supabase Storage Error Details:', JSON.stringify(error, null, 2));
      throw new AppError(`Помилка завантаження файлу: ${error.message}`, 500);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(this.bucket)
      .getPublicUrl(filePath);

    // Ensure URL doesn't contain literal quotes if they somehow got in
    const cleanPublicUrl = publicUrl.replace(/%22/g, '').replace(/"/g, '');

    console.log(`Upload successful, public URL: ${cleanPublicUrl}`);
    return cleanPublicUrl;
  }

  /**
   * Deletes a file from Supabase Storage
   * @param url The public URL of the file or the file path
   */
  static async deleteFile(url: string): Promise<void> {
    try {
      // Extract file path from URL if needed
      // If it's a full URL, we need to extract the path after /public/bucket/
      const pathPart = url.includes('/public/' + this.bucket + '/') 
        ? url.split('/public/' + this.bucket + '/')[1]
        : url;

      const { error } = await supabase.storage
        .from(this.bucket)
        .remove([pathPart]);

      if (error) {
        console.error('Supabase Delete Error:', error);
      }
    } catch (err) {
      console.error('Storage Delete Error:', err);
    }
  }
}
