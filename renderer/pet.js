const stage = document.getElementById('stage');
const bubbleSlot = document.getElementById('bubble-slot');
const bubble = document.getElementById('bubble');
const row = document.getElementById('row');

const CHEER_MS = 3000;
// 이 거리(px)보다 덜 움직인 누름은 드래그가 아니라 클릭으로 본다
const DRAG_THRESHOLD = 4;
// 여럿이 서 있을 때 같은 짓을 한꺼번에 하지 않도록 자리마다 짓의 시계를 이만큼(초) 어긋나게 한다
const ACT_STAGGER = 3;
// 평소 자리 폭(styles.css 의 --slot). 짓을 하느라 자리가 이보다 넓어진 만큼 창을 넓혀 달라고 메인 프로세스에 알린다
const SLOT_W = parseFloat(getComputedStyle(stage).getPropertyValue('--slot'));
// 자리가 줄어드는 전환(styles.css 의 .pet transition)이 끝난 뒤에 창을 줄여야 줄어드는 동안 잘리지 않는다
const SHRINK_DELAY_MS = 300;

let offTime = '18:00';
let cheers = [];
// 왼쪽부터 서 있는 캐릭터의 id 와 그 요소
let characters = [];
let pets = [];
let cheer = null;
let lastStatus = '';
let drag = null;
let extraWidth = 0;
let shrinkTimer = null;

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

// 짓들은 각자 every 초짜리 구간을 차례로 차지하며 돌고, 구간의 앞쪽 for 초 동안만 한다. 지금 할 짓의 이름을, 쉬는 중이면 null 을 돌려준다
function currentAct(acts, seconds) {
  let t = seconds % acts.reduce((sum, act) => sum + act.every, 0);
  for (const act of acts) {
    if (t < act.every) return t < act.for ? act.name : null;
    t -= act.every;
  }
  return null;
}

// 자리가 넓어진 만큼 창을 넓힌다. 넓힐 때는 바로, 줄일 때는 전환이 끝난 뒤에 알린다
function setExtraWidth(extra) {
  if (extra === extraWidth) return;
  extraWidth = extra;
  clearTimeout(shrinkTimer);
  if (extra > 0) window.mate.setExtraWidth(extra);
  else shrinkTimer = setTimeout(() => window.mate.setExtraWidth(extra), SHRINK_DELAY_MS);
}

function render() {
  const now = Date.now();
  const { state, text } = status(now);
  stage.dataset.state = state;
  // 캐릭터마다 정해 둔 짓(웃기·팔짱 등)을 정해진 간격으로 잠깐 한다. 남은 시간(상태)과는 상관없고, 말풍선·몸 움직임은 그대로다.
  // 자리를 넓혀야 하는 짓(풍뎅이 왕)이면 그 자리를 넓혀 옆 캐릭터를 밀어낸다
  let extra = 0;
  pets.forEach((pet, i) => {
    const acts = window.CHARACTERS[characters[i]].acts ?? [];
    const name = currentAct(acts, Math.floor(now / 1000) + i * ACT_STAGGER);
    const act = acts.find((candidate) => candidate.name === name);
    if (act) pet.dataset.act = act.name;
    else delete pet.dataset.act;
    pet.style.width = act?.slot > SLOT_W ? `${act.slot}px` : '';
    extra += Math.max(0, (act?.slot ?? 0) - SLOT_W);
  });
  setExtraWidth(extra);
  if (cheer && now >= cheer.until) cheer = null;
  bubble.textContent = cheer ? cheer.text : text;
  if (text !== lastStatus) {
    lastStatus = text;
    window.mate.setStatus(text);
  }
}

// 클릭한 캐릭터가 뛰며 응원 한마디를 한다. 말풍선은 하나뿐이라 누가 말하든 맨 왼쪽 자리 위에 뜬다
function sayCheer(pet) {
  cheer = { text: cheers[Math.floor(Math.random() * cheers.length)], until: Date.now() + CHEER_MS };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // 캐릭터만 뛰면 머리가 말풍선을 파고들므로 말풍선도 같이 뛴다. 맨 왼쪽 캐릭터는 말풍선을 안에 품고 있어 한 번에 뛴다
    for (const el of pet.contains(bubbleSlot) ? [pet] : [bubbleSlot, pet]) {
      el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-16px)' }, { transform: 'translateY(0)' }], {
        duration: 450,
        easing: 'ease-out',
      });
    }
  }
  render();
}

// 창은 평소 클릭을 통과시키므로, 캐릭터 위에 있을 때만 입력을 받겠다고 알린다
function makePet(id, nth) {
  const pet = document.createElement('div');
  pet.className = 'pet';
  pet.style.setProperty('--nth', nth);
  pet.innerHTML = window.CHARACTERS[id].svg;
  pet.addEventListener('mouseenter', () => window.mate.setInteractive(true));
  pet.addEventListener('mouseleave', () => {
    if (!drag) window.mate.setInteractive(false);
  });
  pet.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    drag = { pet, startX: event.clientX, moved: false };
    pet.setPointerCapture(event.pointerId);
  });
  pet.addEventListener('contextmenu', () => window.mate.showMenu());
  return pet;
}

// 포인터가 캐릭터 밖으로 앞서 나가도 드래그가 끊기지 않도록 이동·놓기는 창 전체에서 받는다.
// 여기서는 드래그 시작만 알리고, 창을 옮기는 일은 메인 프로세스가 맡는다. 누구를 잡고 끌든 모두 한 덩어리로 움직인다
window.addEventListener('pointermove', (event) => {
  if (!drag || drag.moved || Math.abs(event.clientX - drag.startX) < DRAG_THRESHOLD) return;
  drag.moved = true;
  drag.pet.classList.add('dragging');
  window.mate.dragStart();
});

function endDrag() {
  if (!drag) return;
  const { pet, moved } = drag;
  drag = null;
  if (moved) window.mate.dragEnd();
  else sayCheer(pet);
  pet.classList.remove('dragging');
  if (!pet.matches(':hover')) window.mate.setInteractive(false);
}

window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

// 설정이 바뀔 때마다 통째로 다시 받는다. 그림은 캐릭터 목록이 바뀐 경우에만 갈아 끼운다
function applyConfig(config) {
  offTime = config.offTime;
  cheers = config.cheers;
  stage.style.zoom = config.scale;
  const ids = config.characters.filter((id) => Object.hasOwn(window.CHARACTERS, id));
  if (!ids.length) ids.push(window.DEFAULT_CHARACTER);
  if (ids.join() !== characters.join()) {
    characters = ids;
    pets = ids.map(makePet);
    row.replaceChildren(...pets);
    // 말풍선은 맨 왼쪽 캐릭터의 그림 위에 둔다
    pets[0].prepend(bubbleSlot);
  }
  render();
}

window.mate.onConfig(applyConfig);

window.mate.getConfig().then((config) => {
  applyConfig(config);
  setInterval(render, 1000);
});
