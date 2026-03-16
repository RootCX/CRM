pub fn run() {
    match rootcx_client::ensure_runtime() {
        Ok(rootcx_client::RuntimeStatus::Ready) => {}
        Ok(rootcx_client::RuntimeStatus::NotInstalled) => {
            rootcx_client::prompt_runtime_install()
                .expect("RootCX Runtime installation required");
        }
        Err(e) => panic!("Failed to start RootCX Runtime: {e}"),
    }

    rootcx_client::deploy_bundled_backend("crm");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running application");
}
