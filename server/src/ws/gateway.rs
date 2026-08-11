use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Query, State,
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tracing::{error, info};
use uuid::Uuid;

use crate::{
    auth::verify_jwt,
    models::{MessageModel, MusicSignalPayload, SendMessagePayload, VoiceSignalPayload, VoiceStateModel},
    AppState,
};

#[derive(Debug, Deserialize)]
pub struct WsQuery {
    pub token: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", content = "data")]
pub enum WsFrame {
    AuthSuccess { user_id: Uuid, username: String },
    SendMessage(SendMessagePayload),
    NewMessage(MessageModel),
    ChannelCreated(crate::models::ChannelModel),
    VoiceSignal(VoiceSignalPayload),
    VoiceSignalRelay {
        sender_id: Uuid,
        sender_name: String,
        payload: VoiceSignalPayload,
    },
    MusicSignal(MusicSignalPayload),
    MusicSignalRelay {
        sender_id: Uuid,
        sender_name: String,
        payload: MusicSignalPayload,
    },
    VoiceStateUpdate(VoiceStateModel),
    ServerInviteReceived(crate::models::ServerInviteModel),
    FriendAdded(crate::models::UserResponse),
    UserProfileUpdated(crate::models::UserResponse),
    UserPresence(crate::models::UserPresenceModel),
    OnlineUsersList(Vec<Uuid>),
    Error(String),
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<WsQuery>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, query.token, state))
}

async fn handle_socket(socket: WebSocket, token: String, state: AppState) {
    let claims = match verify_jwt(&token, &state.jwt_secret) {
        Ok(c) => c,
        Err(_) => return,
    };

    let user_id = claims.sub;
    let username = claims.username;
    info!("WebSocket client connected: {} ({})", username, user_id);

    // Track online user presence
    {
        if let Ok(mut set) = state.online_users.write() {
            set.insert(user_id);
        }
    }

    let (mut sender, mut receiver) = socket.split();

    // Send auth success frame
    let init_frame = WsFrame::AuthSuccess {
        user_id,
        username: username.clone(),
    };
    if let Ok(json) = serde_json::to_string(&init_frame) {
        let _ = sender.send(Message::Text(json)).await;
    }

    // Send initial list of online users to current client
    let online_list: Vec<Uuid> = state
        .online_users
        .read()
        .map(|s| s.iter().copied().collect())
        .unwrap_or_default();
    let online_list_frame = WsFrame::OnlineUsersList(online_list);
    if let Ok(json) = serde_json::to_string(&online_list_frame) {
        let _ = sender.send(Message::Text(json)).await;
    }

    // Broadcast online status of this user to everyone
    let _ = state.tx.send(WsFrame::UserPresence(crate::models::UserPresenceModel {
        user_id,
        status: "online".into(),
    }));

    let mut rx = state.tx.subscribe();

    let user_id_clone = user_id;
    let username_clone = username.clone();
    let state_clone = state.clone();

    // Spawn broadcast listener task for outgoing messages & signaling to client
    let mut send_task = tokio::spawn(async move {
        while let Ok(frame) = rx.recv().await {
            if let Ok(json) = serde_json::to_string(&frame) {
                if sender.send(Message::Text(json)).await.is_err() {
                    break;
                }
            }
        }
    });

    // Receive incoming WebSocket frames from client
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Text(text) = msg {
                if let Ok(frame) = serde_json::from_str::<WsFrame>(&text) {
                    match frame {
                        WsFrame::SendMessage(payload) => {
                            let message_res = state_clone
                                .pool
                                .insert_message(
                                    payload.channel_id,
                                    user_id_clone,
                                    &username_clone,
                                    &payload.ciphertext,
                                    payload.nonce.as_deref(),
                                )
                                .await;

                            match message_res {
                                Ok(db_msg) => {
                                    let _ = state_clone.tx.send(WsFrame::NewMessage(db_msg));
                                }
                                Err(e) => {
                                    error!("Failed to save WS message: {e}");
                                }
                            }
                        }
                        WsFrame::VoiceSignal(signal) => {
                            let relay_frame = WsFrame::VoiceSignalRelay {
                                sender_id: user_id_clone,
                                sender_name: username_clone.clone(),
                                payload: signal,
                            };
                            let _ = state_clone.tx.send(relay_frame);
                        }
                        WsFrame::MusicSignal(signal) => {
                            let relay_frame = WsFrame::MusicSignalRelay {
                                sender_id: user_id_clone,
                                sender_name: username_clone.clone(),
                                payload: signal,
                            };
                            let _ = state_clone.tx.send(relay_frame);
                        }
                        _ => {}
                    }
                }
            } else if let Message::Ping(_) = msg {
                // Heartbeat ping handling
            }
        }
    });

    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    }

    // Cleanup online presence on disconnect
    {
        if let Ok(mut set) = state.online_users.write() {
            set.remove(&user_id);
        }
    }
    let _ = state.tx.send(WsFrame::UserPresence(crate::models::UserPresenceModel {
        user_id,
        status: "offline".into(),
    }));

    info!("WebSocket disconnected: {}", username);
}
