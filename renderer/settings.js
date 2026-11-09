// 설정 창. 값을 바꾸면 바로 메인 프로세스에 보내 펫 창에 반영하고 저장한다(저장 버튼 없음)
const $ = (id) => document.getElementById(id);

const form = $('form');
const offTime = $('offTime');
const startTime = $('startTime');
const workHoursOnly = $('workHoursOnly');
const scale = $('scale');
const cheers = $('cheers');
const autoLaunch = $('autoLaunch');

let limits = null;
let statusTimer = null;

function say(text) {
  $('status').textContent = text;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    $('status').textContent = '';
  }, 2500);
}

function setError(input, message) {
  $(`${input.id}-error`).textContent = message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

async function save(changes) {
  try {
    await window.mate.setSettings(changes);
    $('save-error').textContent = '';
    say('저장했습니다.');
  } catch {
    $('save-error').textContent = '저장하지 못했습니다. 값을 다시 바꿔 보거나 앱을 다시 실행해 주세요.';
  }
}

function renderCharacters(selected) {
  const current = Object.hasOwn(window.CHARACTERS, selected) ? selected : window.DEFAULT_CHARACTER;
  $('characters').replaceChildren(
    ...Object.entries(window.CHARACTERS).map(([id, character]) => {
      const card = document.createElement('label');
      card.className = 'card';

      const preview = document.createElement('span');
      preview.className = 'preview';
      preview.innerHTML = character.svg;

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'character';
      radio.value = id;
      radio.checked = id === current;
      radio.addEventListener('change', () => save({ character: id }));

      const name = document.createElement('span');
      name.className = 'name';
      name.append(radio, character.name);

      card.append(preview, name);
      return card;
    }),
  );
}

const showScale = () => {
  $('scale-value').textContent = `${Math.round(scale.value * 100)}%`;
};

// 줄마다 하나의 문구. 규칙에 어긋나면 어느 문구가 왜 안 되는지 알려 주고 저장하지 않는다
function parseCheers() {
  const lines = cheers.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > limits.maxCheers) {
    return { error: `문구는 ${limits.maxCheers}줄까지 넣을 수 있습니다. 지금은 ${lines.length}줄입니다.` };
  }
  const long = lines.find((line) => line.length > limits.maxCheerLength);
  if (long) {
    return { error: `"${long}" 은 ${long.length}자입니다. ${limits.maxCheerLength}자 이하로 줄여 주세요.` };
  }
  return { lines };
}

function checkCheers() {
  const { error = '', lines } = parseCheers();
  setError(cheers, error);
  return lines;
}

function fill(settings) {
  limits = settings.limits;
  renderCharacters(settings.character);
  offTime.value = settings.offTime;
  startTime.value = settings.startTime;
  workHoursOnly.checked = settings.workHoursOnly;
  showStartTime();
  scale.min = limits.scaleMin;
  scale.max = limits.scaleMax;
  scale.value = settings.scale;
  showScale();
  cheers.value = settings.cheers.join('\n');
  cheers.placeholder = settings.defaultCheers.join('\n');
  $('cheers-hint').textContent =
    `캐릭터를 클릭하면 이 중 하나를 말합니다. 한 줄에 하나씩, 한 줄은 ${limits.maxCheerLength}자까지, ` +
    `최대 ${limits.maxCheers}줄입니다. 비워 두면 기본 문구를 씁니다.`;
  autoLaunch.checked = settings.autoLaunch.enabled;
  autoLaunch.disabled = !settings.autoLaunch.available;
  $('autoLaunch-hint').textContent = settings.autoLaunch.available
    ? ''
    : '설치한 앱에서만 켤 수 있습니다. 지금은 개발 모드로 실행 중입니다.';
}

async function load() {
  $('loading').hidden = false;
  $('load-error').hidden = true;
  form.hidden = true;
  try {
    fill(await window.mate.getSettings());
    form.hidden = false;
  } catch {
    $('load-error').hidden = false;
  } finally {
    $('loading').hidden = true;
  }
}

function bindTime(input, label) {
  input.addEventListener('change', () => {
    // 시각을 지우거나 일부만 채우면 값이 빈 문자열이 된다
    if (!input.value) {
      setError(input, `${label}을 시와 분까지 입력해 주세요.`);
      return;
    }
    setError(input, '');
    save({ [input.id]: input.value });
  });
}

bindTime(offTime, '퇴근 시각');
bindTime(startTime, '출근 시각');

// 출근 시각은 '업무 시간에만 보이기' 에만 쓰이므로, 그 옵션을 켰을 때만 입력란을 보여 준다
function showStartTime() {
  $('startTime-field').hidden = !workHoursOnly.checked;
}

workHoursOnly.addEventListener('change', () => {
  showStartTime();
  save({ workHoursOnly: workHoursOnly.checked });
});

scale.addEventListener('input', () => {
  showScale();
  save({ scale: Number(scale.value) });
});

cheers.addEventListener('change', () => {
  const lines = checkCheers();
  if (lines) save({ cheers: lines });
});

// 한 번 오류가 난 뒤에는 고치는 즉시 오류를 지운다
cheers.addEventListener('input', () => {
  if (cheers.hasAttribute('aria-invalid')) checkCheers();
});

autoLaunch.addEventListener('change', async () => {
  try {
    const state = await window.mate.setAutoLaunch(autoLaunch.checked);
    autoLaunch.checked = state.enabled;
    $('save-error').textContent = '';
    say(state.enabled ? '로그인할 때 자동으로 실행합니다.' : '자동 실행을 껐습니다.');
  } catch {
    autoLaunch.checked = !autoLaunch.checked;
    $('save-error').textContent = '자동 실행 설정을 바꾸지 못했습니다.';
  }
});

$('resetPosition').addEventListener('click', () => {
  window.mate.resetPosition();
  say('캐릭터를 기본 자리로 되돌렸습니다.');
});

$('retry').addEventListener('click', load);
form.addEventListener('submit', (event) => event.preventDefault());

load();
