const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const {
  MAX_CHARACTERS,
  SCALE_MIN,
  SCALE_MAX,
  MAX_CHEERS,
  MAX_CHEER_LENGTH,
  DEFAULT_CHEERS,
  clamp,
  sanitize,
  inWorkHours,
} = require('./lib/config');
const { CHARACTERS } = require('./renderer/characters');

// 크기 1배일 때의 펫 창 크기. 크기 설정을 바꾸면 창과 내용이 같은 배율로 커진다.
// 폭은 캐릭터 한 명마다 SLOT_W 에 양옆 여백 2×PAD_W 를 더한다. 두 값은 펫 창에도 보내 CSS 의 --slot·--pad 로 건다(정의는 여기 한 곳).
// 여백은 맨 왼쪽 캐릭터 위의 말풍선이 창 밖으로 나가지 않을 만큼이다
const SLOT_W = 95;
const PAD_W = 45;
// 가장 큰 모습(1.5배로 커진 풍뎅이 왕, 134px)에 말풍선(29px)과 그 아래 여백(8px), 클릭했을 때 함께 뛰어오르는 높이(16px)를 더한 값
const BASE_H = 190;
// 발끝이 바에 걸쳐 보이도록 작업 영역 아래로 내리는 픽셀 수 (1배 기준)
const OVERLAP = 3;
// Windows 는 시계 근처(오른쪽), macOS 는 Dock 이 가운데라 가운데에서 살짝 오른쪽
const DEFAULT_X_RATIO = process.platform === 'darwin' ? 0.62 : 0.93;

let win;
let settingsWin = null;
let tray;
// cheers 가 비어 있으면 기본 문구를 쓴다. characters 는 왼쪽부터 세울 순서다
let config = {
  offTime: '18:00',
  startTime: '09:00',
  workHoursOnly: false,
  xRatio: null,
  characters: ['hachi'],
  scale: 1,
  cheers: [],
};
let dragTimer = null;
// 캐릭터가 짓을 하느라 자리를 넓힌 만큼(1배 기준 px). 렌더러가 알려 주며, 창을 양쪽으로 반씩 넓혀 캐릭터 무리의 가운데를 지킨다
let extraWidth = 0;

const knownIds = Object.keys(CHARACTERS);
const configPath = () => path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try {
    Object.assign(config, sanitize(JSON.parse(fs.readFileSync(configPath(), 'utf8')), knownIds));
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
// 평소 창 폭. 저장하는 위치(xRatio)는 이 폭을 기준으로 잰다
const baseWidth = () => Math.round((PAD_W * 2 + SLOT_W * config.characters.length) * config.scale);
const extraPx = () => Math.round(extraWidth * config.scale);
const winSize = () => ({ width: baseWidth() + extraPx(), height: Math.round(BASE_H * config.scale) });
const petY = (area) => area.y + area.height - winSize().height + Math.round(OVERLAP * config.scale);
const clampX = (x, area) => Math.round(clamp(x, area.x, area.x + area.width - winSize().width));

function place() {
  const area = workArea();
  const { width, height } = winSize();
  const ratio = config.xRatio ?? DEFAULT_X_RATIO;
  const x = clampX(area.x + ratio * (area.width - baseWidth()) - extraPx() / 2, area);
  // 크기 조절을 막아 둔 창은 플랫폼에 따라 코드로도 크기가 안 바뀌므로 잠깐 풀었다가 다시 막는다
  win.setResizable(true);
  win.setBounds({ x, y: petY(area), width, height });
  win.setResizable(false);
}

// 펫 창에 보내는 설정. 응원 문구를 비워 두었으면 기본 문구를 채워서 보낸다
const petConfig = () => ({
  offTime: config.offTime,
  characters: config.characters,
  scale: config.scale,
  cheers: config.cheers.length ? config.cheers : DEFAULT_CHEERS,
  layout: { slot: SLOT_W, pad: PAD_W },
});

const autoLaunch = () => ({
  // 개발 실행에서는 등록 대상이 Electron 실행 파일 자체가 되므로 설치본에서만 켤 수 있게 한다
  available: app.isPackaged,
  enabled: app.isPackaged && app.getLoginItemSettings().openAtLogin,
});

const settingsState = () => ({
  offTime: config.offTime,
  startTime: config.startTime,
  workHoursOnly: config.workHoursOnly,
  characters: config.characters,
  scale: config.scale,
  cheers: config.cheers,
  defaultCheers: DEFAULT_CHEERS,
  limits: {
    scaleMin: SCALE_MIN,
    scaleMax: SCALE_MAX,
    maxCheers: MAX_CHEERS,
    maxCheerLength: MAX_CHEER_LENGTH,
    maxCharacters: MAX_CHARACTERS,
  },
  autoLaunch: autoLaunch(),
});

// '업무 시간에만 보이기' 를 켰으면 업무 시간 밖에서는 펫 창을 숨긴다(트레이 아이콘은 남는다)
function applyVisibility() {
  const show = !config.workHoursOnly || inWorkHours(config.startTime, config.offTime);
  if (show === win.isVisible()) return;
  if (show) {
    win.showInactive();
    // macOS 는 보이기 전의 창을 작업 영역 안으로 밀어 올리므로, 보인 뒤에 한 번 더 앉힌다
    place();
  } else {
    win.hide();
  }
}

function applyChanges(changes) {
  Object.assign(config, changes);
  saveConfig();
  place();
  applyVisibility();
  win.webContents.send('config', petConfig());
}

function resetPosition() {
  config.xRatio = null;
  saveConfig();
  place();
}

function openSettings() {
  if (settingsWin) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  // 내용이 화면보다 길면(작은 화면, 캐릭터를 많이 추가했을 때) 창 안에서 스크롤된다. 높이는 늘리거나 줄일 수 있다
  settingsWin = new BrowserWindow({
    width: 460,
    height: Math.min(760, workArea().height - 40),
    minWidth: 400,
    minHeight: 320,
    useContentSize: true,
    title: '퇴근 메이트 설정',
    show: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  settingsWin.removeMenu();
  settingsWin.loadFile(path.join(__dirname, 'renderer', 'settings.html'));
  settingsWin.once('ready-to-show', () => {
    settingsWin.show();
    // Dock 아이콘을 숨긴 앱은 창을 띄워도 앞으로 나오지 않으므로 직접 끌어온다
    app.focus({ steal: true });
  });
  settingsWin.on('closed', () => {
    settingsWin = null;
  });
}

// 이미지 파일 없이 트레이 아이콘(고양이 얼굴 실루엣)을 픽셀로 그린다
function trayIcon() {
  const size = 32;
  const mac = process.platform === 'darwin';
  const [r, g, b] = mac ? [0, 0, 0] : [255, 143, 171];
  const inHead = (x, y) => (x - 16) ** 2 + (y - 20) ** 2 <= 11 * 11;
  // 귀: 좌우 대칭인 삼각형. 세 변 모두에 대해 같은 쪽에 있으면 안쪽이다
  const ear = [[5, 16], [8, 2], [17, 11]];
  const inEar = (x, y) => {
    const side = ear.map(([ax, ay], i) => {
      const [bx, by] = ear[(i + 1) % 3];
      return (bx - ax) * (y - ay) - (by - ay) * (x - ax) >= 0;
    });
    return side.every((s) => s === side[0]);
  };
  const inside = (x, y) => inHead(x, y) || inEar(x, y) || inEar(32 - x, y);
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hit = 0;
      for (let s = 0; s < 9; s++) {
        const px = x + ((s % 3) + 0.5) / 3;
        const py = y + (Math.floor(s / 3) + 0.5) / 3;
        if (inside(px, py)) hit++;
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
  return Menu.buildFromTemplate([
    { label: '설정…', click: openSettings },
    { label: '위치 초기화', click: resetPosition },
    { type: 'separator' },
    { label: '종료', role: 'quit' },
  ]);
}

function createWindow() {
  win = new BrowserWindow({
    ...winSize(),
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
  win.once('ready-to-show', applyVisibility);
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

    // 출근·퇴근 시각을 지나는 순간을 놓치지 않게 주기적으로 다시 본다
    setInterval(applyVisibility, 15000);

    // 해상도·배율·바 크기(자동 숨김 포함)가 바뀌면 다시 앉힌다
    for (const event of ['display-metrics-changed', 'display-added', 'display-removed']) {
      screen.on(event, place);
    }

    ipcMain.handle('config', petConfig);
    ipcMain.handle('settings:get', settingsState);
    ipcMain.handle('settings:set', (_event, raw) => {
      // 위치는 드래그와 '위치 초기화' 로만 바뀐다
      const { xRatio, ...changes } = sanitize(raw, knownIds);
      applyChanges(changes);
      return settingsState();
    });
    ipcMain.handle('settings:auto-launch', (_event, on) => {
      if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: Boolean(on) });
      return autoLaunch();
    });
    ipcMain.on('settings:reset-position', resetPosition);
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
      config.xRatio = (win.getPosition()[0] + extraPx() / 2 - area.x) / Math.max(area.width - baseWidth(), 1);
      saveConfig();
    });
    ipcMain.on('extra-width', (_event, px) => {
      extraWidth = Number.isFinite(px) ? clamp(px, 0, 500) : 0;
      if (!dragTimer) place();
    });
  });
}
