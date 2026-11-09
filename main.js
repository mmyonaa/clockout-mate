const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const WIN_W = 180;
const WIN_H = 150;
// 발끝이 바에 걸쳐 보이도록 작업 영역 아래로 내리는 픽셀 수
const OVERLAP = 3;
const OFF_TIMES = ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];
// Windows 는 시계 근처(오른쪽), macOS 는 Dock 이 가운데라 가운데에서 살짝 오른쪽
const DEFAULT_X_RATIO = process.platform === 'darwin' ? 0.62 : 0.93;

let win;
let tray;
let config = { offTime: '18:00', xRatio: null };
let dragTimer = null;

const configPath = () => path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try {
    const saved = JSON.parse(fs.readFileSync(configPath(), 'utf8'));
    if (/^([01]?\d|2[0-3]):[0-5]\d$/.test(saved.offTime)) config.offTime = saved.offTime;
    if (Number.isFinite(saved.xRatio)) config.xRatio = Math.min(Math.max(saved.xRatio, 0), 1);
  } catch {
    // 첫 실행이거나 파일이 깨졌으면 기본값으로 시작한다
  }
}

function saveConfig() {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2));
}

// 작업 영역 = 화면에서 작업 표시줄/Dock 을 뺀 영역. 그 바닥에 창 바닥을 맞추면 바 위에 앉은 것처럼 보인다
const workArea = () => screen.getPrimaryDisplay().workArea;
const petY = (area) => area.y + area.height - WIN_H + OVERLAP;
const clampX = (x, area) => Math.round(Math.min(Math.max(x, area.x), area.x + area.width - WIN_W));

function place() {
  const area = workArea();
  const ratio = config.xRatio ?? DEFAULT_X_RATIO;
  win.setPosition(clampX(area.x + ratio * (area.width - WIN_W), area), petY(area));
}

// 이미지 파일 없이 트레이 아이콘(곰 얼굴 실루엣)을 픽셀로 그린다
function trayIcon() {
  const size = 32;
  const mac = process.platform === 'darwin';
  const [r, g, b] = mac ? [0, 0, 0] : [255, 143, 171];
  const circles = [[16, 19, 11], [7, 9, 5], [25, 9, 5]];
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hit = 0;
      for (let s = 0; s < 9; s++) {
        const px = x + ((s % 3) + 0.5) / 3;
        const py = y + (Math.floor(s / 3) + 0.5) / 3;
        if (circles.some(([cx, cy, rad]) => (px - cx) ** 2 + (py - cy) ** 2 <= rad * rad)) hit++;
      }
      const alpha = hit / 9;
      // BGRA, 알파를 미리 곱한 값
      buf.set([b * alpha, g * alpha, r * alpha, 255 * alpha], (y * size + x) * 4);
    }
  }
  const image = nativeImage.createFromBitmap(buf, { width: size, height: size, scaleFactor: 2 });
  if (mac) image.setTemplateImage(true);
  return image;
}

function buildMenu() {
  // 설정 파일에 목록 밖의 시각을 직접 적었어도 메뉴에 나타나게 한다
  const times = [...new Set([config.offTime.padStart(5, '0'), ...OFF_TIMES])].sort();
  return Menu.buildFromTemplate([
    {
      label: '퇴근 시각',
      submenu: times.map((time) => ({
        label: time,
        type: 'radio',
        checked: time === config.offTime.padStart(5, '0'),
        click: () => setOffTime(time),
      })),
    },
    {
      label: '위치 초기화',
      click: () => {
        config.xRatio = null;
        saveConfig();
        place();
      },
    },
    { type: 'separator' },
    { label: '종료', role: 'quit' },
  ]);
}

function setOffTime(time) {
  config.offTime = time;
  saveConfig();
  tray.setContextMenu(buildMenu());
  win.webContents.send('config', { offTime: time });
}

function createWindow() {
  win = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    show: false,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    alwaysOnTop: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  // macOS 는 Dock(레벨 20)보다 위·메뉴(101)보다 아래, Windows 는 최상위
  win.setAlwaysOnTop(true, process.platform === 'darwin' ? 'status' : 'screen-saver');
  win.setVisibleOnAllWorkspaces(true);
  // 기본은 클릭 통과. 캐릭터 위에 올라왔을 때만 렌더러가 풀어 달라고 요청한다
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  place();
  win.once('ready-to-show', () => {
    win.showInactive();
    // macOS 는 보이기 전의 창을 작업 영역 안으로 밀어 올리므로, 보인 뒤에 한 번 더 앉힌다
    place();
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    app.dock?.hide();
    loadConfig();
    createWindow();

    tray = new Tray(trayIcon());
    tray.setToolTip('퇴근 메이트');
    tray.setContextMenu(buildMenu());

    // 해상도·배율·바 크기(자동 숨김 포함)가 바뀌면 다시 앉힌다
    for (const event of ['display-metrics-changed', 'display-added', 'display-removed']) {
      screen.on(event, place);
    }

    ipcMain.handle('config', () => ({ offTime: config.offTime }));
    ipcMain.on('interactive', (_event, on) => win.setIgnoreMouseEvents(!on, { forward: true }));
    ipcMain.on('status', (_event, text) => tray.setToolTip(String(text)));
    ipcMain.on('menu', () => buildMenu().popup({ window: win }));
    // 드래그 중에는 실제 커서 좌표를 직접 읽어 따라간다. 창이 움직이는 동안에는 렌더러가 받는 좌표가 흔들리기 때문이다
    ipcMain.on('drag-start', () => {
      clearInterval(dragTimer);
      const grabOffset = screen.getCursorScreenPoint().x - win.getPosition()[0];
      dragTimer = setInterval(() => {
        const area = workArea();
        win.setPosition(clampX(screen.getCursorScreenPoint().x - grabOffset, area), petY(area));
      }, 16);
    });
    ipcMain.on('drag-end', () => {
      clearInterval(dragTimer);
      dragTimer = null;
      const area = workArea();
      config.xRatio = (win.getPosition()[0] - area.x) / Math.max(area.width - WIN_W, 1);
      saveConfig();
    });
  });
}
