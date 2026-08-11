use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};

use crate::{
    auth::AuthUser,
    models::{AddFriendRequest, CreateDmRequest, UserResponse},
    AppState,
};

pub async fn add_friend(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<AddFriendRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let friend = state
        .pool
        .add_friend_by_tag(user.id, &payload.tag)
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    let resp: UserResponse = friend.into();
    let _ = state.tx.send(crate::ws::gateway::WsFrame::FriendAdded(resp.clone()));

    Ok((StatusCode::CREATED, Json(resp)))
}

pub async fn list_friends(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let friends = state
        .pool
        .list_friends(user.id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let resp: Vec<UserResponse> = friends.into_iter().map(Into::into).collect();
    Ok(Json(resp))
}

pub async fn get_or_create_dm(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateDmRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let channel = state
        .pool
        .get_or_create_dm_channel(user.id, payload.target_user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(channel))
}

pub async fn remove_friend(
    State(state): State<AppState>,
    user: AuthUser,
    axum::extract::Path(friend_id): axum::extract::Path<uuid::Uuid>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    state
        .pool
        .remove_friend(user.id, friend_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}
