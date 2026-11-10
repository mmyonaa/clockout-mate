// 설정의 한도와 검증 규칙. 메인 프로세스와 테스트가 함께 쓴다

// 한 번에 세울 수 있는 캐릭터 수
const MAX_CHARACTERS = 3;
const SCALE_MIN = 0.6;
const SCALE_MAX = 2;
const MAX_CHEERS = 20;
const MAX_CHEER_LENGTH = 14;
const DEFAULT_CHEERS = ['조금만 더 힘내요!', '물 한 잔 어때요?', '스트레칭 타임!', '오늘도 잘하고 있어요', '어깨 펴고, 숨 한 번!'];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// 설정 파일과 설정 창에서 들어오는 값을 같은 규칙으로 거른다. 규칙에 맞는 항목만 돌려주므로, 결과를 지금 설정에 덮어쓰면 된다.
// knownIds: 있는 캐릭터의 id 목록(renderer/characters.js 의 CHARACTERS 키)
function sanitize(raw, knownIds) {
  const out = {};
  for (const key of ['offTime', 'startTime']) {
    if (typeof raw?.[key] === 'string' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(raw[key])) out[key] = raw[key].padStart(5, '0');
  }
  if (typeof raw?.workHoursOnly === 'boolean') out.workHoursOnly = raw.workHoursOnly;
  if (Number.isFinite(raw?.xRatio)) out.xRatio = clamp(raw.xRatio, 0, 1);
  // 모르는 캐릭터는 빼고, 같은 캐릭터를 두 번 적으면 하나로 친다. 하나도 안 남으면 전 값을 그대로 둔다
  const isKnown = (value) => typeof value === 'string' && knownIds.includes(value);
  if (Array.isArray(raw?.characters)) {
    const ids = [...new Set(raw.characters.filter(isKnown))].slice(0, MAX_CHARACTERS);
    if (ids.length) out.characters = ids;
  } else if (isKnown(raw?.character)) {
    // 캐릭터를 하나만 고르던 때의 설정 파일
    out.characters = [raw.character];
  }
  if (Number.isFinite(raw?.scale)) out.scale = Math.round(clamp(raw.scale, SCALE_MIN, SCALE_MAX) * 10) / 10;
  if (Array.isArray(raw?.cheers)) {
    out.cheers = raw.cheers
      .filter((line) => typeof line === 'string')
      .map((line) => line.trim().slice(0, MAX_CHEER_LENGTH))
      .filter(Boolean)
      .slice(0, MAX_CHEERS);
  }
  return out;
}

const minutesOf = (time) => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

// 업무 시간 = 출근 시각부터 퇴근 시각 직전까지. 출근이 퇴근보다 늦거나 같으면 자정을 넘기는 근무로 본다
function inWorkHours(startTime, offTime, now = new Date()) {
  const current = now.getHours() * 60 + now.getMinutes();
  const [start, off] = [minutesOf(startTime), minutesOf(offTime)];
  return start < off ? current >= start && current < off : current >= start || current < off;
}

module.exports = {
  MAX_CHARACTERS,
  SCALE_MIN,
  SCALE_MAX,
  MAX_CHEERS,
  MAX_CHEER_LENGTH,
  DEFAULT_CHEERS,
  clamp,
  sanitize,
  inWorkHours,
};
