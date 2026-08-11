use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};

use crate::{
    auth::{generate_jwt, hash_password, verify_password, AuthUser},
    models::{AuthResponse, LoginRequest, RegisterRequest, UserResponse},
    AppState,
};

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if payload.username.trim().is_empty() || payload.email.trim().is_empty() || payload.password.len() < 6 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Validation error: username, email, and 6+ char password required".into(),
        ));
    }

    let password_hash = hash_password(&payload.password)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let user = state
        .pool
        .insert_user(
            &payload.username,
            &payload.email,
            &password_hash,
            payload.public_identity_key.as_deref(),
        )
        .await
        .map_err(|_| (StatusCode::CONFLICT, "Username or email already exists".into()))?;

    let token = generate_jwt(user.id, &user.username, &state.jwt_secret)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let user_resp: UserResponse = user.into();
    Ok((StatusCode::CREATED, Json(AuthResponse { token, user: user_resp })))
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let user = state
        .pool
        .get_user_by_email(&payload.email)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::UNAUTHORIZED, "Invalid email or password".into()))?;

    if !verify_password(&payload.password, &user.password_hash) {
        return Err((StatusCode::UNAUTHORIZED, "Invalid email or password".into()));
    }

    let token = generate_jwt(user.id, &user.username, &state.jwt_secret)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let user_resp: UserResponse = user.into();
    Ok(Json(AuthResponse { token, user: user_resp }))
}

pub async fn get_me(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let db_user = state
        .pool
        .get_user_by_id(user.id)
        .await
        .map_err(|e| (StatusCode::NOT_FOUND, e.to_string()))?;

    let user_resp: UserResponse = db_user.into();
    Ok(Json(user_resp))
}

pub async fn update_profile(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<crate::models::UpdateProfileRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let updated_user = state
        .pool
        .update_user_profile(
            user.id,
            payload.username.as_deref(),
            payload.email.as_deref(),
            payload.about.as_deref(),
        )
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let user_resp: UserResponse = updated_user.into();

    // Broadcast live profile update to all connected users
    let _ = state.tx.send(crate::ws::gateway::WsFrame::UserProfileUpdated(user_resp.clone()));

    Ok(Json(user_resp))
}
