use serde_json::json;
use upkeep_lib::runtime_info::runtime_info;

#[test]
fn reports_desktop_adapter_and_crate_version() {
    let info = runtime_info();

    assert_eq!(info.adapter, "desktop");
    assert_eq!(info.version, env!("CARGO_PKG_VERSION"));
}

// Field names must match RuntimeInfo in src/app/runtimeInfo.ts, which the Tauri adapter reads.
#[test]
fn serializes_to_the_shape_the_ts_adapter_reads() {
    let value = serde_json::to_value(runtime_info()).unwrap();

    assert_eq!(
        value,
        json!({ "adapter": "desktop", "version": env!("CARGO_PKG_VERSION") })
    );
}
