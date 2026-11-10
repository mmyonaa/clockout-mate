const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitize, inWorkHours, MAX_CHARACTERS, MAX_CHEERS, MAX_CHEER_LENGTH } = require('../lib/config');

const known = ['hachi', 'chii', 'usagi', 'kuri'];
const at = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2026, 0, 5, h, m);
};

test('시각은 HH:MM 만 받고 한 자리 시는 0 을 채운다', () => {
  assert.deepEqual(sanitize({ offTime: '9:05', startTime: '24:00' }, known), { offTime: '09:05' });
  assert.deepEqual(sanitize({ offTime: '18:60' }, known), {});
  assert.deepEqual(sanitize({ offTime: 1800 }, known), {});
});

test('모르는 캐릭터와 중복을 빼고, 최대 수까지만 남긴다', () => {
  assert.deepEqual(sanitize({ characters: ['chii', 'nobody', 'chii', 'hachi'] }, known), { characters: ['chii', 'hachi'] });
  assert.equal(sanitize({ characters: known }, known).characters.length, MAX_CHARACTERS);
});

test('남는 캐릭터가 없으면 characters 를 돌려주지 않아 전 값이 유지된다', () => {
  assert.deepEqual(sanitize({ characters: ['nobody'] }, known), {});
  assert.deepEqual(sanitize({ characters: [] }, known), {});
});

test('캐릭터를 하나만 고르던 때의 character 문자열도 읽는다', () => {
  assert.deepEqual(sanitize({ character: 'usagi' }, known), { characters: ['usagi'] });
  assert.deepEqual(sanitize({ character: 'nobody' }, known), {});
});

test('크기는 범위 안으로 자르고 0.1 단위로 맞춘다', () => {
  assert.equal(sanitize({ scale: 5 }, known).scale, 2);
  assert.equal(sanitize({ scale: 0.1 }, known).scale, 0.6);
  assert.equal(sanitize({ scale: 1.26 }, known).scale, 1.3);
  assert.deepEqual(sanitize({ scale: '1' }, known), {});
});

test('위치 비율은 0~1 로 자른다', () => {
  assert.equal(sanitize({ xRatio: -3 }, known).xRatio, 0);
  assert.equal(sanitize({ xRatio: 0.4 }, known).xRatio, 0.4);
});

test('응원 문구는 다듬고, 빈 줄을 빼고, 길이와 줄 수를 자른다', () => {
  const long = '가'.repeat(MAX_CHEER_LENGTH + 5);
  const out = sanitize({ cheers: ['  힘내요  ', '', 3, long] }, known).cheers;
  assert.deepEqual(out, ['힘내요', '가'.repeat(MAX_CHEER_LENGTH)]);
  const many = Array.from({ length: MAX_CHEERS + 5 }, (_, i) => `문구${i}`);
  assert.equal(sanitize({ cheers: many }, known).cheers.length, MAX_CHEERS);
});

test('깨진 입력은 빈 결과가 된다', () => {
  assert.deepEqual(sanitize(null, known), {});
  assert.deepEqual(sanitize('oops', known), {});
});

test('업무 시간은 출근 시각부터 퇴근 시각 직전까지다', () => {
  assert.equal(inWorkHours('09:00', '18:00', at('08:59')), false);
  assert.equal(inWorkHours('09:00', '18:00', at('09:00')), true);
  assert.equal(inWorkHours('09:00', '18:00', at('17:59')), true);
  assert.equal(inWorkHours('09:00', '18:00', at('18:00')), false);
});

test('출근이 퇴근보다 늦으면 자정을 넘기는 근무로 본다', () => {
  assert.equal(inWorkHours('22:00', '06:00', at('23:30')), true);
  assert.equal(inWorkHours('22:00', '06:00', at('03:00')), true);
  assert.equal(inWorkHours('22:00', '06:00', at('12:00')), false);
});
