pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![rootcx_client::oidc::oidc_login])
        .run(tauri::generate_context!())
        .expect("error while running application");
}
