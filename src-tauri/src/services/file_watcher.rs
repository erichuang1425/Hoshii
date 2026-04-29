use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

/// Debounce interval for file system events
const DEBOUNCE_MS: u64 = 100;

/// Manages file system watchers for root folders.
/// Emits `gallery_updated` events to the Tauri app when changes are detected.
pub struct FileWatcherService {
    watchers: Arc<Mutex<HashMap<String, RecommendedWatcher>>>,
}

impl FileWatcherService {
    pub fn new() -> Self {
        Self {
            watchers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Start watching a root folder path. Changes are debounced and emitted
    /// as `gallery_updated` Tauri events.
    pub fn watch_root<F>(&self, root_path: &str, on_change: F) -> Result<(), String>
    where
        F: Fn(Vec<PathBuf>) + Send + 'static,
    {
        let path = Path::new(root_path);
        if !path.exists() {
            return Err(format!("Path does not exist: {}", root_path));
        }

        let root_key = root_path.to_string();

        // Stop existing watcher for this path if any
        {
            let mut watchers = self.watchers.lock().map_err(|e| e.to_string())?;
            watchers.remove(&root_key);
        }

        let (tx, rx) = mpsc::channel::<Result<Event, notify::Error>>();

        let mut watcher = RecommendedWatcher::new(
            move |res| {
                let _ = tx.send(res);
            },
            Config::default(),
        )
        .map_err(|e| format!("Failed to create watcher: {}", e))?;

        watcher
            .watch(path, RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch path: {}", e))?;

        // Debounce thread: collect events over DEBOUNCE_MS, then fire callback
        thread::spawn(move || {
            let mut pending: HashMap<PathBuf, Instant> = HashMap::new();
            let debounce = Duration::from_millis(DEBOUNCE_MS);

            loop {
                match rx.recv_timeout(debounce) {
                    Ok(Ok(event)) => {
                        let now = Instant::now();
                        for path in event.paths {
                            pending.insert(path, now);
                        }
                    }
                    Ok(Err(e)) => {
                        log::warn!("File watcher error: {}", e);
                    }
                    Err(mpsc::RecvTimeoutError::Timeout) => {
                        // Flush any pending events older than debounce interval
                        if !pending.is_empty() {
                            let now = Instant::now();
                            let ready: Vec<PathBuf> = pending
                                .iter()
                                .filter(|(_, ts)| now.duration_since(**ts) >= debounce)
                                .map(|(p, _)| p.clone())
                                .collect();

                            if !ready.is_empty() {
                                for p in &ready {
                                    pending.remove(p);
                                }
                                on_change(ready);
                            }
                        }
                    }
                    Err(mpsc::RecvTimeoutError::Disconnected) => {
                        log::info!("File watcher channel closed, stopping debounce thread");
                        break;
                    }
                }
            }
        });

        {
            let mut watchers = self.watchers.lock().map_err(|e| e.to_string())?;
            watchers.insert(root_key, watcher);
        }

        Ok(())
    }

    /// Stop watching a specific root folder.
    pub fn unwatch_root(&self, root_path: &str) -> Result<(), String> {
        let mut watchers = self.watchers.lock().map_err(|e| e.to_string())?;
        watchers.remove(root_path);
        Ok(())
    }

    /// Stop all watchers.
    pub fn unwatch_all(&self) -> Result<(), String> {
        let mut watchers = self.watchers.lock().map_err(|e| e.to_string())?;
        watchers.clear();
        Ok(())
    }

    /// Get the number of active watchers.
    pub fn active_count(&self) -> usize {
        self.watchers.lock().map(|w| w.len()).unwrap_or(0)
    }
}

impl Default for FileWatcherService {
    fn default() -> Self {
        Self::new()
    }
}
