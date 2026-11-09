const stage = document.getElementById('stage');
const bubble = document.getElementById('bubble');
const pet = document.getElementById('pet');

const CHEER_MS = 3000;
// 이 거리(px)보다 덜 움직인 누름은 드래그가 아니라 클릭으로 본다
const DRAG_THRESHOLD = 4;

let offTime = '18:00';
let cheers = [];
let character = null;
let cheer = null;
let lastStatus = '';
let drag = null;

const formatMinutes = (min) =>
  min < 60 ? `${min}분` : `${Math.floor(min / 60)}시간${min % 60 ? ` ${min % 60}분` : ''}`;

// 자정이 지나면 그날의 퇴근 시각을 기준으로 다시 센다
function status(now) {
  const [hour, minute] = offTime.split(':').map(Number);
  const off = new Date(now);
  off.setHours(hour, minute, 0, 0);
  const left = Math.ceil((off - now) / 60000);
  if (left > 0) return { state: left <= 10 ? 'soon' : 'idle', text: `퇴근 ${formatMinutes(left)} 전` };
  const over = -left;
  if (over < 10) return { state: 'done', text: '퇴근 시간이에요!' };
  return { state: 'overtime', text: `야근 ${formatMinutes(over)}째…` };
}

function render() {
  const now = Date.now();
  const { state, text } = status(now);
  stage.dataset.state = state;
  // 캐릭터마다 정해 둔 짓(웃기·팔짱 등)을 정해진 간격으로 잠깐 한다. 남은 시간(상태)과는 상관없고, 말풍선·몸 움직임은 그대로다
  const act = window.CHARACTERS[character]?.act;
  const acting = act && Math.floor(now / 1000) % act.every < act.for;
  if (acting) pet.dataset.act = act.name;
  else delete pet.dataset.act;
  if (cheer && now >= cheer.until) cheer = null;
  bubble.textContent = cheer ? cheer.text : text;
  if (text !== lastStatus) {
    lastStatus = text;
    window.mate.setStatus(text);
  }
}

function sayCheer() {
  cheer = { text: cheers[Math.floor(Math.random() * cheers.length)], until: Date.now() + CHEER_MS };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // 캐릭터만 뛰면 머리가 말풍선을 파고들므로 말풍선까지 한 덩어리로 뛴다
    stage.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-16px)' }, { transform: 'translateY(0)' }], {
      duration: 450,
      easing: 'ease-out',
    });
  }
  render();
}

// 창은 평소 클릭을 통과시키므로, 캐릭터 위에 있을 때만 입력을 받겠다고 알린다
pet.addEventListener('mouseenter', () => window.mate.setInteractive(true));
pet.addEventListener('mouseleave', () => {
  if (!drag) window.mate.setInteractive(false);
});

pet.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  drag = { startX: event.clientX, moved: false };
  pet.setPointerCapture(event.pointerId);
});

// 포인터가 캐릭터 밖으로 앞서 나가도 드래그가 끊기지 않도록 이동·놓기는 창 전체에서 받는다.
// 여기서는 드래그 시작만 알리고, 창을 옮기는 일은 메인 프로세스가 맡는다
window.addEventListener('pointermove', (event) => {
  if (!drag || drag.moved || Math.abs(event.clientX - drag.startX) < DRAG_THRESHOLD) return;
  drag.moved = true;
  pet.classList.add('dragging');
  window.mate.dragStart();
});

function endDrag() {
  if (!drag) return;
  if (drag.moved) window.mate.dragEnd();
  else sayCheer();
  drag = null;
  pet.classList.remove('dragging');
  if (!pet.matches(':hover')) window.mate.setInteractive(false);
}

window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);
pet.addEventListener('contextmenu', () => window.mate.showMenu());

// 설정이 바뀔 때마다 통째로 다시 받는다. 그림은 캐릭터가 바뀐 경우에만 갈아 끼운다
function applyConfig(config) {
  offTime = config.offTime;
  cheers = config.cheers;
  stage.style.zoom = config.scale;
  const id = Object.hasOwn(window.CHARACTERS, config.character) ? config.character : window.DEFAULT_CHARACTER;
  if (id !== character) {
    character = id;
    pet.innerHTML = window.CHARACTERS[id].svg;
  }
  render();
}

window.mate.onConfig(applyConfig);

window.mate.getConfig().then((config) => {
  applyConfig(config);
  setInterval(render, 1000);
});
