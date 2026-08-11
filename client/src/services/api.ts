import { AuthResponse, Channel, Message, Server, ServerInvite, User } from '../types';

const meta = (import.meta as any);
const DEFAULT_DOMAIN = 'yusuftaha.sbs';

function isTauriEnv(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    (window as any).__TAURI_INTERNALS__ !== undefined ||
    (window as any).__TAURI__ !== undefined ||
    window.location.hostname === 'tauri.localhost' ||
    window.location.protocol === 'tauri:'
  );
}

function getApiBaseUrl(): string {
  if (meta.env && meta.env.VITE_API_URL) return meta.env.VITE_API_URL;
  if (isTauriEnv()) {
    return `https://${DEFAULT_DOMAIN}/api`;
  }
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${window.location.origin}/api`;
    }
  }
  const isProd = meta.env ? meta.env.PROD : false;
  return isProd ? `https://${DEFAULT_DOMAIN}/api` : 'http://localhost:3000/api';
}

function getWsBaseUrl(): string {
  if (meta.env && meta.env.VITE_WS_URL) return meta.env.VITE_WS_URL;
  if (isTauriEnv()) {
    return `wss://${DEFAULT_DOMAIN}/ws`;
  }
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${window.location.host}/ws`;
    }
  }
  const isProd = meta.env ? meta.env.PROD : false;
  return isProd ? `wss://${DEFAULT_DOMAIN}/ws` : 'ws://localhost:3000/ws';
}

export const API_BASE = getApiBaseUrl();
export const WS_BASE_URL = getWsBaseUrl();

export const getAuthToken = () => localStorage.getItem('dc_token');
export const setAuthToken = (token: string) => localStorage.setItem('dc_token', token);
export const removeAuthToken = () => localStorage.removeItem('dc_token');

const getHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleFetch = async (url: string, options?: RequestInit) => {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || 'İstek başarısız oldu');
    }
    return res;
  } catch (err: any) {
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      throw new Error('Sunucuya bağlanılamadı. Lütfen backend sunucusunu (server) çalıştırın.');
    }
    throw err;
  }
};

export const api = {
  async register(data: { username: string; email: string; password: string }): Promise<AuthResponse> {
    const res = await handleFetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await handleFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getMe(): Promise<User> {
    const res = await handleFetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    return res.json();
  },

  async updateProfile(data: { username?: string; email?: string; about?: string }): Promise<User> {
    const res = await handleFetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getServers(): Promise<Server[]> {
    const res = await handleFetch(`${API_BASE}/servers`, { headers: getHeaders() });
    return res.json();
  },

  async createServer(name: string): Promise<Server> {
    const res = await handleFetch(`${API_BASE}/servers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name }),
    });
    return res.json();
  },

  async getChannels(serverId: string): Promise<Channel[]> {
    const res = await handleFetch(`${API_BASE}/servers/${serverId}/channels`, { headers: getHeaders() });
    return res.json();
  },

  async createChannel(serverId: string, name: string, type: 'text' | 'voice' = 'text'): Promise<Channel> {
    const res = await handleFetch(`${API_BASE}/servers/${serverId}/channels`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, channel_type: type }),
    });
    return res.json();
  },

  async getMessages(channelId: string): Promise<Message[]> {
    const res = await handleFetch(`${API_BASE}/channels/${channelId}/messages`, { headers: getHeaders() });
    return res.json();
  },

  async addFriend(tag: string): Promise<User> {
    const res = await handleFetch(`${API_BASE}/friends`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ tag }),
    });
    return res.json();
  },

  async getFriends(): Promise<User[]> {
    const res = await handleFetch(`${API_BASE}/friends`, { headers: getHeaders() });
    return res.json();
  },

  async removeFriend(friendId: string): Promise<void> {
    await handleFetch(`${API_BASE}/friends/${friendId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  async getOrCreateDM(targetUserId: string): Promise<Channel> {
    const res = await handleFetch(`${API_BASE}/friends/dm`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ target_user_id: targetUserId }),
    });
    return res.json();
  },

  async sendServerInvite(serverId: string, tag: string): Promise<ServerInvite> {
    const res = await handleFetch(`${API_BASE}/servers/invite`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ server_id: serverId, tag }),
    });
    return res.json();
  },

  async getPendingInvites(): Promise<ServerInvite[]> {
    const res = await handleFetch(`${API_BASE}/servers/invites/pending`, { headers: getHeaders() });
    return res.json();
  },

  async respondServerInvite(inviteId: string, accept: boolean): Promise<void> {
    await handleFetch(`${API_BASE}/servers/invites/respond`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ invite_id: inviteId, accept }),
    });
  },

  async getServerMembers(serverId: string): Promise<User[]> {
    const res = await handleFetch(`${API_BASE}/servers/${serverId}/members`, { headers: getHeaders() });
    return res.json();
  },
};
