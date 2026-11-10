// 남은 시간에 따른 상태와 캐릭터가 잠깐씩 하는 짓의 순서. 펫 창은 전역 Clock 으로 쓰고, 테스트는 require 로 불러 확인한다
(() => {
  // 퇴근이 이만큼(분) 이하로 남으면 '임박'(soon)
  const SOON_MINUTES = 10;
  // 퇴근 시각부터 이만큼(분) 동안은 '퇴근'(done), 그 뒤로는 '야근'(overtime)
  const DONE_MINUTES = 10;

  const formatMinutes = (min) =>
    min < 60 ? `${min}분` : `${Math.floor(min / 60)}시간${min % 60 ? ` ${min % 60}분` : ''}`;

  // now 시점의 상태와 말풍선 문구. offTime 은 'HH:MM'. 자정이 지나면 그날의 퇴근 시각을 기준으로 다시 센다
  function status(now, offTime) {
    const [hour, minute] = offTime.split(':').map(Number);
    const off = new Date(now);
    off.setHours(hour, minute, 0, 0);
    const left = Math.ceil((off - now) / 60000);
    if (left > 0) return { state: left <= SOON_MINUTES ? 'soon' : 'idle', text: `퇴근 ${formatMinutes(left)} 전` };
    const over = -left;
    if (over < DONE_MINUTES) return { state: 'done', text: '퇴근 시간이에요!' };
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

  const api = { SOON_MINUTES, DONE_MINUTES, formatMinutes, status, currentAct };
  if (typeof module === 'object') module.exports = api;
  else window.Clock = api;
})();
