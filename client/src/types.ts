export interface User {
  id: string;
  username: string;
  email: string;
  public_identity_key?: string;
  user_tag?: string;
  about?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Server {
  id: string;
  name: string;
  owner_id: string;
  icon_url?: string;
  created_at: string;
}

export interface Channel {
  id: string;
  server_id: string;
  name: string;
  channel_type: 'text' | 'voice' | 'music';
  position: number;
}

export interface MusicTrack {
  id: string;
  url: string;
  videoId: string;
  title: string;
  addedById: string;
  addedByName: string;
  durationSeconds?: number;
}

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  sender_name: string;
  ciphertext: string;
  nonce?: string;
  created_at: string;
  decryptedText?: string;
}

export interface ServerInvite {
  id: string;
  server_id: string;
  server_name: string;
  inviter_id: string;
  inviter_name: string;
  invitee_id: string;
  status: string;
  created_at: string;
}
