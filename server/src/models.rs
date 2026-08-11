use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub public_identity_key: Option<String>,
    pub user_tag: Option<String>,
    pub about: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserResponse {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub public_identity_key: Option<String>,
    pub user_tag: String,
    pub about: Option<String>,
}

impl From<User> for UserResponse {
    fn from(u: User) -> Self {
        Self {
            id: u.id,
            username: u.username,
            email: u.email,
            public_identity_key: u.public_identity_key,
            user_tag: u.user_tag.unwrap_or_else(|| "AA00A".into()),
            about: u.about,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub username: Option<String>,
    pub email: Option<String>,
    pub about: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub public_identity_key: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserResponse,
}

#[derive(Debug, Deserialize)]
pub struct AddFriendRequest {
    pub tag: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateDmRequest {
    pub target_user_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ServerModel {
    pub id: Uuid,
    pub name: String,
    pub owner_id: Uuid,
    pub icon_url: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateServerRequest {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct ServerInviteModel {
    pub id: Uuid,
    pub server_id: Uuid,
    pub server_name: String,
    pub inviter_id: Uuid,
    pub inviter_name: String,
    pub invitee_id: Uuid,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct SendInviteRequest {
    pub server_id: Uuid,
    pub tag: String,
}

#[derive(Debug, Deserialize)]
pub struct RespondInviteRequest {
    pub invite_id: Uuid,
    pub accept: bool,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct ChannelModel {
    pub id: Uuid,
    pub server_id: Uuid,
    pub name: String,
    pub channel_type: String,
    pub position: i32,
}

#[derive(Debug, Deserialize)]
pub struct CreateChannelRequest {
    pub name: String,
    pub channel_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct MessageModel {
    pub id: Uuid,
    pub channel_id: Uuid,
    pub sender_id: Uuid,
    pub sender_name: String,
    pub ciphertext: String,
    pub nonce: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SendMessagePayload {
    pub channel_id: Uuid,
    pub ciphertext: String,
    pub nonce: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VoiceSignalPayload {
    pub channel_id: Uuid,
    pub target_user_id: Option<Uuid>,
    pub signal_type: String, // "offer" | "answer" | "candidate" | "join" | "leave"
    pub payload: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VoiceStateModel {
    pub channel_id: Uuid,
    pub user_id: Uuid,
    pub username: String,
    pub is_muted: bool,
    pub is_deafened: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MusicSignalPayload {
    pub channel_id: Uuid,
    pub action: String, // "add_track" | "skip_track" | "toggle_pause" | "sync_queue"
    pub payload: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserPresenceModel {
    pub user_id: Uuid,
    pub status: String, // "online" | "offline"
}
