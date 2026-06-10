import { supabase } from '../db/supabase.js';
import { QRTag } from '../types/index.js';

export class QRTagService {
  static async getAll(userId: string) {
    const { data, error } = await supabase
      .from('qr_tags')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data as QRTag[];
  }

  static async getByHash(userId: string, hash: string) {
    const { data, error } = await supabase
      .from('qr_tags')
      .select('*')
      .eq('hash', hash)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as QRTag | null;
  }

  static async createOrUpdate(userId: string, qrData: { hash: string; label: string; category_id: string }) {
    // Check if tag already exists for this user
    const existing = await this.getByHash(userId, qrData.hash);

    if (existing) {
      // Increment times scanned and update details
      const { data, error } = await supabase
        .from('qr_tags')
        .update({
          label: qrData.label,
          category_id: qrData.category_id,
          times_scanned: existing.times_scanned + 1,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as QRTag;
    } else {
      // Create new
      const { data, error } = await supabase
        .from('qr_tags')
        .insert({
          hash: qrData.hash,
          label: qrData.label,
          category_id: qrData.category_id,
          times_scanned: 1,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as QRTag;
    }
  }

  static async delete(userId: string, hash: string) {
    const { error } = await supabase
      .from('qr_tags')
      .delete()
      .eq('hash', hash)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return true;
  }

  static async clearAll(userId: string) {
    const { error } = await supabase
      .from('qr_tags')
      .delete()
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return true;
  }
}
