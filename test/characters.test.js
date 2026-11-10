const test = require('node:test');
const assert = require('node:assert/strict');
const { CHARACTERS, DEFAULT_CHARACTER } = require('../renderer/characters');

test('기본 캐릭터가 목록에 있다', () => {
  assert.ok(Object.hasOwn(CHARACTERS, DEFAULT_CHARACTER));
});

for (const [id, character] of Object.entries(CHARACTERS)) {
  test(`${id}: 이름·그림·짓 정의가 규칙에 맞는다`, () => {
    // CSS 클래스 .char-<id> 와 설정 파일에 그대로 쓰이므로 소문자만
    assert.match(id, /^[a-z]+$/);
    assert.equal(typeof character.name, 'string');
    assert.match(character.svg, new RegExp(`^<svg class="char char-${id}"`));
    for (const act of character.acts ?? []) {
      assert.equal(typeof act.name, 'string');
      assert.ok(act.for > 0 && act.for <= act.every, `${act.name}: for 는 0 보다 크고 every 이하`);
      if (act.slot !== undefined) assert.ok(act.slot > 0, `${act.name}: slot 은 양수`);
    }
  });
}
