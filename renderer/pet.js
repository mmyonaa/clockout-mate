const stage = document.getElementById('stage');
const bubble = document.getElementById('bubble');
const pet = document.getElementById('pet');

const CHEERS = ['조금만 더 힘내요!', '물 한 잔 어때요?', '스트레칭 타임!', '오늘도 잘하고 있어요', '어깨 펴고, 숨 한 번!'];
const CHEER_MS = 3000;
// 이 거리(px)보다 덜 움직인 누름은 드래그가 아니라 클릭으로 본다
const DRAG_THRESHOLD = 4;

let offTime = '18:00';
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
  if (cheer && now >= cheer.until) cheer = null;
  bubble.textContent = cheer ? cheer.text : text;
  if (text !== lastStatus) {
    lastStatus = text;
    window.mate.setStatus(text);
  }
}

function sayCheer() {
  cheer = { text: CHEERS[Math.floor(Math.random() * CHEERS.length)], until: Date.now() + CHEER_MS };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    pet.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-16px)' }, { transform: 'translateY(0)' }], {
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

window.mate.onConfig((config) => {
  offTime = config.offTime;
  render();
});

window.mate.getConfig().then((config) => {
  offTime = config.offTime;
  render();
  setInterval(render, 1000);
});
