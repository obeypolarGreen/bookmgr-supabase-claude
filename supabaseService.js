import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// AUTHENTICATION
// ============================================================================

export const authService = {
  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ============================================================================
// BOOKMARKS
// ============================================================================

export const bookmarksService = {
  getAll: async (userId) => {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  create: async (bookmark) => {
    const { data, error } = await supabase
      .from('bookmarks')
      .insert([bookmark])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('bookmarks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  getByShareId: async (shareId) => {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('share_id', shareId)
      .single();
    
    if (error) throw error;
    return data;
  },

  checkDuplicate: async (userId, url) => {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('url', url)
      .maybeSingle();
    
    if (error) throw error;
    return !!data;
  },

  subscribe: (userId, callback) => {
    return supabase
      .channel('bookmarks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  },
};

// ============================================================================
// FOLDERS
// ============================================================================

export const foldersService = {
  getAll: async (userId) => {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  create: async (folder) => {
    const { data, error } = await supabase
      .from('folders')
      .insert([folder])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('folders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  subscribe: (userId, callback) => {
    return supabase
      .channel('folders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'folders',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const isValidUrl = (urlString) => {
  try {
    const url = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const normalizeUrl = (urlString) => {
  try {
    const url = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`);
    return url.href;
  } catch {
    return null;
  }
};

export const fetchUrlMetadata = async (url) => {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    return {
      title: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
      description: `Visit ${domain} for more information`,
      thumbnail: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
      domain: domain
    };
  } catch (e) {
    return {
      title: 'Untitled',
      description: '',
      thumbnail: '',
      domain: ''
    };
  }
};

export const generateShareId = () => {
  return Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
};
