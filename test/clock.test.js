const test = require('node:test');
const assert = require('node:assert/strict');
const { status, currentAct, formatMinutes, SOON_MINUTES, DONE_MINUTES } = require('../renderer/clock');

const at = (hhmm, sec = 0) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2026, 0, 5, h, m, sec).getTime();
};

test('남은 시간을 분·시간으로 적는다', () => {
  assert.equal(formatMinutes(42), '42분');
  assert.equal(formatMinutes(60), '1시간');
  assert.equal(formatMinutes(75), '1시간 15분');
});

test('퇴근 전에는 남은 분을 올림해서 센다', () => {
  assert.deepEqual(status(at('17:18', 30), '18:00'), { state: 'idle', text: '퇴근 42분 전' });
});

test('임박은 퇴근 SOON_MINUTES 분 전부터다', () => {
  assert.equal(status(at('18:00') - (SOON_MINUTES + 1) * 60000, '18:00').state, 'idle');
  assert.equal(status(at('18:00') - SOON_MINUTES * 60000, '18:00').state, 'soon');
});

test('퇴근 시각부터 DONE_MINUTES 분 동안은 퇴근, 그 뒤로는 야근이다', () => {
  assert.deepEqual(status(at('18:00'), '18:00'), { state: 'done', text: '퇴근 시간이에요!' });
  assert.equal(status(at('18:00') + (DONE_MINUTES - 1) * 60000, '18:00').state, 'done');
  assert.equal(status(at('18:00') + DONE_MINUTES * 60000, '18:00').state, 'overtime');
  assert.deepEqual(status(at('19:15'), '18:00'), { state: 'overtime', text: '야근 1시간 15분째…' });
});

test('자정이 지나면 그날의 퇴근 시각을 기준으로 다시 센다', () => {
  assert.equal(status(at('00:30'), '18:00').state, 'idle');
});

test('짓이 하나면 every 초마다 for 초씩 한다', () => {
  const acts = [{ name: 'smile', every: 6, for: 2 }];
  assert.deepEqual([0, 1, 2, 5, 6].map((s) => currentAct(acts, s)), ['smile', 'smile', null, null, 'smile']);
});

test('짓이 여럿이면 각자 every 초 구간을 차례로 차지하며 번갈아 한다', () => {
  const acts = [
    { name: 'smile', every: 6, for: 2 },
    { name: 'teary', every: 7, for: 3 },
  ];
  assert.equal(currentAct(acts, 0), 'smile');
  assert.equal(currentAct(acts, 3), null);
  assert.equal(currentAct(acts, 6), 'teary');
  assert.equal(currentAct(acts, 8), 'teary');
  assert.equal(currentAct(acts, 9), null);
  assert.equal(currentAct(acts, 13), 'smile');
});

test('짓이 없는 캐릭터는 늘 쉰다', () => {
  assert.equal(currentAct([], 5), null);
});
