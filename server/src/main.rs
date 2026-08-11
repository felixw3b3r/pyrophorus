use std::collections::HashSet;
use std::net::SocketAddr;
use std::sync::{Arc, RwLock};
use uuid::Uuid;
use axum::{
    routing::{delete, get, post, put},
    Router,
};
use tokio::sync::broadcast;
use tower_http::cors::{Any, CorsLayer};
use tracing::info;

mod auth;
mod db;
mod models;
mod routes;
mod ws;

use db::DbPool;

#[derive(Clone)]
pub struct AppState {
    pub pool: DbPool,
    pub jwt_secret: String,
    pub tx: broadcast::Sender<ws::gateway::WsFrame>,
    pub online_users: Arc<RwLock<HashSet<Uuid>>>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt::init();

    let postgres_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://dc_user:dc_password@localhost:5432/dc_db".into());
    let sqlite_url = "sqlite://dc_db.db?mode=rwc";

    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "super-secret-dc-jwt-key-change-in-production-2026".into());
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3000);

    let pool = DbPool::init(&postgres_url, sqlite_url).await?;

    let (tx, _rx) = broadcast::channel(100);
    let online_users = Arc::new(RwLock::new(HashSet::new()));

    let state = AppState {
        pool,
        jwt_secret,
        tx,
        online_users,
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/health", get(|| async { "OK" }))
        .route("/api/auth/register", post(routes::auth::register))
        .route("/api/auth/login", post(routes::auth::login))
        .route("/api/auth/me", get(routes::auth::get_me))
        .route("/api/auth/profile", put(routes::auth::update_profile))
        .route("/api/friends", post(routes::friends::add_friend).get(routes::friends::list_friends))
        .route("/api/friends/:friend_id", delete(routes::friends::remove_friend))
        .route("/api/friends/dm", post(routes::friends::get_or_create_dm))
        .route("/api/servers", post(routes::guilds::create_server).get(routes::guilds::list_my_servers))
        .route("/api/servers/invite", post(routes::guilds::send_invite))
        .route("/api/servers/invites/pending", get(routes::guilds::list_pending_invites))
        .route("/api/servers/invites/respond", post(routes::guilds::respond_invite))
        .route("/api/servers/:id/members", get(routes::guilds::list_server_members))
        .route("/api/servers/:id/channels", post(routes::guilds::create_channel).get(routes::guilds::list_channels))
        .route("/api/channels/:id/messages", get(routes::guilds::get_channel_messages))
        .route("/ws", get(ws::gateway::ws_handler))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("Server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
