use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use uuid::Uuid;

use crate::{
    auth::AuthUser,
    models::{
        CreateChannelRequest, CreateServerRequest, RespondInviteRequest, SendInviteRequest, UserResponse,
    },
    AppState,
};

pub async fn create_server(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateServerRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if payload.name.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Server name cannot be empty".into()));
    }

    let server = state
        .pool
        .create_server(&payload.name, user.id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok((StatusCode::CREATED, Json(server)))
}

pub async fn list_my_servers(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let servers = state
        .pool
        .list_my_servers(user.id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(servers))
}

pub async fn list_channels(
    State(state): State<AppState>,
    _user: AuthUser,
    Path(server_id): Path<Uuid>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let channels = state
        .pool
        .list_channels(server_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(channels))
}

pub async fn create_channel(
    State(state): State<AppState>,
    user: AuthUser,
    Path(server_id): Path<Uuid>,
    Json(payload): Json<CreateChannelRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let is_member = state
        .pool
        .is_server_member(server_id, user.id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !is_member {
        return Err((StatusCode::FORBIDDEN, "Not a member of this server".into()));
    }

    let channel_type = payload.channel_type.unwrap_or_else(|| "text".into());
    let channel = state
        .pool
        .create_channel(server_id, &payload.name, &channel_type)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let _ = state.tx.send(crate::ws::gateway::WsFrame::ChannelCreated(channel.clone()));

    Ok((StatusCode::CREATED, Json(channel)))
}

pub async fn get_channel_messages(
    State(state): State<AppState>,
    _user: AuthUser,
    Path(channel_id): Path<Uuid>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let messages = state
        .pool
        .get_channel_messages(channel_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(messages))
}

pub async fn send_invite(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<SendInviteRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let invite = state
        .pool
        .create_server_invite(user.id, payload.server_id, &payload.tag)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    let _ = state.tx.send(crate::ws::gateway::WsFrame::ServerInviteReceived(invite.clone()));

    Ok((StatusCode::CREATED, Json(invite)))
}

pub async fn list_pending_invites(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let invites = state
        .pool
        .list_pending_invites(user.id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(invites))
}

pub async fn respond_invite(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<RespondInviteRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    state
        .pool
        .respond_server_invite(user.id, payload.invite_id, payload.accept)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    Ok(StatusCode::OK)
}

pub async fn list_server_members(
    State(state): State<AppState>,
    _user: AuthUser,
    Path(server_id): Path<Uuid>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let members = state
        .pool
        .list_server_members(server_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let resp: Vec<UserResponse> = members.into_iter().map(Into::into).collect();
    Ok(Json(resp))
}
