// 앱 아이콘을 캐릭터 그림에서 만든다. 캐릭터를 고친 뒤 `npm run icon` 으로 다시 뽑는다.
//   build/icon.png  (1024×1024) — Windows 빌드에서 electron-builder 가 .ico 로 바꿔 쓴다
//   build/icon.icns — macOS 빌드용. macOS 에서 실행할 때만 기본 도구(sips·iconutil)로 만든다
const { app, BrowserWindow } = require('electron');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const renderer = path.join(__dirname, '..', 'renderer');
const css = fs.readFileSync(path.join(renderer, 'character.css'), 'utf8');
const characters = fs.readFileSync(path.join(renderer, 'characters.js'), 'utf8');

// macOS 아이콘 규격: 1024 캔버스 안에 824 크기의 둥근 사각형
const page = `<style>${css}
  html, body { margin: 0; background: transparent; }
  .tile { position: absolute; left: 100px; top: 100px; width: 824px; height: 824px; border-radius: 185px;
    background: #cfe6f2; display: grid; place-items: center; }
  svg { width: 600px; display: block; }
  .eye, .tail { animation: none !important; }
</style>
<script>${characters}</script>
<div class="tile" id="tile"></div>
<script>document.getElementById('tile').innerHTML = window.CHARACTERS[window.DEFAULT_CHARACTER].svg;</script>`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    transparent: true,
    frame: false,
    webPreferences: { offscreen: true },
  });
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(page));
  await new Promise((resolve) => setTimeout(resolve, 500));
  const image = (await win.webContents.capturePage()).resize({ width: 1024, height: 1024, quality: 'best' });
  const build = path.join(__dirname, '..', 'build');
  const png = path.join(build, 'icon.png');
  fs.mkdirSync(build, { recursive: true });
  fs.writeFileSync(png, image.toPNG());
  console.log('wrote', png);

  if (process.platform === 'darwin') {
    const iconset = path.join(build, 'icon.iconset');
    fs.rmSync(iconset, { recursive: true, force: true });
    fs.mkdirSync(iconset);
    for (const size of [16, 32, 128, 256, 512]) {
      for (const [scale, suffix] of [[1, ''], [2, '@2x']]) {
        const px = String(size * scale);
        execFileSync('sips', ['-z', px, px, png, '--out', path.join(iconset, `icon_${size}x${size}${suffix}.png`)]);
      }
    }
    execFileSync('iconutil', ['-c', 'icns', iconset, '-o', path.join(build, 'icon.icns')]);
    fs.rmSync(iconset, { recursive: true });
    console.log('wrote', path.join(build, 'icon.icns'));
  }
  app.quit();
});
