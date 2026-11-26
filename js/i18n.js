'use strict';
/* ================= i18n ================= */
const I18N = {
  en: {
    brand:'LULU COIN RUSH', title:'LULU COIN RUSH',
    tagline:'Grab the Lulu coins. ALL of them.',
    run:'RUN', jump:'JUMP', fly:'FLY', up:'UP', down:'DOWN',
    p_surprise:'SHOCK', p_laugh:'LOL', p_lie:'NAP',
    play:'PLAY', resume:'RESUME', paused:'Paused',
    h_run:'A/D or ←→ to run', h_jump:'Space to jump, hold = higher',
    h_fly:'F to fly, ↑ climb / ↓ swoop', h_coin:'Touch coins to collect',
    h_combo:'Quick picks = combo multiplier', h_power:'Magnet & Star power-ups',
    hint:'Run · Jump · Fly — grab every coin! (↑/↓ steer while flying)',
    best:'BEST', wallet:'WALLET',
    pop_jump:'Boing!', pop_fly:'Take off!', pop_land:'Plop!', pop_swoop:'Wheee!',
    pop_lol:'LOL!', pop_shock:'?!', pop_nap:'Zzz…',
    pop_combo:'COMBO x', pop_magnet:'MAGNET!', pop_star:'DASH!',
    pop_mile:' COINS!', pop_bigcoin:'JACKPOT!',
  },
  zh: {
    brand:'鲁鲁币大冒险', title:'鲁鲁币大冒险',
    tagline:'金币全是我的，一枚都别跑！',
    run:'跑', jump:'跳', fly:'飞', up:'升', down:'降',
    p_surprise:'惊讶', p_laugh:'大笑', p_lie:'躺平',
    play:'开始', resume:'继续', paused:'已暂停',
    h_run:'A/D 或 ←→ 跑起来', h_jump:'空格跳跃，长按跳更高',
    h_fly:'按 F 飞行，↑ 上升 / ↓ 俯冲', h_coin:'碰到金币即可收集',
    h_combo:'连续快捡触发连击倍数', h_power:'磁铁和星星道具',
    hint:'跑 · 跳 · 飞——金币全吃！飞行时用 ↑/↓ 控制高度',
    best:'最佳', wallet:'总资产',
    pop_jump:'啾!', pop_fly:'起飞!', pop_land:'啪叽!', pop_swoop:'咻——!',
    pop_lol:'哈哈哈!', pop_shock:'?!', pop_nap:'呼…',
    pop_combo:'连击 x', pop_magnet:'磁铁上身!', pop_star:'冲刺!',
    pop_mile:' 金币!', pop_bigcoin:'大爆金币!',
  }
};
let lang = localStorage.getItem('lulu_lang') || 'en';
function tr(k) { return I18N[lang][k] ?? I18N.en[k] ?? k; }
/* ================= persistent storage ================= */
let best = +localStorage.getItem('lulu_best') || 0;
let wallet = +localStorage.getItem('lulu_wallet') || 0;
function applyLang() {
  document.documentElement.lang = lang;
  document.getElementById('brand-text').textContent = tr('brand');
  document.getElementById('title-text').textContent = tr('title');
  document.getElementById('tagline-text').textContent = tr('tagline');
  document.getElementById('pause-text').textContent = tr('paused');
  document.getElementById('hint').textContent = tr('hint');
  document.getElementById('best-chip').textContent = tr('best') + ' ' + best;
  document.getElementById('start-best').textContent = tr('best') + ' ' + best;
  document.getElementById('start-wallet').textContent = tr('wallet') + ' ' + wallet;
  document.getElementById('lang-btn').textContent = lang === 'en' ? '中' : 'EN';
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = tr(el.dataset.i18n);
}
