const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

const SERVER_HOST = "127.0.0.1";
const SERVER_PORT = 5000;

let serverProcess;

function waitForHttp(url, timeoutMs) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });

      req.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error("Timed out waiting for server"));
          return;
        }
        setTimeout(tick, 200);
      });
    };

    tick();
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 780,
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  win.setMenuBarVisibility(false);

  const url = `http://${SERVER_HOST}:${SERVER_PORT}`;
  win.loadURL(url);
}

async function startBundledServerIfNeeded() {
  if (!app.isPackaged) return;

  const serverEntry = path.join(process.resourcesPath, "app", "dist", "index.cjs");

  serverProcess = spawn(process.execPath, [serverEntry], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(SERVER_PORT),
    },
    stdio: "ignore",
    windowsHide: true,
  });

  await waitForHttp(`http://${SERVER_HOST}:${SERVER_PORT}`, 15000);
}

app.whenReady().then(async () => {
  await startBundledServerIfNeeded();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
});
