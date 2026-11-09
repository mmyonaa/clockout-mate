// 캐릭터 정의. 펫 창과 설정 창이 함께 쓴다.
// 좌표계: 가로 120, 몸 가운데 x=60. 세로는 캐릭터마다 발끝에서 끝나도록 viewBox 높이를 따로 둔다.
(() => {
  const n = (value) => +value.toFixed(2);

  // 눈의 흰 반짝임은 위쪽 타원 하나와 아래쪽 하나. 아래쪽은 캐릭터에 따라 초승달 선(crescent)이거나 작은 타원(double)이다
  const eye = (cx, cy, r, style) => {
    const k = r / 5.3;
    if (style === 'double') {
      return `<g class="eye">
      <circle cx="${cx}" cy="${cy}" r="${r}" />
      <ellipse class="shine" cx="${cx}" cy="${n(cy - 1.6 * k)}" rx="${n(2.9 * k)}" ry="${n(2 * k)}" />
      <ellipse class="shine" cx="${cx}" cy="${n(cy + 2.6 * k)}" rx="${n(2.4 * k)}" ry="${n(1.1 * k)}" />
    </g>`;
    }
    const sx = n(cx - 0.3 * k);
    const sy = n(cy - 1.7 * k);
    return `<g class="eye">
      <circle cx="${cx}" cy="${cy}" r="${r}" />
      <ellipse class="shine" cx="${sx}" cy="${sy}" rx="${n(2.4 * k)}" ry="${n(1.7 * k)}" transform="rotate(-10 ${sx} ${sy})" />
      <path class="glint" d="M${n(cx - 2.3 * k)} ${n(cy + 2.3 * k)} q${n(2.3 * k)} ${n(1.7 * k)} ${n(4.6 * k)} 0" />
    </g>`;
  };

  const hatch = (cx, cy) =>
    `M${n(cx - 4.2)} ${n(cy - 2)} l-1.2 4 M${n(cx - 0.8)} ${n(cy - 2.6)} l-1.4 5.2 ` +
    `M${n(cx + 2.6)} ${n(cy - 2.6)} l-1.4 5.2 M${n(cx + 5.8)} ${n(cy - 2)} l-1.2 4`;

  // 얼굴은 두 캐릭터가 같은 문법을 쓴다: 눈 세 벌(뜬 눈·눈웃음·감은 눈)과 입 두 벌(다문 입·벌린 입)을
  // 모두 그려 두고, 상태에 따라 CSS 가 하나씩만 보여 준다.
  //   eye: 눈 중심 { dx: 가운데에서의 거리, y, r }
  //   blush: 볼터치 { dx, y, rx, ry }
  //   eye.style: 눈 반짝임 모양 ('double' 이면 타원 둘)
  //   closed / open: 다문 입과 벌린 입의 SVG 조각. 입 모양은 캐릭터마다 달라서 각자 넘긴다
  const face = ({ brows, eye: e, blush: b, closed, open }) => {
    const [lx, rx] = [n(60 - e.dx), n(60 + e.dx)];
    return `
    <ellipse class="pink" cx="${n(60 - b.dx)}" cy="${b.y}" rx="${b.rx}" ry="${b.ry}" />
    <ellipse class="pink" cx="${n(60 + b.dx)}" cy="${b.y}" rx="${b.rx}" ry="${b.ry}" />
    <path class="hatch" d="${hatch(60 - b.dx, b.y)} ${hatch(60 + b.dx, b.y)}" />
    <path class="line brows" d="${brows}" />
    <g class="eyes-open">${eye(lx, e.y, e.r, e.style)}${eye(rx, e.y, e.r, e.style)}</g>
    <path class="line eyes-happy" d="M${n(lx - 5)} ${n(e.y + 1)} Q${lx} ${n(e.y - 5)} ${n(lx + 5)} ${n(e.y + 1)} M${n(rx - 5)} ${n(e.y + 1)} Q${rx} ${n(e.y - 5)} ${n(rx + 5)} ${n(e.y + 1)}" />
    <path class="line eyes-sad" d="M${n(lx - 5)} ${n(e.y - 0.8)} Q${lx} ${n(e.y + 3.8)} ${n(lx + 5)} ${n(e.y - 0.8)} M${n(rx - 5)} ${n(e.y - 0.8)} Q${rx} ${n(e.y + 3.8)} ${n(rx + 5)} ${n(e.y - 0.8)}" />
    <path class="tear" d="M${n(rx + 4)} ${n(e.y + 3.4)} q-3 5 0 6.6 q3 -1.6 0 -6.6 Z" />
    <g class="mouth-closed">${closed}</g>
    <g class="mouth-open">${open}</g>`;
  };

  const svg = (id, height, body) =>
    `<svg class="char char-${id}" viewBox="0 0 120 ${height}" aria-hidden="true">${body}</svg>`;

  // 두 캐릭터는 몸이 같고 귀만 다르다. 윤곽은 왼쪽 귀 바깥 밑동 (30,23) 에서 시작해 귀 선 → BODY 순으로 한 바퀴 돈다.
  // BODY: 오른쪽 귀 바깥 밑동 (90,23) 에서 머리 옆 → 팔 → 몸 아래 → 반대편 팔 → 머리 옆을 거쳐 시작점으로
  const BODY =
    'C98 28 104.4 38 104.4 50.8 C104.4 57.8 101.48 64.17 98.23 70.5 C101.5 71.5 104 76 103 79.5 C102 83 96.5 84.8 91.6 84.3 Q90.9 86 90.6 87.6 C87 96 75 103 60 103 C45 103 33 96 29.4 87.6 Q29.1 86 28.4 84.3 C23.5 84.8 18 83 17 79.5 C16 76 18.5 71.5 21.77 70.5 C18.52 64.17 15.6 57.8 15.6 50.8 C15.6 38 22 28 30 23 Z';
  // 발은 몸 위에 그려 몸 아랫선을 덮는다. 그래야 몸에서 그대로 이어져 내려온 것처럼 보인다
  const FEET = `<path class="fur" d="M51.6 100.5 V104.4 Q51.6 107.6 55.6 107.6 Q59.6 107.6 59.6 104.4 V100.5" />
    <path class="fur" d="M60.4 100.5 V104.4 Q60.4 107.6 64.4 107.6 Q68.4 107.6 68.4 104.4 V100.5" />`;

  // 하치와레: 귀 선을 몸 윤곽과 파란 무늬가 함께 쓴다
  const HACHI_EARS =
    'Q29.5 13 32 8.5 Q33.8 5.8 36.5 7.6 Q43 12 47 15.6 Q60 17.8 73 15.6 Q77 12 83.5 7.6 Q86.2 5.8 88 8.5 Q90.5 13 90 23';

  const hachi = svg(
    'hachi',
    110,
    `<path class="blue tail" d="M82 98 C87 92 93 88 99 88.5 C105 89 106.5 95.5 102 99.5 C97.5 103 88 102 82 98 Z" />
    <path class="fur" d="M30 23 ${HACHI_EARS} ${BODY}" />
    <path class="blue" d="M23.36 28.79 C25.34 26.45 27.6 24.5 30 23 ${HACHI_EARS} C92.4 24.5 94.66 26.45 96.64 28.79 C91 32 84 33 78 31.8 C72 30.5 66 27.5 60 24.9 C54 27.5 48 30.5 42 31.8 C36 33 29 32 23.36 28.79 Z" />
    ${FEET}` +
      face({
        brows: 'M48.6 36.4 l0.9 -0.3 M71.4 36.4 l-0.9 -0.3',
        eye: { dx: 13.8, y: 44.4, r: 5.3 },
        blush: { dx: 24.7, y: 52, rx: 7.8, ry: 5.5 },
        closed: `<path class="line" d="M54.8 53.2 C55 56.8 58.4 57.6 59.2 55 L60 52.6 L60.8 55 C61.6 57.6 65 56.8 65.2 53.2" />
          <path class="line" d="M58.4 60.4 h3.2" />`,
        // 혀가 보이는 벌린 입
        open: `<path class="tongue" d="M56.6 52.6 C56 58 57.5 61.5 60 61.5 C62.5 61.5 64 58 63.4 52.6 Z" />
          <path class="line" d="M52.5 49.5 Q54.5 53.5 57 52.5 L60 49 L63 52.5 Q65.5 53.5 67.5 49.5" />
          <path class="line" d="M57.6 65 q2.4 1.2 4.8 0" />`,
      }),
  );

  // 치이카와: 작고 둥근 귀. 몸은 하치와레와 같고 꼬리는 없다
  const CHII_EARS =
    'Q31.6 21.7 33.5 20.6 C32 14.5 33.8 9.2 37.6 9.2 C41.2 9.2 43 13 42.2 17.6 Q60 14.4 77.8 17.6 C77 13 78.8 9.2 82.4 9.2 C86.2 9.2 88 14.5 86.5 20.6 Q88.4 21.7 90 23';

  const chii = svg(
    'chii',
    110,
    `<path class="fur" d="M30 23 ${CHII_EARS} ${BODY}" />
    ${FEET}` +
      face({
        brows: 'M44.8 33.4 l5.2 -0.4 M75.2 33.4 l-5.2 -0.4',
        eye: { dx: 13.6, y: 42.5, r: 5.6, style: 'double' },
        blush: { dx: 23.7, y: 51.4, rx: 7.6, ry: 5.3 },
        // 양 끝이 말려 올라가고 가운데가 뾰족한 ω
        closed: `<path class="line" d="M53.1 51.8 C53.6 54.4 55.4 55.4 57.2 55 C59 54.6 59.6 53 60 50.6 C60.4 53 61 54.6 62.8 55 C64.6 55.4 66.4 54.4 66.9 51.8" />
          <path class="line" d="M58.2 59.8 h3.6" />`,
        // ω 아래로 둥근 입이 벌어진다. 안쪽은 흰색
        open: `<path class="mouth-hole" d="M56.5 53.4 C56 57.4 57.6 60.2 60 60.2 C62.4 60.2 64 57.4 63.5 53.4 Z" />
          <path class="line" d="M53.7 50.6 C54 53.2 55.6 54.4 57.2 53.8 C58.8 53.2 59.6 51.6 60 49 C60.4 51.6 61.2 53.2 62.8 53.8 C64.4 54.4 66 53.2 66.3 50.6" />
          <path class="line" d="M58.2 63.6 h3.6" />`,
      }),
  );

  window.CHARACTERS = {
    hachi: { name: '하치와레', svg: hachi },
    chii: { name: '치이카와', svg: chii },
  };
  window.DEFAULT_CHARACTER = 'hachi';
})();
