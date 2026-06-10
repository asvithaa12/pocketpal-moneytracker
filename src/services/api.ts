import { supabase } from './supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function mapTxFromDb(row: any) {
  if (!row) return row;
  return {
    id: row.id,
    type: row.type,
    amount: parseFloat(row.amount),
    category: row.category,
    subcategory: row.subcategory,
    description: row.description,
    date: row.date,
    friendName: row.friend_name || null,
    source: row.source,
    qrId: row.qr_id || null,
    createdAt: row.created_at,
  };
}

function mapTxToDb(tx: any) {
  if (!tx) return tx;
  if (Array.isArray(tx)) {
    return tx.map(mapTxToDb);
  }
  return {
    type: tx.type,
    amount: tx.amount,
    category: tx.category,
    subcategory: tx.subcategory,
    description: tx.description,
    date: tx.date,
    friend_name: tx.friendName || null,
    source: tx.source,
    qr_id: tx.qrId || null,
  };
}

function mapQRFromDb(row: any) {
  if (!row) return row;
  return {
    id: row.id,
    hash: row.hash,
    label: row.label,
    categoryId: row.category_id,
    timesScanned: row.times_scanned,
  };
}

function mapQRToDb(tag: any) {
  if (!tag) return tag;
  const mapped: any = {};
  if (tag.hash !== undefined) mapped.hash = tag.hash;
  if (tag.label !== undefined) mapped.label = tag.label;
  if (tag.categoryId !== undefined) mapped.category_id = tag.categoryId;
  if (tag.category_id !== undefined) mapped.category_id = tag.category_id;
  return mapped;
}

async function getHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers['Authorization'] = `Bearer ${data.session.access_token}`;
    }
  }

  return headers;
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}${path}`, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null as any;
      }
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }
    
    const res = await response.json();
    let data = res.data;

    // Transform response for frontend compatibility
    if (path === '/transactions' || path.startsWith('/transactions?')) {
      if (Array.isArray(data)) {
        data = data.map(mapTxFromDb);
      }
    } else if (path === '/qr-tags') {
      // Return array — callers handle their own conversion
      if (Array.isArray(data)) {
        data = data.map(mapQRFromDb);
      }
    } else if (path.startsWith('/qr-tags/')) {
      if (data) data = mapQRFromDb(data);
    } else if (path.startsWith('/analytics/')) {
      // analytics routes return structured objects — pass through as-is
    } else if (path.startsWith('/friends/')) {
      const nameSegment = path.substring('/friends/'.length);
      if (nameSegment && nameSegment !== 'settle' && data && Array.isArray(data.transactions)) {
        data.transactions = data.transactions.map(mapTxFromDb);
      }
    }

    return data as T;
  },

  async post<T>(path: string, body?: any): Promise<T> {
    const headers = await getHeaders();
    
    // Transform request body for backend compatibility
    let transformedBody = body;
    if (path.startsWith('/transactions')) {
      transformedBody = mapTxToDb(body);
    } else if (path.startsWith('/qr-tags')) {
      transformedBody = mapQRToDb(body);
    }

    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: transformedBody ? JSON.stringify(transformedBody) : undefined,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }

    const res = await response.json();
    let data = res.data;

    // Transform response back to camelCase
    if (path.startsWith('/transactions')) {
      if (Array.isArray(data)) {
        data = data.map(mapTxFromDb);
      } else {
        data = mapTxFromDb(data);
      }
    } else if (path.startsWith('/qr-tags')) {
      data = mapQRFromDb(data);
    }

    return data as T;
  },

  async put<T>(path: string, body?: any): Promise<T> {
    const headers = await getHeaders();
    
    // Transform request body for backend compatibility
    let transformedBody = body;
    if (path.startsWith('/transactions/')) {
      transformedBody = mapTxToDb(body);
    } else if (path.startsWith('/qr-tags/')) {
      transformedBody = mapQRToDb(body);
    }

    const response = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers,
      body: transformedBody ? JSON.stringify(transformedBody) : undefined,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }

    const res = await response.json();
    let data = res.data;

    // Transform response back to camelCase
    if (path.startsWith('/transactions/')) {
      data = mapTxFromDb(data);
    } else if (path.startsWith('/qr-tags/')) {
      data = mapQRFromDb(data);
    }

    return data as T;
  },

  async delete<T>(path: string): Promise<T> {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }

    const res = await response.json();
    return res.data as T;
  },
};
