use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct RuntimeInfo {
    pub adapter: &'static str,
    pub version: &'static str,
}

pub fn runtime_info() -> RuntimeInfo {
    RuntimeInfo {
        adapter: "desktop",
        version: env!("CARGO_PKG_VERSION"),
    }
}

#[tauri::command]
pub fn get_runtime_info() -> RuntimeInfo {
    runtime_info()
}
