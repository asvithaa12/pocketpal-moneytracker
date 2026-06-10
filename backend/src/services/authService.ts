import { supabase } from '../db/supabase.js';

export class AuthService {
  static async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
      session: data.session ? {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      } : null,
    };
  }

  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    };
  }

  static async signOut(token: string) {
    // We are stateless, but we can notify Supabase to invalidate the token/session if necessary
    const { error } = await supabase.auth.admin.signOut(token);
    if (error) {
      throw new Error(error.message);
    }
    return true;
  }
}
