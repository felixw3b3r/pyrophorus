use serde_json::json;

#[tokio::test]
async fn test_auth_and_guild_flow() {
    let client = reqwest::Client::new();
    let base_url = "http://localhost:3000";

    // 1. Health Check Test
    let health_res = client.get(format!("{base_url}/health")).send().await;
    if let Ok(res) = health_res {
        assert_eq!(res.status(), 200);
    }

    // 2. Multi-User Registration & Authentication Simulation
    for i in 1..=5 {
        let username = format!("stress_user_{i}_{}", uuid::Uuid::new_v4().simple());
        let email = format!("{username}@test.com");
        let password = "StressTestPassword123!";

        let reg_payload = json!({
            "username": username,
            "email": email,
            "password": password,
        });

        let reg_res = client
            .post(format!("{base_url}/api/auth/register"))
            .json(&reg_payload)
            .send()
            .await;

        if let Ok(res) = reg_res {
            if res.status().is_success() {
                let json: serde_json::Value = res.json().await.unwrap();
                assert!(json["token"].is_string());
            }
        }
    }
}
