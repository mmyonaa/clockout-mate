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

  // 얼굴은 모든 캐릭터가 같은 문법을 쓴다: 눈(뜬 눈·감은 눈, 웃는 캐릭터는 눈웃음까지)과 입 두 벌(다문 입·벌린 입)을
  // 모두 그려 두고, 조건에 따라 CSS 가 하나씩만 보여 준다.
  //   eye: 눈 중심 { dx: 가운데에서의 거리, y, r }
  //   blush: 볼터치 { dx, y, rx, ry }
  //   eye.style: 눈 모양 (위 eye 함수 참고)
  //   brows: 눈썹 선. 없는 캐릭터는 빈 문자열
  //   happyEyes / happyBrows: 웃는 얼굴의 눈·눈썹 선. 주기적으로 웃는 캐릭터(smile)만 준다
  //   closed / open: 다문 입과 벌린 입의 SVG 조각. 입 모양은 캐릭터마다 달라서 각자 넘긴다
  const face = ({ brows, eye: e, blush: b, closed, open, happyEyes, happyBrows }) => {
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
    <path class="line eyes-sad" d="M${n(lx - 5)} ${n(e.y - 0.8)} Q${lx} ${n(e.y + 3.8)} ${n(lx + 5)} ${n(e.y - 0.8)} M${n(rx - 5)} ${n(e.y - 0.8)} Q${rx} ${n(e.y + 3.8)} ${n(rx + 5)} ${n(e.y - 0.8)}" />
    <path class="tear" d="M${n(rx + 4)} ${n(e.y + 3.4)} q-3 5 0 6.6 q3 -1.6 0 -6.6 Z" />
    <g class="mouth-closed">${closed}</g>
    <g class="mouth-open">${open}</g>`;
  };

  // top: viewBox 의 위쪽 끝. 귀·뿔이 0 위로 올라가는 만큼 음수로 준다
  const svg = (id, top, body) =>
    `<svg class="char char-${id}" viewBox="0 ${top} 120 ${110 - top}" aria-hidden="true">${body}</svg>`;

  // 모든 캐릭터는 몸이 같고 머리 윗선(귀·뿔)만 다르다. 윤곽은 왼쪽 귀 바깥 밑동 (30,23) 에서 시작해 윗선 → BODY 순으로 한 바퀴 돈다.
  // BODY: 오른쪽 귀 바깥 밑동 (90,23) 에서 머리 옆 → 팔 → 몸 아래 → 반대편 팔 → 머리 옆을 거쳐 시작점으로
  const BODY =
    'C98 28 104.4 38 104.4 50.8 C104.4 57.8 101.48 64.17 98.23 70.5 C101.5 71.5 104 76 103 79.5 C102 83 96.5 84.8 91.6 84.3 Q90.9 86 90.6 87.6 C87 96 75 103 60 103 C45 103 33 96 29.4 87.6 Q29.1 86 28.4 84.3 C23.5 84.8 18 83 17 79.5 C16 76 18.5 71.5 21.77 70.5 C18.52 64.17 15.6 57.8 15.6 50.8 C15.6 38 22 28 30 23 Z';
  // 발은 몸 위에 그려 몸 아랫선을 덮는다. 그래야 몸에서 그대로 이어져 내려온 것처럼 보인다
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
        open: tongueMouth(49.5),
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

  // 우사기: 머리 위 가운데에 길게 선 두 귀(안쪽은 분홍), 눈 위로 크게 휜 눈썹 선
  const USAGI_EARS =
    'C36 19 42 17 47 16.2 C45.5 4 44 -10 46 -17 C47.2 -22 52.8 -22 54 -17 C55.5 -9 57 4 58.3 15.4 Q60 16.6 61.7 15.4 C63 4 64.5 -9 66 -17 C67.2 -22 72.8 -22 74 -17 C76 -10 74.5 4 73 16.2 C78 17 84 19 90 23';

  const usagi = svg(
    'usagi',
    -25,
    `<path class="fur" d="M30 23 ${USAGI_EARS} ${BODY}" />
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

  // 쿠리만쥬: 머리 위의 갈색 밤 무늬, 머리 양옆으로 나온 작은 귀, 점 같은 눈. 입을 벌리면 입 위에 잔털이 선다
  const kuri = svg(
    'kuri',
    0,
    `<ellipse class="fur" cx="18.5" cy="31" rx="6.6" ry="4.6" transform="rotate(-20 18.5 31)" />
    <ellipse class="fur" cx="101.5" cy="31" rx="6.6" ry="4.6" transform="rotate(20 101.5 31)" />
    <path class="fur" d="M30 23 ${PLAIN_TOP} ${BODY}" />
    <path class="brown" d="${SIDE_UP} ${PLAIN_TOP} ${SIDE_DOWN} Q60 44.5 21.48 31.26 Z" />
    ${FEET}` +
      face({
        brows: '',
        eye: { dx: 14.6, y: 48, r: 3.7, style: 'dot' },
        blush: { dx: 26, y: 55.6, rx: 7.6, ry: 4.8 },
        closed: omega(55.4),
        open: `<path class="line whiskers" d="M54.6 50.8 l-1.4 -2.6 M58.2 50.2 l-0.5 -2.8 M61.8 50.2 l0.5 -2.8 M65.4 50.8 l1.4 -2.6" />
          ${tongueMouth(52.8)}`,
      }),
  );

  // 랏코(해달): 윤곽선 대신 짧은 털이 둘러 있고, 귀·발이 짙다. 이마의 흉터, 반쯤 감은 눈, 코, 흰 목도리와 망토
  const RAKKO_OUTLINE = `M30 23 ${PLAIN_TOP} ${BODY}`;
  const rakko = svg(
    'rakko',
    0,
    `<path class="white" d="M25 74 L9 101 L31 97 Z" />
    <path class="white" d="M95 74 L111 101 L89 97 Z" />
    <ellipse class="dark" cx="17.6" cy="33" rx="5" ry="6" />
    <ellipse class="dark" cx="102.4" cy="33" rx="5" ry="6" />
    <path class="plain" d="${RAKKO_OUTLINE}" />
    <path class="ticks" d="${RAKKO_OUTLINE}" />
    ${feet('dark')}
    <path class="scar" d="M36.5 36.5 L42 29.6 L40.4 27.4 L44 28.6 L50 24.4 L45.2 31.2 L46.4 33.8 L43 32.2 Z" />` +
      face({
        brows: 'M40.6 37 l6.4 2 M79.4 37 l-6.4 2 M58 34.6 v2.2 M62 34.6 v2.2',
        eye: { dx: 13, y: 45, r: 4.8, style: 'double' },
        blush: { dx: 24.6, y: 53.4, rx: 7.2, ry: 4.6 },
        closed: `<path class="line lids" d="M41.6 42.2 h10.8 M67.6 42.2 h10.8" />
          <path class="nose" d="M57.4 49.2 h5.2 l-2.6 2.8 Z" />
          <path class="line" d="M55.4 53.6 C55.9 56 59 56.2 60 52.4 C61 56.2 64.1 56 64.6 53.6" />
          <path class="line" d="M58.6 59.4 h2.8" />`,
        open: `<path class="line lids" d="M41.6 42.2 h10.8 M67.6 42.2 h10.8" />
          <path class="nose" d="M57.4 48 h5.2 l-2.6 2.8 Z" />
          ${tongueMouth(51.4)}`,
      }) +
      `<path class="white" d="M18.6 61.5 C36 69.5 84 69.5 101.4 61.5 L103.4 70.5 C86 79.5 34 79.5 16.6 70.5 Z" />
    <path class="line fold" d="M40 72 q8 1.6 16 1.8 M70 73.2 q7 -0.6 13 -2.2" />`,
  );

  // 풍뎅이: 갈색 몸에 흰 얼굴과 배, 머리 위에 끝이 양쪽으로 말려 올라간 뿔
  const BEETLE_TOP =
    'C40 17 48 15.8 54.5 15.6 C55 12 54 9 51 7.5 C47 6.5 43.5 6 41.5 3 C39.5 -1 42.5 -5.5 46.5 -4.5 C50 -3.5 55 -1 60 -1 C65 -1 70 -3.5 73.5 -4.5 C77.5 -5.5 80.5 -1 78.5 3 C76.5 6 73 6.5 69 7.5 C66 9 65 12 65.5 15.6 C72 15.8 80 17 90 23';

  const beetle = svg(
    'beetle',
    -8,
    `<path class="fur" d="M30 23 ${BEETLE_TOP} ${BODY}" />
    ${FEET}
    <path class="white" d="M60 25 C63 22.6 68 21.6 72 22.2 C85 23.6 93 34 93 47 C93 58 87 66 80 71 C83 78 82 88 76 94 C72 98 66 99 60 99 C54 99 48 98 44 94 C38 88 37 78 40 71 C33 66 27 58 27 47 C27 34 35 23.6 48 22.2 C52 21.6 57 22.6 60 25 Z" />
    <path class="line" d="M53.4 84 Q60 88.4 66.6 84" />` +
      face({
        brows: '',
        eye: { dx: 10.6, y: 44, r: 3.5, style: 'dot' },
        blush: { dx: 21.6, y: 51.6, rx: 7.4, ry: 5.4 },
        closed: omega(51.6),
        open: tongueMouth(48.6),
      }),
  );

  // smile: 평소 상태에서 every 초마다 for 초 동안 웃는 얼굴이 된다 (없으면 웃지 않음). 웃는 얼굴은 이때만 나온다
  window.CHARACTERS = {
    hachi: { name: '하치와레', svg: hachi },
    chii: { name: '치이카와', svg: chii, smile: { every: 6, for: 2 } },
    usagi: { name: '우사기', svg: usagi },
    kuri: { name: '쿠리만쥬', svg: kuri },
    rakko: { name: '랏코', svg: rakko },
    beetle: { name: '풍뎅이', svg: beetle },
  };
  window.DEFAULT_CHARACTER = 'hachi';
})();
