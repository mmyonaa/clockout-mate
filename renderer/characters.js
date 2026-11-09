// 캐릭터 정의. 펫 창과 설정 창이 함께 쓴다.
// 좌표계: 가로 120, 몸 가운데 x=60, 발끝이 y=110. 귀나 뿔이 머리 위로 솟는 캐릭터는 viewBox 위쪽을 음수로 넓힌다.
(() => {
  const n = (value) => +value.toFixed(2);

  // 눈 모양은 캐릭터마다 셋 중 하나다.
  //   기본: 위쪽 흰 타원 + 아래쪽 초승달 선 / 'double': 흰 타원 둘 / 'dot': 작은 눈에 흰 점 하나
  const eye = (cx, cy, r, style) => {
    const k = r / 5.3;
    if (style === 'dot') {
      return `<g class="eye">
      <circle cx="${cx}" cy="${cy}" r="${r}" />
      <circle class="shine" cx="${n(cx - r * 0.2)}" cy="${n(cy - r * 0.25)}" r="${n(r * 0.42)}" />
    </g>`;
    }
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

  // 얼굴은 모든 캐릭터가 같은 문법을 쓴다: 눈(뜬 눈, 웃는 캐릭터는 눈웃음까지)과 입 두 벌(다문 입·벌린 입)을
  // 모두 그려 두고, 조건에 따라 CSS 가 하나씩만 보여 준다.
  //   eye: 눈 중심 { dx: 가운데에서의 거리, y, r }
  //   blush: 볼터치 { dx, y, rx, ry }
  //   eye.style: 눈 모양 (위 eye 함수 참고)
  //   brows: 눈썹 선. 없는 캐릭터는 빈 문자열
  //   happyEyes / happyBrows: 웃는 얼굴의 눈·눈썹 선. 주기적으로 웃는 캐릭터만 준다
  //   extra: 그 캐릭터만 가진 입 모양 등 덧붙일 조각. 언제 보일지는 character.css 가 정한다
  //   closed / open: 다문 입과 벌린 입의 SVG 조각. 입 모양은 캐릭터마다 달라서 각자 넘긴다
  const face = ({ brows, eye: e, blush: b, closed, open, happyEyes, happyBrows, extra = '' }) => {
    const [lx, rx] = [n(60 - e.dx), n(60 + e.dx)];
    return `
    <g class="blush">
      <ellipse class="pink" cx="${n(60 - b.dx)}" cy="${b.y}" rx="${b.rx}" ry="${b.ry}" />
      <ellipse class="pink" cx="${n(60 + b.dx)}" cy="${b.y}" rx="${b.rx}" ry="${b.ry}" />
      <path class="hatch" d="${hatch(60 - b.dx, b.y)} ${hatch(60 + b.dx, b.y)}" />
    </g>
    <path class="line brows brows-plain" d="${brows}" />
    ${happyBrows ? `<path class="line brows brows-happy" d="${happyBrows}" />` : ''}
    <g class="eyes-open">${eye(lx, e.y, e.r, e.style)}${eye(rx, e.y, e.r, e.style)}</g>
    ${happyEyes ? `<path class="line eyes-happy" d="${happyEyes}" />` : ''}
    <g class="mouth-closed">${closed}</g>
    <g class="mouth-open">${open}</g>
    ${extra}`;
  };

  // top: viewBox 의 위쪽 끝. 귀·뿔이 0 위로 올라가는 만큼 음수로 준다
  // side: 팔을 옆으로 뻗는 자세처럼 몸보다 넓게 그려야 할 때 좌우로 넓히는 폭. 넓힌 만큼 character.css 의 --wide 로 표시 폭도 키워야 몸 크기가 그대로다
  const svg = (id, top, body, side = 0) =>
    `<svg class="char char-${id}" viewBox="${-side} ${top} ${120 + 2 * side} ${110 - top}" aria-hidden="true">${body}</svg>`;

  // 모든 캐릭터는 몸이 같고 머리 윗선(귀·뿔)만 다르다. 윤곽은 왼쪽 귀 바깥 밑동 (30,23) 에서 시작해 윗선 → BODY 순으로 한 바퀴 돈다.
  // BODY: 오른쪽 귀 바깥 밑동 (90,23) 에서 머리 옆 → 팔 → 몸 아래 → 반대편 팔 → 머리 옆을 거쳐 시작점으로
  // BODY_LOWER: 머리가 가장 넓은 오른쪽 점 (104.4,50.8) 에서 팔·몸 아래를 돌아 왼쪽의 같은 높이 (15.6,50.8) 까지.
  // 머리 윗부분 윤곽을 통째로 따로 그리는 캐릭터는 이것만 가져다 쓴다
  const BODY_LOWER =
    'C104.4 57.8 101.48 64.17 98.23 70.5 C101.5 71.5 104 76 103 79.5 C102 83 96.5 84.8 91.6 84.3 Q90.9 86 90.6 87.6 C87 96 75 103 60 103 C45 103 33 96 29.4 87.6 Q29.1 86 28.4 84.3 C23.5 84.8 18 83 17 79.5 C16 76 18.5 71.5 21.77 70.5 C18.52 64.17 15.6 57.8 15.6 50.8';
  const BODY = `C98 28 104.4 38 104.4 50.8 ${BODY_LOWER} C15.6 38 22 28 30 23 Z`;
  // 왼쪽(보는 쪽 기준) 팔만 없는 몸. 그 팔을 들어 올려 몸 앞에서 무언가를 쥔 자세에 쓴다
  const BODY_LEFT_ARM_UP =
    'C98 28 104.4 38 104.4 50.8 C104.4 57.8 101.48 64.17 98.23 70.5 C101.5 71.5 104 76 103 79.5 C102 83 96.5 84.8 91.6 84.3 Q90.9 86 90.6 87.6 C87 96 75 103 60 103 C45 103 33 96 29.4 87.6 C26 75 15.6 64 15.6 50.8 C15.6 38 22 28 30 23 Z';
  // 발은 몸 위에 그려 몸 아랫선을 덮는다. 그래야 몸에서 그대로 이어져 내려온 것처럼 보인다
  // 팔이 없는 몸 윤곽. 팔을 몸 앞으로 모은 자세(팔짱)에 쓴다. 시작·끝점은 BODY 와 같다.
  // 팔이 가려 주지 않으므로 머리와 몸의 경계가 드러난다: 볼이 아래로 둥글게 말려 들어간 뒤 (93.5,71.5) 에서 꺾여 몸이 내려간다
  const BODY_NO_ARMS =
    'C98 28 104.4 38 104.4 50.8 C104.4 60 100 67.5 93.5 71.5 C94.5 77 93 83 90.6 87.6 C87 96 75 103 60 103 C45 103 33 96 29.4 87.6 C27 83 25.5 77 26.5 71.5 C20 67.5 15.6 60 15.6 50.8 C15.6 38 22 28 30 23 Z';
  const feet = (cls) => `<path class="${cls}" d="M51.6 100.5 V104.4 Q51.6 107.6 55.6 107.6 Q59.6 107.6 59.6 104.4 V100.5" />
    <path class="${cls}" d="M60.4 100.5 V104.4 Q60.4 107.6 64.4 107.6 Q68.4 107.6 68.4 104.4 V100.5" />`;
  const FEET = feet('fur');
  // 귀가 머리 위에 없는 캐릭터의 매끈한 머리 윗선
  const PLAIN_TOP = 'C40 17 50 15.6 60 15.6 C70 15.6 80 17 90 23';
  // 머리 옆 윤곽 위의 점 (21.48,31.26) 과 귀 밑동 사이 구간. 머리 위를 덮는 무늬가 윤곽을 그대로 따라가게 할 때 쓴다
  const SIDE_UP = 'M21.48 31.26 C23.86 27.8 26.8 25 30 23';
  const SIDE_DOWN = 'C93.2 25 96.14 27.8 98.52 31.26';

  // 다문 입(ω)과 턱 선. y: 양 끝 높이
  const omega = (y) => `<path class="line" d="M53.6 ${y} C54.1 ${n(y + 2.6)} 55.7 ${n(y + 3.6)} 57.4 ${n(y + 3.2)} C59 ${n(y + 2.8)} 59.6 ${n(y + 1.2)} 60 ${n(y - 1.2)} C60.4 ${n(y + 1.2)} 61 ${n(y + 2.8)} 62.6 ${n(y + 3.2)} C64.3 ${n(y + 3.6)} 65.9 ${n(y + 2.6)} 66.4 ${y}" />
    <path class="line" d="M58.4 ${n(y + 7.6)} h3.2" />`;
  // 혀가 보이는 벌린 입. y: 윗선 양 끝 높이
  const tongueMouth = (y) => `<path class="tongue" d="M56.6 ${n(y + 3.1)} C56 ${n(y + 8.5)} 57.5 ${n(y + 12)} 60 ${n(y + 12)} C62.5 ${n(y + 12)} 64 ${n(y + 8.5)} 63.4 ${n(y + 3.1)} Z" />
    <path class="line" d="M52.5 ${y} Q54.5 ${n(y + 4)} 57 ${n(y + 3)} L60 ${n(y - 0.5)} L63 ${n(y + 3)} Q65.5 ${n(y + 4)} 67.5 ${y}" />
    <path class="line" d="M57.6 ${n(y + 15.5)} q2.4 1.2 4.8 0" />`;

  // 하치와레: 귀 선을 몸 윤곽과 파란 무늬가 함께 쓴다
  const HACHI_EARS =
    'Q29.5 13 32 8.5 Q33.8 5.8 36.5 7.6 Q43 12 47 15.6 Q60 17.8 73 15.6 Q77 12 83.5 7.6 Q86.2 5.8 88 8.5 Q90.5 13 90 23';

  const hachi = svg(
    'hachi',
    0,
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
        // 벌린 입과 웃는 눈은 character/하치/하치_5.webp 를 따랐다.
        // 입: 양 끝이 들린 얕은 윗입술 가운데에 세로 선이 서고, 그 아래로 벌어진 입 안에 혀가 차 있다. 혀 가운데에는 세로로 긴 주름이 있다
        // 눈: 바깥 끝이 처지고 안쪽은 평평한 납작한 선(둥근 호가 아니다). 눈썹은 평소 그대로 남는다
        open: `<path class="tongue" d="M56.4 55.2 C56 59.6 57.6 61.8 60 61.8 C62.4 61.8 64 59.6 63.6 55.2 Z" />
          <ellipse class="tongue-crease" cx="60" cy="58.2" rx="1.2" ry="1.9" />
          <path class="line" d="M53.3 52 C54.4 55 57.4 55.8 60 54.4 C62.6 55.8 65.6 55 66.7 52 M60 51 V54.6" />
          <path class="line" d="M58.1 66 q1.9 1 3.8 0" />`,
        happyEyes: 'M42.1 45.5 C43.9 43.9 46.5 43.5 50.3 44.5 M77.9 45.5 C76.1 43.9 73.5 43.5 69.7 44.5',
      }),
  );

  // 치이카와: 작고 둥근 귀. 몸은 하치와레와 같고 꼬리는 없다
  const CHII_EARS =
    'Q31.6 21.7 33.5 20.6 C32 14.5 33.8 9.2 37.6 9.2 C41.2 9.2 43 13 42.2 17.6 Q60 14.4 77.8 17.6 C77 13 78.8 9.2 82.4 9.2 C86.2 9.2 88 14.5 86.5 20.6 Q88.4 21.7 90 23';

  const chii = svg(
    'chii',
    0,
    `<path class="fur" d="M30 23 ${CHII_EARS} ${BODY}" />
    ${FEET}` +
      face({
        brows: 'M44.8 33.4 l5.2 -0.4 M75.2 33.4 l-5.2 -0.4',
        eye: { dx: 13.6, y: 42.5, r: 5.6, style: 'double' },
        blush: { dx: 23.7, y: 51.4, rx: 7.6, ry: 5.3 },
        // 양 끝이 말려 올라가고 가운데가 뾰족한 ω
        closed: `<path class="line" d="M53.1 51.8 C53.6 54.4 55.4 55.4 57.2 55 C59 54.6 59.6 53 60 50.6 C60.4 53 61 54.6 62.8 55 C64.6 55.4 66.4 54.4 66.9 51.8" />
          <path class="line" d="M58.2 59.8 h3.6" />`,
        // 웃는 얼굴은 character/치이/치이_3.jpeg 를 잰 값이다: 눈은 평소보다 낮은 자리의 짧고 거의 곧은 선(바깥 끝이 조금 처짐),
        // 눈썹은 더 짧은 선, 입은 작은 ω 아래로 좁고 깊게 벌어지고 안쪽은 흰색
        happyEyes: 'M43 46.9 Q46.2 44.6 50 45.8 M77 46.9 Q73.8 44.6 70 45.8',
        happyBrows: 'M45.4 34 Q47.2 32.7 49 33.3 M74.6 34 Q72.8 32.7 71 33.3',
        open: `<path class="mouth-hole" d="M57.6 56 C57.2 59.4 58.4 62 60 62 C61.6 62 62.8 59.4 62.4 56" />
          <path class="line" d="M55.1 53 C55.3 55.2 56.6 56.6 58 56.2 C59.2 55.8 59.5 54.2 60 52.6 C60.5 54.2 60.8 55.8 62 56.2 C63.4 56.6 64.7 55.2 64.9 53" />
          <path class="line" d="M58.9 66 h2.2" />`,
      }),
  );

  // 우사기: 머리 위 가운데에 길게 선 두 귀(안쪽은 분홍), 눈 위로 크게 휜 눈썹 선.
  // 몸을 두 벌 그려 둔다: 평소 몸과, 팔을 가슴 앞에서 엇갈린 팔짱 낀 몸(character/우사기/우사기_3.jpeg). CSS 가 하나만 보여 준다
  const USAGI_EARS =
    'C36 19 42 17 47 16.2 C45.5 4 44 -10 46 -17 C47.2 -22 52.8 -22 54 -17 C55.5 -9 57 4 58.3 15.4 Q60 16.6 61.7 15.4 C63 4 64.5 -9 66 -17 C67.2 -22 72.8 -22 74 -17 C76 -10 74.5 4 73 16.2 C78 17 84 19 90 23';

  const usagi = svg(
    'usagi',
    -25,
    `<path class="fur pose-plain" d="M30 23 ${USAGI_EARS} ${BODY}" />
    <g class="pose-crossed">
      <path class="fur" d="M30 23 ${USAGI_EARS} ${BODY_NO_ARMS}" />
      <path class="line" d="M48.5 76 C52 71.5 60 71 64.5 73.5 M69.5 73.6 C65 72.6 60.5 75.5 56.5 82.5 M60.4 77.6 C63 77.4 65.6 78.4 67.4 80.2" />
    </g>
    <path class="ear-pink" d="M50.3 11 C49.6 2 48.7 -9 49.5 -15 C49.9 -17.8 51.7 -17.8 52.1 -15 C53 -8 53.6 2 54 11 Z" />
    <path class="ear-pink" d="M69.7 11 C70.4 2 71.3 -9 70.5 -15 C70.1 -17.8 68.3 -17.8 67.9 -15 C67 -8 66.4 2 66 11 Z" />
    ${FEET}` +
      face({
        brows: 'M33 37.6 C34 31.5 38.5 27 44.5 26.2 M87 37.6 C86 31.5 81.5 27 75.5 26.2',
        eye: { dx: 13.5, y: 43, r: 5.2, style: 'double' },
        blush: { dx: 25.4, y: 52.4, rx: 7.4, ry: 5 },
        closed: omega(52.6),
        open: tongueMouth(49.6),
      }),
  );

  // 쿠리만쥬: 머리 위로 낮고 넓게 솟은 갈색 밤 무늬, 무늬 아래 모서리에서 양옆으로 나온 작은 귀, 점 같은 눈.
  // 입을 벌리면 입 위에 잔털이 선다. 평소에는 가끔 "캬아" 얼굴이 된다(character/쿠리/쿠리_캬아_2.jpg):
  // 입 위와 입가의 잔주름, 양 끝이 말려 올라간 윗입술 아래로 크게 벌어진 입(윗니·아랫니·혀), 턱 선, 옆으로 튄 노란 방울.
  // 이때 왼팔을 들어 입 옆으로 캔을 든다: 옆으로 나온 왼팔이 없는 몸으로 바꿔 끼우고, 캔을 그린 뒤 그 위에 손을 덧그려 쥔 것처럼 보이게 한다
  // (캔 모양은 character/쿠리/ 의 피규어 사진 참고)
  const KURI_TOP = 'C35 15.5 46 11.5 60 11.5 C74 11.5 85 15.5 90 23';

  const kuri = svg(
    'kuri',
    0,
    `<ellipse class="fur" cx="21.5" cy="27.5" rx="6.6" ry="4.6" transform="rotate(-24 21.5 27.5)" />
    <ellipse class="fur" cx="98.5" cy="27.5" rx="6.6" ry="4.6" transform="rotate(24 98.5 27.5)" />
    <path class="fur hide-on-kyaa" d="M30 23 ${KURI_TOP} ${BODY}" />
    <path class="fur only-kyaa" d="M30 23 ${KURI_TOP} ${BODY_LEFT_ARM_UP}" />
    <path class="brown" d="M30 23 ${KURI_TOP} Q60 37.5 30 23 Z" />
    ${FEET}` +
      face({
        brows: '',
        eye: { dx: 14.4, y: 45.4, r: 4, style: 'dot' },
        blush: { dx: 25.6, y: 53.2, rx: 7.6, ry: 4.8 },
        closed: omega(52.8),
        open: `<path class="line whiskers" d="M54.6 48.6 l-1.4 -2.6 M58.2 48 l-0.5 -2.8 M61.8 48 l0.5 -2.8 M65.4 48.6 l1.4 -2.6" />
          ${tongueMouth(50.6)}`,
        extra: `<g class="only-kyaa">
          <g transform="rotate(-14 42.6 64.6)">
            <rect class="can" x="37.4" y="56.8" width="10.4" height="15.6" rx="2.2" />
            <path class="can-rim" d="M38.6 59.2 h8 M38.6 70.2 h8" />
            <text class="can-text" x="42.6" y="65.9">BEER</text>
          </g>
          <ellipse class="fur" cx="38.6" cy="71.4" rx="4.8" ry="3.8" />
        </g>
        <g class="only-kyaa" transform="translate(0 0.4)">
          <path class="line whiskers" d="M53.4 44 q1.2 1.2 0.9 2.6 M55.8 43.4 q1 1.3 0.6 2.8 M58.2 43.2 q0.7 1.3 0.3 2.6 M61.8 43.2 q-0.7 1.3 -0.3 2.6 M64.2 43.4 q-1 1.3 -0.6 2.8 M66.6 44 q-1.2 1.2 -0.9 2.6 M58.2 48.2 h3.6 M58.8 49.6 h2.4 M50.6 50 l-1.8 -0.7 M50.4 51.8 l-2 0.1 M69.4 50 l1.8 -0.7 M69.6 51.8 l2 0.1" />
        </g>
        <g class="only-kyaa" transform="translate(0 3.4)">
          <path class="mouth-dark" d="M55.6 54.4 C55.2 60 56.8 65.2 60 65.2 C63.2 65.2 64.8 60 64.4 54.4 Z" />
          <ellipse class="tongue-flat" cx="60" cy="61.4" rx="2.5" ry="2.6" />
          <path class="teeth" d="M56.5 54.9 h7 v2 h-7 Z M58 63 h4 v1.3 h-4 Z" />
          <path class="tooth-gap" d="M58.25 54.9 v2 M60 54.9 v2 M61.75 54.9 v2" />
          <path class="line" d="M52.6 51.8 C52.2 54.4 54.6 55.4 56.4 54.2 C58 53.2 58.8 52.4 60 52.4 C61.2 52.4 62 53.2 63.6 54.2 C65.4 55.4 67.8 54.4 67.4 51.8" />
          <path class="line" d="M58.6 68.2 q1.4 0.8 2.8 0" />
          <rect class="drop" x="69.4" y="57.6" width="2.8" height="4" rx="1.3" />
        </g>`,
      }),
  );

  // 랏코(해달): 윤곽선 대신 짧은 털이 둘러 있고, 귀·발이 짙다. 머리는 다른 캐릭터보다 조금 높고 어깨가 넓게 벌어진 둥근 돔이다
  // (character/랏코/랏코_2.png 의 머리 윤곽을 잰 값: 꼭대기에서 폭의 10% 내려간 곳의 폭이 0.67 로, 원의 0.60 보다 넓다).
  // 이마의 흉터, 안쪽이 내려간 짧은 눈썹과 그 사이의 세로 선 둘, 동그란 눈, 코와 그 아래 입. 목에는 흰 목도리와 망토
  const RAKKO_OUTLINE = `M15.6 50.8 C16.5 40 19.5 31.5 23 25.5 C29 18 42 10 60 10 C78 10 91 18 97 25.5 C100.5 31.5 103.5 40 104.4 50.8 ${BODY_LOWER} Z`;
  const rakko = svg(
    'rakko',
    0,
    `<path class="white" d="M24 77 L9 101 L31 97 Z" />
    <path class="white" d="M96 77 L111 101 L89 97 Z" />
    <ellipse class="dark" cx="17.4" cy="37" rx="5" ry="6" />
    <ellipse class="dark" cx="102.6" cy="37" rx="5" ry="6" />
    <path class="plain" d="${RAKKO_OUTLINE}" />
    <path class="ticks" d="${RAKKO_OUTLINE}" />
    ${feet('dark')}
    <path class="scar" d="M33.5 39.8 L39 32.9 L37.4 30.7 L41 31.9 L47 27.7 L42.2 34.5 L43.4 37.1 L40 35.5 Z" />` +
      face({
        brows: 'M43.6 39.1 l3.4 1.1 M76.4 39.1 l-3.4 1.1 M58.2 37.4 v2 M61.8 37.4 v2',
        eye: { dx: 12.8, y: 48, r: 5, style: 'double' },
        blush: { dx: 23.4, y: 55.4, rx: 7, ry: 4.4 },
        closed: `<path class="nose" d="M57.5 49.4 h5 l-2.5 2.6 Z" />
          <path class="line" d="M55.8 53.4 C56.2 55.6 59.1 55.8 60 52.4 C60.9 55.8 63.8 55.6 64.2 53.4" />
          <path class="line" d="M58.8 58.4 h2.4" />`,
        open: `<path class="nose" d="M57.5 47.8 h5 l-2.5 2.6 Z" />
          ${tongueMouth(50.4)}`,
      }) +
      `<path class="white" d="M17 65.5 C36 73.5 84 73.5 103 65.5 L104 74.5 C86 83.5 34 83.5 16 74.5 Z" />
    <path class="line fold" d="M40 76 q8 1.6 16 1.8 M70 77.2 q7 -0.6 13 -2.2" />`,
  );

  // 풍뎅이: 갈색 몸에 흰 얼굴과 배, 머리 위에 끝이 양쪽으로 말려 올라간 뿔.
  // 가끔 "장수풍뎅이 왕" 이 된다(character/풍뎅이/풍뎅이_왕_2.png). 이때는 평소 그림을 통째로 감추고 따로 그린 전신을 보여 준다:
  // 평소보다 작은 머리, 넓은 어깨와 가슴·배 근육, 양옆으로 벌려 세운 굵은 팔과 주먹, 가부좌로 앉은 다리.
  // 얼굴은 가운데에 작게 모인다 — 물결 모양 눈썹과 그 사이의 짧은 선 둘, 고리 모양의 작은 눈, 한쪽으로 올라간 입과 턱 선.
  // 색은 평소 풍뎅이와 같게 둔다. 치수는 사진의 비율(머리 폭 1 에 팔 끝까지 1.67, 머리 꼭대기에서 바닥까지 1.35)을 이 그림의 높이에 맞춰 줄인 값이다.
  // 팔이 몸 밖으로 나가므로 viewBox 를 좌우로 14 씩 넓혀 둔다
  const BEETLE_TOP =
    'C40 17 48 15.8 54.5 15.6 C55 12 54 9 51 7.5 C47 6.5 43.5 6 41.5 3 C39.5 -1 42.5 -5.5 46.5 -4.5 C50 -3.5 55 -1 60 -1 C65 -1 70 -3.5 73.5 -4.5 C77.5 -5.5 80.5 -1 78.5 3 C76.5 6 73 6.5 69 7.5 C66 9 65 12 65.5 15.6 C72 15.8 80 17 90 23';
  // 왕의 팔 한쪽: 어깨 → 팔꿈치 → 손목을 굵은 선으로 긋고(윤곽선용 굵은 선 위에 살색의 가는 선을 겹친다) 끝에 주먹을 올린다.
  // x: 가운데(60)에서 본 방향. 왼팔은 -1, 오른팔은 1
  const kingArm = (dir) => {
    const x = (dx) => n(60 + dir * dx);
    const arm = `M${x(31)} 66.5 L${x(51)} 73.5 L${x(45.5)} 60`;
    return `<path class="king-arm-ink" d="${arm}" /><path class="king-arm" d="${arm}" />
      <rect class="king-skin" x="${n(x(45) - 7.6)}" y="47.6" width="15.2" height="13" rx="5.2" />
      <path class="king-line" d="M${x(41.2)} 48.8 v4.8 M${x(45)} 48.2 v5.4 M${x(48.8)} 48.8 v4.8 M${x(34)} 65.6 q${n(dir * 6.4)} -5 ${n(dir * 13)} -1.6" />`;
  };

  const beetle = svg(
    'beetle',
    -8,
    `<g class="hide-on-king">
      <path class="fur" d="M30 23 ${BEETLE_TOP} ${BODY}" />
      ${FEET}
      <path class="white" d="M60 25 C63 22.6 68 21.6 72 22.2 C85 23.6 93 34 93 47 C93 58 87 66 80 71 C83 78 82 88 76 94 C72 98 66 99 60 99 C54 99 48 98 44 94 C38 88 37 78 40 71 C33 66 27 58 27 47 C27 34 35 23.6 48 22.2 C52 21.6 57 22.6 60 25 Z" />
      <path class="line" d="M53.4 84 Q60 88.4 66.6 84" />
      ${face({
        brows: '',
        eye: { dx: 10.6, y: 44, r: 3.5, style: 'dot' },
        blush: { dx: 21.6, y: 51.6, rx: 7.4, ry: 5.4 },
        closed: omega(51.6),
        open: tongueMouth(48.6),
      })}
    </g>
    <g class="only-king">
      <path class="king-skin" d="M42 92 C30 92 19 97 20.5 102.6 C22 108 38 108.6 50 107.2 C54 108.8 66 108.8 70 107.2 C82 108.6 98 108 99.5 102.6 C101 97 90 92 78 92 Z" />
      <ellipse class="king-skin" cx="54.4" cy="104.6" rx="5.4" ry="3.3" />
      <ellipse class="king-skin" cx="65.6" cy="104.6" rx="5.4" ry="3.3" />
      <path class="king-line" d="M51.6 102.6 v1.6 M54 102.2 v1.8 M56.4 102.6 v1.6 M63.6 102.6 v1.6 M66 102.2 v1.8 M68.4 102.6 v1.6" />
      ${kingArm(-1)}
      ${kingArm(1)}
      <path class="king-skin" d="M33 61 C30 70 36 84 42 95 L78 95 C84 84 90 70 87 61 Z" />
      <path class="king-line" d="M40 74 Q50 81 60 75.4 Q70 81 80 74 M60 75.8 V94.4 M50.5 82 q9.5 2 19 0 M51.5 86.8 q8.5 1.8 17 0 M52.5 91.2 q7.5 1.6 15 0 M41.6 84 q2.4 2.6 3 6 M78.4 84 q-2.4 2.6 -3 6" />
      <path class="king-skin" d="M25 41 C25 27 39 16.5 55.6 16 C56 13.2 55.2 10.8 53 9.6 C49.9 8.8 47.2 8.4 45.6 6 C44 2.8 46.4 -0.6 49.5 0.2 C52.2 1 56.1 3 60 3 C63.9 3 67.8 1 70.5 0.2 C73.6 -0.6 76 2.8 74.4 6 C72.8 8.4 70.1 8.8 67 9.6 C64.8 10.8 64 13.2 64.4 16 C81 16.5 95 27 95 41 C95 55 80 66 60 66 C40 66 25 55 25 41 Z" />
      <path class="king-face" d="M60 25.6 C62.4 23.6 66 23.4 69 23.8 C80 25.4 87.5 33 87.5 43 C87.5 54 75.5 62.5 60 62.5 C44.5 62.5 32.5 54 32.5 43 C32.5 33 40 25.4 51 23.8 C54 23.4 57.6 23.6 60 25.6 Z" />
      <path class="king-line king-face-line" d="M53.4 35.6 q1.4 -1.6 2.8 -0.2 q1.4 1.4 2.8 0.6 M66.6 35.6 q-1.4 -1.6 -2.8 -0.2 q-1.4 1.4 -2.8 -0.2 M59.6 33.6 l0.7 1.5 M61.4 33.4 l0.7 1.5 M57.2 43.2 Q61 47 65 42.6 M59.6 47.4 q1.5 0.9 3 0" />
      <circle class="king-eye" cx="56.2" cy="39.6" r="1.25" />
      <circle class="king-eye" cx="65.4" cy="39.4" r="1.25" />
    </g>`,
    14,
  );

  // act: every 초마다 for 초 동안 하는 짓(남은 시간과 상관없이 항상). name 이 캐릭터 요소의 data-act 로 걸리고, 모습은 character.css 가 바꾼다
  //   smile: 웃는 얼굴 / crossed: 팔짱 / kyaa: "캬아" 얼굴 / king: 장수풍뎅이 왕
  window.CHARACTERS = {
    hachi: { name: '하치와레', svg: hachi, act: { name: 'smile', every: 6, for: 2 } },
    chii: { name: '치이카와', svg: chii, act: { name: 'smile', every: 6, for: 2 } },
    usagi: { name: '우사기', svg: usagi, act: { name: 'crossed', every: 7, for: 3 } },
    kuri: { name: '쿠리만쥬', svg: kuri, act: { name: 'kyaa', every: 8, for: 3 } },
    rakko: { name: '랏코', svg: rakko },
    beetle: { name: '풍뎅이', svg: beetle, act: { name: 'king', every: 9, for: 3 } },
  };
  window.DEFAULT_CHARACTER = 'hachi';
})();
