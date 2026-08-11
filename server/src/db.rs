use chrono::Utc;
use rand::Rng;
use sqlx::{postgres::PgPoolOptions, sqlite::SqlitePoolOptions, PgPool, SqlitePool};
use tracing::{info, warn};
use uuid::Uuid;

use crate::models::{ChannelModel, MessageModel, ServerInviteModel, ServerModel, User};

#[derive(Clone)]
pub enum DbPool {
    Postgres(PgPool),
    Sqlite(SqlitePool),
}

fn generate_user_tag() -> String {
    let mut rng = rand::thread_rng();
    let chars: Vec<char> = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".chars().collect();
    let digits: Vec<char> = "0123456789".chars().collect();

    let c1 = chars[rng.gen_range(0..chars.len())];
    let c2 = chars[rng.gen_range(0..chars.len())];
    let d1 = digits[rng.gen_range(0..digits.len())];
    let d2 = digits[rng.gen_range(0..digits.len())];
    let c3 = chars[rng.gen_range(0..chars.len())];

    format!("{}{}{}{}{}", c1, c2, d1, d2, c3)
}

impl DbPool {
    pub async fn init(postgres_url: &str, sqlite_url: &str) -> anyhow::Result<Self> {
        info!("Attempting connection to PostgreSQL at {}...", postgres_url);
        let pg_result = tokio::time::timeout(
            std::time::Duration::from_secs(2),
            PgPoolOptions::new().max_connections(20).connect(postgres_url),
        )
        .await;

        match pg_result {
            Ok(Ok(p)) => {
                info!("Connected to PostgreSQL. Running migrations...");
                sqlx::migrate!("./migrations").run(&p).await?;
                Ok(DbPool::Postgres(p))
            }
            _ => {
                warn!("PostgreSQL unavailable. Switching to local embedded SQLite database ({})", sqlite_url);
                let s_pool = SqlitePoolOptions::new()
                    .max_connections(10)
                    .connect(sqlite_url)
                    .await?;
                info!("Connected to SQLite. Running migrations...");
                sqlx::migrate!("./migrations_sqlite").run(&s_pool).await?;
                Ok(DbPool::Sqlite(s_pool))
            }
        }
    }

    pub async fn insert_user(
        &self,
        username: &str,
        email: &str,
        password_hash: &str,
        public_identity_key: Option<&str>,
    ) -> Result<User, sqlx::Error> {
        let new_id = Uuid::new_v4();
        let now = Utc::now();
        let tag = generate_user_tag();

        match self {
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, User>(
                    r#"
                    INSERT INTO users (username, email, password_hash, public_identity_key, user_tag)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id, username, email, password_hash, public_identity_key, user_tag, created_at
                    "#,
                )
                .bind(username)
                .bind(email)
                .bind(password_hash)
                .bind(public_identity_key)
                .bind(&tag)
                .fetch_one(p)
                .await
            }
            DbPool::Sqlite(s) => {
                sqlx::query(
                    r#"
                    INSERT INTO users (id, username, email, password_hash, public_identity_key, user_tag, created_at)
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                    "#,
                )
                .bind(new_id)
                .bind(username)
                .bind(email)
                .bind(password_hash)
                .bind(public_identity_key)
                .bind(&tag)
                .bind(now)
                .execute(s)
                .await?;

                Ok(User {
                    id: new_id,
                    username: username.to_string(),
                    email: email.to_string(),
                    password_hash: password_hash.to_string(),
                    public_identity_key: public_identity_key.map(|s| s.to_string()),
                    user_tag: Some(tag),
                    about: None,
                    created_at: now,
                })
            }
        }
    }

    pub async fn get_user_by_email(&self, email: &str) -> Result<Option<User>, sqlx::Error> {
        match self {
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, User>(
                    "SELECT id, username, email, password_hash, public_identity_key, user_tag, about, created_at FROM users WHERE email = $1",
                )
                .bind(email)
                .fetch_optional(p)
                .await
            }
            DbPool::Sqlite(s) => {
                sqlx::query_as::<_, User>(
                    "SELECT id, username, email, password_hash, public_identity_key, user_tag, about, created_at FROM users WHERE email = ?1",
                )
                .bind(email)
                .fetch_optional(s)
                .await
            }
        }
    }

    pub async fn get_user_by_id(&self, user_id: Uuid) -> Result<User, sqlx::Error> {
        match self {
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, User>(
                    "SELECT id, username, email, password_hash, public_identity_key, user_tag, about, created_at FROM users WHERE id = $1",
                )
                .bind(user_id)
                .fetch_one(p)
                .await
            }
            DbPool::Sqlite(s) => {
                sqlx::query_as::<_, User>(
                    "SELECT id, username, email, password_hash, public_identity_key, user_tag, about, created_at FROM users WHERE id = ?1",
                )
                .bind(user_id)
                .fetch_one(s)
                .await
            }
        }
    }

    pub async fn get_user_by_tag(&self, tag: &str) -> Result<User, sqlx::Error> {
        let clean_tag = tag.trim().trim_start_matches('#').trim().to_uppercase();
        let alt_tag = clean_tag.replace('0', "O");

        match self {
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, User>(
                    r#"
                    SELECT id, username, email, password_hash, public_identity_key, user_tag, about, created_at
                    FROM users
                    WHERE UPPER(user_tag) = $1
                       OR REPLACE(UPPER(user_tag), '0', 'O') = $2
                       OR UPPER(username) = $1
                    LIMIT 1
                    "#
                )
                .bind(&clean_tag)
                .bind(&alt_tag)
                .fetch_one(p)
                .await
            }
            DbPool::Sqlite(s) => {
                sqlx::query_as::<_, User>(
                    r#"
                    SELECT id, username, email, password_hash, public_identity_key, user_tag, about, created_at
                    FROM users
                    WHERE UPPER(user_tag) = ?1
                       OR REPLACE(UPPER(user_tag), '0', 'O') = ?2
                       OR UPPER(username) = ?1
                    LIMIT 1
                    "#
                )
                .bind(&clean_tag)
                .bind(&alt_tag)
                .fetch_one(s)
                .await
            }
        }
    }

    pub async fn add_friend_by_tag(&self, user_id: Uuid, tag: &str) -> Result<User, sqlx::Error> {
        let friend = match self.get_user_by_tag(tag).await {
            Ok(f) => f,
            Err(_) => return Err(sqlx::Error::Protocol("Girdiğiniz koda sahip kullanıcı bulunamadı".into())),
        };

        if friend.id == user_id {
            return Err(sqlx::Error::Protocol("Kendi kendinizi arkadaş olarak ekleyemezsiniz".into()));
        }

        let is_already_friends = match self {
            DbPool::Postgres(p) => {
                sqlx::query_scalar::<_, bool>("SELECT EXISTS(SELECT 1 FROM friends WHERE user_id = $1 AND friend_id = $2)")
                    .bind(user_id)
                    .bind(friend.id)
                    .fetch_one(p)
                    .await?
            }
            DbPool::Sqlite(s) => {
                let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM friends WHERE user_id = ?1 AND friend_id = ?2")
                    .bind(user_id)
                    .bind(friend.id)
                    .fetch_one(s)
                    .await?;
                count > 0
            }
        };

        if is_already_friends {
            return Err(sqlx::Error::Protocol("Bu kullanıcı zaten arkadaş listenizde ekli".into()));
        }

        // Insert BOTH directions so both users see each other in their friends list!
        match self {
            DbPool::Postgres(p) => {
                sqlx::query("INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, 'accepted') ON CONFLICT DO NOTHING")
                    .bind(user_id)
                    .bind(friend.id)
                    .execute(p)
                    .await?;

                sqlx::query("INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, 'accepted') ON CONFLICT DO NOTHING")
                    .bind(friend.id)
                    .bind(user_id)
                    .execute(p)
                    .await?;
            }
            DbPool::Sqlite(s) => {
                sqlx::query("INSERT OR IGNORE INTO friends (user_id, friend_id, status) VALUES (?1, ?2, 'accepted')")
                    .bind(user_id)
                    .bind(friend.id)
                    .execute(s)
                    .await?;

                sqlx::query("INSERT OR IGNORE INTO friends (user_id, friend_id, status) VALUES (?1, ?2, 'accepted')")
                    .bind(friend.id)
                    .bind(user_id)
                    .execute(s)
                    .await?;
            }
        }

        Ok(friend)
    }

    pub async fn remove_friend(&self, user_id: Uuid, friend_id: Uuid) -> Result<(), sqlx::Error> {
        match self {
            DbPool::Postgres(p) => {
                sqlx::query("DELETE FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)")
                    .bind(user_id)
                    .bind(friend_id)
                    .execute(p)
                    .await?;
            }
            DbPool::Sqlite(s) => {
                sqlx::query("DELETE FROM friends WHERE (user_id = ?1 AND friend_id = ?2) OR (user_id = ?2 AND friend_id = ?1)")
                    .bind(user_id)
                    .bind(friend_id)
                    .execute(s)
                    .await?;
            }
        }
        Ok(())
    }

    pub async fn list_friends(&self, user_id: Uuid) -> Result<Vec<User>, sqlx::Error> {
        match self {
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, User>(
                    r#"
                    SELECT u.id, u.username, u.email, u.password_hash, u.public_identity_key, u.user_tag, u.about, u.created_at
                    FROM users u
                    JOIN friends f ON f.friend_id = u.id
                    WHERE f.user_id = $1
                    "#,
                )
                .bind(user_id)
                .fetch_all(p)
                .await
            }
            DbPool::Sqlite(s) => {
                sqlx::query_as::<_, User>(
                    r#"
                    SELECT u.id, u.username, u.email, u.password_hash, u.public_identity_key, u.user_tag, u.about, u.created_at
                    FROM users u
                    JOIN friends f ON f.friend_id = u.id
                    WHERE f.user_id = ?1
                    "#,
                )
                .bind(user_id)
                .fetch_all(s)
                .await
            }
        }
    }

    pub async fn get_or_create_dm_channel(
        &self,
        user_id: Uuid,
        target_user_id: Uuid,
    ) -> Result<ChannelModel, sqlx::Error> {
        let (id1, id2) = if user_id < target_user_id {
            (user_id, target_user_id)
        } else {
            (target_user_id, user_id)
        };
        let dm_name = format!("dm_{}_{}", id1.simple(), id2.simple());
        let dm_server_id = Uuid::nil();

        // Ensure nil server exists
        let _ = match self {
            DbPool::Postgres(p) => {
                let _ = sqlx::query("INSERT INTO servers (id, name, owner_id) VALUES ($1, 'DM System', $2) ON CONFLICT DO NOTHING")
                    .bind(dm_server_id)
                    .bind(user_id)
                    .execute(p)
                    .await;
            }
            DbPool::Sqlite(s) => {
                let _ = sqlx::query("INSERT OR IGNORE INTO servers (id, name, owner_id) VALUES (?1, 'DM System', ?2)")
                    .bind(dm_server_id)
                    .bind(user_id)
                    .execute(s)
                    .await;
            }
        };

        let existing = match self {
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, ChannelModel>("SELECT id, server_id, name, channel_type, position FROM channels WHERE name = $1")
                    .bind(&dm_name)
                    .fetch_optional(p)
                    .await?
            }
            DbPool::Sqlite(s) => {
                sqlx::query_as::<_, ChannelModel>("SELECT id, server_id, name, channel_type, position FROM channels WHERE name = ?1")
                    .bind(&dm_name)
                    .fetch_optional(s)
                    .await?
            }
        };

        if let Some(ch) = existing {
            return Ok(ch);
        }

        let new_id = Uuid::new_v4();
        match self {
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, ChannelModel>(
                    r#"
                    INSERT INTO channels (id, server_id, name, channel_type, position)
                    VALUES ($1, $2, $3, 'dm', 0)
                    RETURNING id, server_id, name, channel_type, position
                    "#,
                )
                .bind(new_id)
                .bind(dm_server_id)
                .bind(&dm_name)
                .fetch_one(p)
                .await
            }
            DbPool::Sqlite(s) => {
                sqlx::query(
                    r#"
                    INSERT INTO channels (id, server_id, name, channel_type, position)
                    VALUES (?1, ?2, ?3, 'dm', 0)
                    "#,
                )
                .bind(new_id)
                .bind(dm_server_id)
                .bind(&dm_name)
                .execute(s)
                .await?;

                Ok(ChannelModel {
                    id: new_id,
                    server_id: dm_server_id,
                    name: dm_name,
                    channel_type: "dm".into(),
                    position: 0,
                })
            }
        }
    }

    pub async fn create_server_invite(
        &self,
        inviter_id: Uuid,
        server_id: Uuid,
        tag: &str,
    ) -> Result<ServerInviteModel, sqlx::Error> {
        let is_inviter_member = self.is_server_member(server_id, inviter_id).await?;
        if !is_inviter_member {
            return Err(sqlx::Error::Protocol("Bu sunucuya davet gönderme yetkiniz yok".into()));
        }

        let invitee = match self.get_user_by_tag(tag).await {
            Ok(u) => u,
            Err(_) => return Err(sqlx::Error::Protocol("Girdiğiniz koda sahip kullanıcı bulunamadı".into())),
        };

        if invitee.id == inviter_id {
            return Err(sqlx::Error::Protocol("Kendi kendinizi sunucuya davet edemezsiniz".into()));
        }

        let is_already_member = self.is_server_member(server_id, invitee.id).await?;
        if is_already_member {
            return Err(sqlx::Error::Protocol("Bu kullanıcı zaten bu sunucunun üyesi".into()));
        }

        let has_pending = match self {
            DbPool::Postgres(p) => {
                sqlx::query_scalar::<_, bool>("SELECT EXISTS(SELECT 1 FROM server_invites WHERE server_id = $1 AND invitee_id = $2 AND status = 'pending')")
                    .bind(server_id)
                    .bind(invitee.id)
                    .fetch_one(p)
                    .await?
            }
            DbPool::Sqlite(s) => {
                let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM server_invites WHERE server_id = ?1 AND invitee_id = ?2 AND status = 'pending'")
                    .bind(server_id)
                    .bind(invitee.id)
                    .fetch_one(s)
                    .await?;
                count > 0
            }
        };

        if has_pending {
            return Err(sqlx::Error::Protocol("Bu kullanıcıya bu sunucu için zaten gönderilmiş bekleyen bir davet var".into()));
        }

        let inviter = self.get_user_by_id(inviter_id).await?;

        let server_name: String = match self {
            DbPool::Postgres(p) => {
                sqlx::query_scalar("SELECT name FROM servers WHERE id = $1")
                    .bind(server_id)
                    .fetch_one(p)
                    .await?
            }
            DbPool::Sqlite(s) => {
                sqlx::query_scalar("SELECT name FROM servers WHERE id = ?1")
                    .bind(server_id)
                    .fetch_one(s)
                    .await?
            }
        };

        let new_id = Uuid::new_v4();
        let now = Utc::now();

        match self {
            DbPool::Postgres(p) => {
                sqlx::query(
                    r#"
                    INSERT INTO server_invites (id, server_id, inviter_id, invitee_id, status)
                    VALUES ($1, $2, $3, $4, 'pending')
                    "#,
                )
                .bind(new_id)
                .bind(server_id)
                .bind(inviter_id)
                .bind(invitee.id)
                .execute(p)
                .await?;
            }
            DbPool::Sqlite(s) => {
                sqlx::query(
                    r#"
                    INSERT INTO server_invites (id, server_id, inviter_id, invitee_id, status, created_at)
                    VALUES (?1, ?2, ?3, ?4, 'pending', ?5)
                    "#,
                )
                .bind(new_id)
                .bind(server_id)
                .bind(inviter_id)
                .bind(invitee.id)
                .bind(now)
                .execute(s)
                .await?;
            }
        }

        Ok(ServerInviteModel {
            id: new_id,
            server_id,
            server_name,
            inviter_id,
            inviter_name: inviter.username,
            invitee_id: invitee.id,
            status: "pending".into(),
            created_at: now,
        })
    }

    pub async fn list_pending_invites(&self, invitee_id: Uuid) -> Result<Vec<ServerInviteModel>, sqlx::Error> {
        match self {
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, ServerInviteModel>(
                    r#"
                    SELECT i.id, i.server_id, s.name as server_name, i.inviter_id, u.username as inviter_name, i.invitee_id, i.status, i.created_at
                    FROM server_invites i
                    JOIN servers s ON s.id = i.server_id
                    JOIN users u ON u.id = i.inviter_id
                    WHERE i.invitee_id = $1 AND i.status = 'pending'
                    ORDER BY i.created_at DESC
                    "#,
                )
                .bind(invitee_id)
                .fetch_all(p)
                .await
            }
            DbPool::Sqlite(s) => {
                sqlx::query_as::<_, ServerInviteModel>(
                    r#"
                    SELECT i.id, i.server_id, s.name as server_name, i.inviter_id, u.username as inviter_name, i.invitee_id, i.status, i.created_at
                    FROM server_invites i
                    JOIN servers s ON s.id = i.server_id
                    JOIN users u ON u.id = i.inviter_id
                    WHERE i.invitee_id = ?1 AND i.status = 'pending'
                    ORDER BY i.created_at DESC
                    "#,
                )
                .bind(invitee_id)
                .fetch_all(s)
                .await
            }
        }
    }

    pub async fn respond_server_invite(&self, user_id: Uuid, invite_id: Uuid, accept: bool) -> Result<(), sqlx::Error> {
        let status_str = if accept { "accepted" } else { "declined" };

        let invite: (Uuid, Uuid) = match self {
            DbPool::Postgres(p) => {
                sqlx::query_as("SELECT server_id, invitee_id FROM server_invites WHERE id = $1")
                    .bind(invite_id)
                    .fetch_one(p)
                    .await?
            }
            DbPool::Sqlite(s) => {
                sqlx::query_as("SELECT server_id, invitee_id FROM server_invites WHERE id = ?1")
                    .bind(invite_id)
                    .fetch_one(s)
                    .await?
            }
        };

        if invite.1 != user_id {
            return Err(sqlx::Error::RowNotFound);
        }

        match self {
            DbPool::Postgres(p) => {
                sqlx::query("UPDATE server_invites SET status = $1 WHERE id = $2")
                    .bind(status_str)
                    .bind(invite_id)
                    .execute(p)
                    .await?;

                if accept {
                    sqlx::query("INSERT INTO server_members (server_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING")
                        .bind(invite.0)
                        .bind(user_id)
                        .execute(p)
                        .await?;
                }
            }
            DbPool::Sqlite(s) => {
                sqlx::query("UPDATE server_invites SET status = ?1 WHERE id = ?2")
                    .bind(status_str)
                    .bind(invite_id)
                    .execute(s)
                    .await?;

                if accept {
                    sqlx::query("INSERT OR IGNORE INTO server_members (server_id, user_id) VALUES (?1, ?2)")
                        .bind(invite.0)
                        .bind(user_id)
                        .execute(s)
                        .await?;
                }
            }
        }

        Ok(())
    }

    pub async fn list_server_members(&self, server_id: Uuid) -> Result<Vec<User>, sqlx::Error> {
        match self {
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, User>(
                    r#"
                    SELECT u.id, u.username, u.email, u.password_hash, u.public_identity_key, u.user_tag, u.about, u.created_at
                    FROM users u
                    JOIN server_members sm ON sm.user_id = u.id
                    WHERE sm.server_id = $1
                    ORDER BY u.username ASC
                    "#,
                )
                .bind(server_id)
                .fetch_all(p)
                .await
            }
            DbPool::Sqlite(s) => {
                sqlx::query_as::<_, User>(
                    r#"
                    SELECT u.id, u.username, u.email, u.password_hash, u.public_identity_key, u.user_tag, u.about, u.created_at
                    FROM users u
                    JOIN server_members sm ON sm.user_id = u.id
                    WHERE sm.server_id = ?1
                    ORDER BY u.username ASC
                    "#,
                )
                .bind(server_id)
                .fetch_all(s)
                .await
            }
        }
    }

    pub async fn update_user_profile(
        &self,
        user_id: Uuid,
        username: Option<&str>,
        email: Option<&str>,
        about: Option<&str>,
    ) -> Result<User, sqlx::Error> {
        let mut current = self.get_user_by_id(user_id).await?;
        if let Some(u) = username {
            if !u.trim().is_empty() {
                current.username = u.trim().to_string();
            }
        }
        if let Some(e) = email {
            if !e.trim().is_empty() {
                current.email = e.trim().to_string();
            }
        }
        if let Some(a) = about {
            current.about = Some(a.trim().to_string());
        }

        match self {
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, User>(
                    r#"
                    UPDATE users
                    SET username = $1, email = $2, about = $3
                    WHERE id = $4
                    RETURNING id, username, email, password_hash, public_identity_key, user_tag, about, created_at
                    "#,
                )
                .bind(&current.username)
                .bind(&current.email)
                .bind(&current.about)
                .bind(user_id)
                .fetch_one(p)
                .await
            }
            DbPool::Sqlite(s) => {
                sqlx::query(
                    r#"
                    UPDATE users
                    SET username = ?1, email = ?2, about = ?3
                    WHERE id = ?4
                    "#,
                )
                .bind(&current.username)
                .bind(&current.email)
                .bind(&current.about)
                .bind(user_id)
                .execute(s)
                .await?;

                Ok(current)
            }
        }
    }

    pub async fn create_server(&self, name: &str, owner_id: Uuid) -> Result<ServerModel, sqlx::Error> {
        let new_id = Uuid::new_v4();
        let now = Utc::now();

        let server = match self {
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, ServerModel>(
                    r#"
                    INSERT INTO servers (name, owner_id)
                    VALUES ($1, $2)
                    RETURNING id, name, owner_id, icon_url, created_at
                    "#,
                )
                .bind(name)
                .bind(owner_id)
                .fetch_one(p)
                .await?
            }
            DbPool::Sqlite(s) => {
                sqlx::query(
                    r#"
                    INSERT INTO servers (id, name, owner_id, created_at)
                    VALUES (?1, ?2, ?3, ?4)
                    "#,
                )
                .bind(new_id)
                .bind(name)
                .bind(owner_id)
                .bind(now)
                .execute(s)
                .await?;

                ServerModel {
                    id: new_id,
                    name: name.to_string(),
                    owner_id,
                    icon_url: None,
                    created_at: now,
                }
            }
        };

        // Add member & default channels (music, text, voice)
        match self {
            DbPool::Postgres(p) => {
                sqlx::query("INSERT INTO server_members (server_id, user_id) VALUES ($1, $2)")
                    .bind(server.id)
                    .bind(owner_id)
                    .execute(p)
                    .await?;

                sqlx::query("INSERT INTO channels (server_id, name, channel_type, position) VALUES ($1, $2, 'music', 0)")
                    .bind(server.id)
                    .bind("müzik")
                    .execute(p)
                    .await?;

                sqlx::query("INSERT INTO channels (server_id, name, channel_type, position) VALUES ($1, $2, 'text', 1)")
                    .bind(server.id)
                    .bind("genel")
                    .execute(p)
                    .await?;

                sqlx::query("INSERT INTO channels (server_id, name, channel_type, position) VALUES ($1, $2, 'voice', 2)")
                    .bind(server.id)
                    .bind("ses")
                    .execute(p)
                    .await?;
            }
            DbPool::Sqlite(s) => {
                sqlx::query("INSERT OR IGNORE INTO server_members (server_id, user_id) VALUES (?1, ?2)")
                    .bind(server.id)
                    .bind(owner_id)
                    .execute(s)
                    .await?;

                let music_id = Uuid::new_v4();
                sqlx::query("INSERT INTO channels (id, server_id, name, channel_type, position) VALUES (?1, ?2, ?3, 'music', 0)")
                    .bind(music_id)
                    .bind(server.id)
                    .bind("müzik")
                    .execute(s)
                    .await?;

                let channel_id = Uuid::new_v4();
                sqlx::query("INSERT INTO channels (id, server_id, name, channel_type, position) VALUES (?1, ?2, ?3, 'text', 1)")
                    .bind(channel_id)
                    .bind(server.id)
                    .bind("genel")
                    .execute(s)
                    .await?;

                let voice_id = Uuid::new_v4();
                sqlx::query("INSERT INTO channels (id, server_id, name, channel_type, position) VALUES (?1, ?2, ?3, 'voice', 2)")
                    .bind(voice_id)
                    .bind(server.id)
                    .bind("ses")
                    .execute(s)
                    .await?;
            }
        }

        Ok(server)
    }

    pub async fn list_my_servers(&self, user_id: Uuid) -> Result<Vec<ServerModel>, sqlx::Error> {
        match self {
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, ServerModel>(
                    r#"
                    SELECT s.id, s.name, s.owner_id, s.icon_url, s.created_at
                    FROM servers s
                    JOIN server_members sm ON sm.server_id = s.id
                    WHERE sm.user_id = $1
                    ORDER BY s.created_at ASC
                    "#,
                )
                .bind(user_id)
                .fetch_all(p)
                .await
            }
            DbPool::Sqlite(s) => {
                sqlx::query_as::<_, ServerModel>(
                    r#"
                    SELECT s.id, s.name, s.owner_id, s.icon_url, s.created_at
                    FROM servers s
                    JOIN server_members sm ON sm.server_id = s.id
                    WHERE sm.user_id = ?1
                    ORDER BY s.created_at ASC
                    "#,
                )
                .bind(user_id)
                .fetch_all(s)
                .await
            }
        }
    }

    pub async fn list_channels(&self, server_id: Uuid) -> Result<Vec<ChannelModel>, sqlx::Error> {
        let channels = match self {
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, ChannelModel>(
                    "SELECT id, server_id, name, channel_type, position FROM channels WHERE server_id = $1 ORDER BY position ASC, name ASC",
                )
                .bind(server_id)
                .fetch_all(p)
                .await?
            }
            DbPool::Sqlite(s) => {
                sqlx::query_as::<_, ChannelModel>(
                    "SELECT id, server_id, name, channel_type, position FROM channels WHERE server_id = ?1 ORDER BY position ASC, name ASC",
                )
                .bind(server_id)
                .fetch_all(s)
                .await?
            }
        };

        if !channels.iter().any(|c| c.channel_type == "music") {
            let _ = self.create_channel(server_id, "müzik", "music").await;
            return match self {
                DbPool::Postgres(p) => {
                    sqlx::query_as::<_, ChannelModel>(
                        "SELECT id, server_id, name, channel_type, position FROM channels WHERE server_id = $1 ORDER BY position ASC, name ASC",
                    )
                    .bind(server_id)
                    .fetch_all(p)
                    .await
                }
                DbPool::Sqlite(s) => {
                    sqlx::query_as::<_, ChannelModel>(
                        "SELECT id, server_id, name, channel_type, position FROM channels WHERE server_id = ?1 ORDER BY position ASC, name ASC",
                    )
                    .bind(server_id)
                    .fetch_all(s)
                    .await
                }
            };
        }

        Ok(channels)
    }

    pub async fn is_server_member(&self, server_id: Uuid, user_id: Uuid) -> Result<bool, sqlx::Error> {
        match self {
            DbPool::Postgres(p) => {
                sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM server_members WHERE server_id = $1 AND user_id = $2)")
                    .bind(server_id)
                    .bind(user_id)
                    .fetch_one(p)
                    .await
            }
            DbPool::Sqlite(s) => {
                let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM server_members WHERE server_id = ?1 AND user_id = ?2")
                    .bind(server_id)
                    .bind(user_id)
                    .fetch_one(s)
                    .await?;
                Ok(count > 0)
            }
        }
    }

    pub async fn create_channel(&self, server_id: Uuid, name: &str, channel_type: &str) -> Result<ChannelModel, sqlx::Error> {
        let new_id = Uuid::new_v4();

        match self {
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, ChannelModel>(
                    r#"
                    INSERT INTO channels (server_id, name, channel_type, position)
                    VALUES ($1, $2, $3, 0)
                    RETURNING id, server_id, name, channel_type, position
                    "#,
                )
                .bind(server_id)
                .bind(name)
                .bind(channel_type)
                .fetch_one(p)
                .await
            }
            DbPool::Sqlite(s) => {
                sqlx::query(
                    r#"
                    INSERT INTO channels (id, server_id, name, channel_type, position)
                    VALUES (?1, ?2, ?3, ?4, 0)
                    "#,
                )
                .bind(new_id)
                .bind(server_id)
                .bind(name)
                .bind(channel_type)
                .execute(s)
                .await?;

                Ok(ChannelModel {
                    id: new_id,
                    server_id,
                    name: name.to_string(),
                    channel_type: channel_type.to_string(),
                    position: 0,
                })
            }
        }
    }

    pub async fn get_channel_messages(&self, channel_id: Uuid) -> Result<Vec<MessageModel>, sqlx::Error> {
        match self {
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, MessageModel>(
                    r#"
                    SELECT id, channel_id, sender_id, sender_name, ciphertext, nonce, created_at
                    FROM messages
                    WHERE channel_id = $1
                    ORDER BY created_at ASC
                    LIMIT 100
                    "#,
                )
                .bind(channel_id)
                .fetch_all(p)
                .await
            }
            DbPool::Sqlite(s) => {
                sqlx::query_as::<_, MessageModel>(
                    r#"
                    SELECT id, channel_id, sender_id, sender_name, ciphertext, nonce, created_at
                    FROM messages
                    WHERE channel_id = ?1
                    ORDER BY created_at ASC
                    LIMIT 100
                    "#,
                )
                .bind(channel_id)
                .fetch_all(s)
                .await
            }
        }
    }

    pub async fn insert_message(
        &self,
        channel_id: Uuid,
        sender_id: Uuid,
        sender_name: &str,
        ciphertext: &str,
        nonce: Option<&str>,
    ) -> Result<MessageModel, sqlx::Error> {
        let new_id = Uuid::new_v4();
        let now = Utc::now();

        match self {
            DbPool::Postgres(p) => {
                sqlx::query_as::<_, MessageModel>(
                    r#"
                    INSERT INTO messages (channel_id, sender_id, sender_name, ciphertext, nonce)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id, channel_id, sender_id, sender_name, ciphertext, nonce, created_at
                    "#,
                )
                .bind(channel_id)
                .bind(sender_id)
                .bind(sender_name)
                .bind(ciphertext)
                .bind(nonce)
                .fetch_one(p)
                .await
            }
            DbPool::Sqlite(s) => {
                sqlx::query(
                    r#"
                    INSERT INTO messages (id, channel_id, sender_id, sender_name, ciphertext, nonce, created_at)
                    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                    "#,
                )
                .bind(new_id)
                .bind(channel_id)
                .bind(sender_id)
                .bind(sender_name)
                .bind(ciphertext)
                .bind(nonce)
                .bind(now)
                .execute(s)
                .await?;

                Ok(MessageModel {
                    id: new_id,
                    channel_id,
                    sender_id,
                    sender_name: sender_name.to_string(),
                    ciphertext: ciphertext.to_string(),
                    nonce: nonce.map(|s| s.to_string()),
                    created_at: now,
                })
            }
        }
    }
}
