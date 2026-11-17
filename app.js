/* 安颐院内照护 · 独立院内版 H5 */
(function () {
  const D = window.HOSPITAL_DATA;
  const KEY = 'anyi-hospital-v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n, c = '') => `<svg class="ic ${c}" aria-hidden="true"><use href="#i-${n}"></use></svg>`;
  const clone = (v) => JSON.parse(JSON.stringify(v));

  const pad = (n) => String(n).padStart(2, '0');
  const todayISO = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  const addDays = (date, n) => {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
  };
  const fmtDate = (date) => {
    if (!date) return '';
    const [y, m, d] = date.split('-');
    return `${Number(m)}月${Number(d)}日`;
  };
  const fmtFull = (date) => (date ? date.replace(/-/g, '.') : '');
  const weekday = (date) => {
    if (!date) return '';
    const d = new Date(date + 'T00:00:00');
    return '周' + '日一二三四五六'[d.getDay()];
  };
  const nowText = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const mdText = (text) => text.slice(5);
  const phoneMask = (p) => String(p || '').replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  const num = (n) => Number(n).toLocaleString('zh-CN');
  const idTypeName = (id) => (D.idTypes.find((x) => x[0] === String(id)) || D.idTypes[0])[1];
  const maskId = (id) => String(id || '').replace(/^(.{4}).*(.{4})$/, '$1**********$2');
  const calcAge = (birthday) => {
    if (!birthday) return '';
    const b = new Date(birthday + 'T00:00:00');
    const t = new Date();
    let age = t.getFullYear() - b.getFullYear();
    const m = t.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age -= 1;
    return age > 0 && age < 130 ? age : '';
  };

  function normalizeState(s) {
    if (!s || !Array.isArray(s.orders)) throw new Error('bad');
    if (!s.profile) s.profile = clone(D.account.profile);
    if (!Array.isArray(s.vouchers)) s.vouchers = clone(D.cards);
    s.orders.forEach((o) => {
      if (!o.card) {
        const c = s.vouchers[0];
        o.card = { cardNum: c.cardNum, cardType: c.cardType, cardTypeName: c.cardTypeName, productName: c.productName, productCode: c.productCode };
      }
      if (!o.voucherId) {
        const v = s.vouchers.find((x) => x.cardNum === o.card.cardNum);
        if (v) o.voucherId = v.id;
      }
      if (!o.city) o.city = (D.hospitalMeta[o.hospital] || {}).city || '';
      if (!o.hospitalCode) o.hospitalCode = (D.hospitalMeta[o.hospital] || {}).code || '';
      if (!o.disease) o.disease = '—';
      if (!o.patient.idType) o.patient = { ...s.profile.patient, ...o.patient };
      if (!o.contact.idType) o.contact = { ...s.profile.contact, ...o.contact };
      if (!o.syncStatus) o.syncStatus = 'success';
    });
    s.vouchers.forEach((v) => {
      const active = s.orders.find((o) => o.voucherId === v.id && o.status !== 'cancelled');
      if (active) { v.status = 'used'; v.orderId = active.id; }
      else { v.status = 'unused'; v.orderId = null; }
    });
    return s;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) throw new Error('empty');
      return normalizeState(JSON.parse(raw));
    } catch (e) {
      return {
        session: null,
        orders: clone(D.seedOrders),
        vouchers: clone(D.cards),
        profile: clone(D.account.profile),
        seq: 9,
        loginAgree: false,
        created: Date.now()
      };
    }
  }
  let state = loadState();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  const allCards = () => state.vouchers || D.cards;
  const getCard = (id) => allCards().find((c) => c.id === id);
  const unusedVouchers = () => allCards().filter((c) => c.status !== 'used');
  const defaultCard = () => unusedVouchers()[0] || null;
  function cardState(card) {
    if (!card) return { key: 'none', label: '未发放', tone: 'gray', valid: false };
    if (card.status === 'used') return { key: 'used', label: '已使用', tone: 'gray', valid: false };
    return { key: 'unused', label: '未使用', tone: 'green', valid: true };
  }
  const maskCard = (n) => String(n || '').replace(/^(.{4}).*(.{4})$/, '$1 **** **** $2');

  const STATUS = {
    pending: { label: '待确认', tone: 'blue', title: '预约待确认', desc: '照护顾问将审核评估后与您确认服务安排' },
    accepted: { label: '已预约', tone: 'blue', title: '预约已确认', desc: '护理员将在约定时间到院，请保持电话畅通' },
    serving: { label: '已预约', tone: 'blue', title: '服务进行中', desc: '护理员正在院内照护，服务记录会持续更新' },
    completed: { label: '已完成', tone: 'green', title: '本次陪护已完成', desc: '感谢您的信任，期待再次为您服务' },
    cancelled: { label: '已取消', tone: 'gray', title: '预约已取消', desc: '如仍需院内陪护，可重新提交预约' }
  };
  function apptStatus(o) {
    if (o.status === 'pending') return { label: '待确认', tone: 'blue' };
    if (o.status === 'accepted' || o.status === 'serving') return { label: '已预约', tone: 'blue' };
    if (o.status === 'completed') return { label: '已完成', tone: 'green' };
    return { label: '已取消', tone: 'gray' };
  }
  function flowSteps(activeStep = 1, tone = 'light') {
    const labels = ['信息填写', '服务评估', '到院服务', '服务完成'];
    return `<div class="flow-steps flow-steps--${tone}">${labels.map((label, i) => {
      const n = i + 1;
      const done = n < activeStep;
      const active = n === activeStep;
      return `<div class="flow-step ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}"><i>${done ? icon('check') : n}</i><span>${label}</span></div>${i < labels.length - 1 ? `<span class="flow-line ${done ? 'is-done' : ''}"></span>` : ''}`;
    }).join('')}</div>`;
  }
  const statusPill = (key) => {
    const s = STATUS[key] || { label: key, tone: 'gray' };
    return `<span class="pill pill--${s.tone}">${s.label}</span>`;
  };

  function iconSvg(name) { return icon(name); }
  function page(html, cls = '') { return `<div class="page ${cls}">${html}</div>`; }

  function ph(title, { back = '#/my', right = '', sub = '' } = {}) {
    return `<header class="ph">
      <button class="ph__btn" data-nav="${back}" aria-label="返回">${icon('chevL')}</button>
      <div class="grow" style="text-align:center"><div class="ph__title">${esc(title)}</div>${sub ? `<div class="ph__sub">${esc(sub)}</div>` : ''}</div>
      <div class="ph__right" style="min-width:36px;justify-content:flex-end">${right}</div>
    </header>`;
  }

  function loginView() {
    state.loginAgree = false;
    return page(`<div class="login-page">
      <div class="login-top">
        <button class="login-back" type="button" data-act="login-back" aria-label="返回">${icon('chevL')}</button>
        <h1>登录注册</h1>
        <span class="login-top__placeholder"></span>
      </div>
      <div class="login-hello">
        <div class="login-hello__copy"><h2>Hello!</h2><p>欢迎使用</p></div>
        <div class="login-hello__art" aria-hidden="true">
          <svg viewBox="0 0 250 200" role="img">
            <defs>
              <linearGradient id="shieldA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A8CCFF"/><stop offset=".48" stop-color="#4B8EFF"/><stop offset="1" stop-color="#1B5FE0"/></linearGradient>
              <linearGradient id="shieldB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9EBFF" stop-opacity=".9"/><stop offset="1" stop-color="#6DA6FF" stop-opacity=".25"/></linearGradient>
              <linearGradient id="cardA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D7E9FF"/><stop offset="1" stop-color="#86B7FF"/></linearGradient>
              <linearGradient id="cardB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#BFD9FF"/><stop offset="1" stop-color="#5D97F5"/></linearGradient>
              <filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>
            </defs>
            <ellipse cx="140" cy="172" rx="72" ry="10" fill="#7FB2F8" opacity=".2" filter="url(#soft)"/>
            <g opacity=".9">
              <g transform="translate(18 58) rotate(-22)"><rect width="54" height="32" rx="7" fill="url(#cardA)" opacity=".8"/><rect x="9" y="9" width="20" height="4" rx="2" fill="#fff" opacity=".75"/><rect x="9" y="18" width="32" height="4" rx="2" fill="#fff" opacity=".5"/></g>
              <g transform="translate(196 45) rotate(17)"><rect width="48" height="29" rx="7" fill="url(#cardB)" opacity=".8"/><rect x="8" y="8" width="17" height="3.5" rx="1.7" fill="#fff" opacity=".7"/><rect x="8" y="16" width="27" height="3.5" rx="1.7" fill="#fff" opacity=".45"/></g>
              <g transform="translate(188 128) rotate(10)"><rect width="42" height="26" rx="6" fill="url(#cardA)" opacity=".75"/><rect x="7" y="7" width="14" height="3" rx="1.5" fill="#fff" opacity=".7"/><rect x="7" y="14" width="23" height="3" rx="1.5" fill="#fff" opacity=".45"/></g>
            </g>
            <g transform="translate(73 24)">
              <path d="M52 12 92 29v39c0 31-19 51-40 62C31 119 12 99 12 68V29z" fill="#2E6BFF" opacity=".18" filter="url(#soft)"/>
              <path d="M52 6 90 22v40c0 28-17 47-38 58-21-11-38-30-38-58V22z" fill="url(#shieldA)" stroke="#EAF4FF" stroke-width="2.5"/>
              <path d="M52 18 80 30v32c0 21-13 36-28 45-15-9-28-24-28-45V30z" fill="url(#shieldB)" opacity=".55"/>
              <path d="M52 26v50M31 51h42" stroke="#fff" stroke-width="13" stroke-linecap="round" opacity=".98"/>
              <path d="M52 26v50M31 51h42" stroke="#D9EAFF" stroke-width="3" stroke-linecap="round" opacity=".45"/>
              <path d="M24 45c-2-9 2-17 8-23" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35" fill="none"/>
            </g>
          </svg>
        </div>
      </div>
      <form class="login-sheet" data-form="login" novalidate>
        <label class="login-label" for="login-phone">手机号</label>
        <input class="login-input" id="login-phone" type="tel" inputmode="numeric" maxlength="11" placeholder="请输入手机号" autocomplete="tel">
        <label class="login-label" for="login-code">验证码</label>
        <div class="login-code">
          <input class="login-input" id="login-code" type="tel" inputmode="numeric" maxlength="6" placeholder="请输入验证码" autocomplete="one-time-code">
          <button class="login-code__btn" id="send-code" type="button" data-act="send-code">获取验证码</button>
        </div>
        <button class="login-submit" type="submit">登录</button>
        <div class="login-protocol ${state.loginAgree ? 'is-on' : ''}" data-act="toggle-login-agree">
          <span class="login-protocol__box">${state.loginAgree ? icon('check') : ''}</span>
          <span>我已阅读并同意<em>《用户服务协议》</em>和<em>《用户隐私协议》</em></span>
        </div>
      </form>
      <div class="login-page__foot">安颐院内照护 · 专业陪护服务</div>
    </div>`);
  }

  function createDraft() {
    const p = state.profile.patient;
    const c = state.profile.contact;
    const card = defaultCard();
    return {
      cardId: card ? card.id : '',
      hospital: '北京大学国际医院',
      city: '北京市',
      department: '骨科病区',
      bed: '12 床',
      hospitalNo: '',
      hospitalizedTime: '',
      disease: '膝关节骨性关节炎（术后）',
      serviceId: 'hospital',
      startDate: todayISO(),
      startTime: '08:00',
      patient: { ...p, age: calcAge(p.birthday) || '78', selfCare: '' },
      needs: ['术后照护', '夜间看护'],
      contact: { name: c.name, mobile: c.mobile || (state.session ? state.session.phone : D.account.phone), phone: c.mobile || (state.session ? state.session.phone : D.account.phone) },
      emergency: { name: '', phone: '' },
      note: '',
      agree: false
    };
  }
  let draft = null;
  let editingOrderId = null;

  function draftFromOrder(o) {
    const meta = D.hospitalMeta[o.hospital] || {};
    return {
      cardId: o.voucherId || (defaultCard() ? defaultCard().id : ''),
      hospital: o.hospital,
      city: o.city || meta.city || '',
      department: o.department,
      bed: o.bed,
      hospitalNo: '',
      hospitalizedTime: o.hospitalizedTime || '',
      disease: o.disease || '',
      serviceId: 'hospital',
      startDate: o.startDate >= todayISO() ? o.startDate : todayISO(),
      startTime: o.startTime,
      patient: { ...o.patient, age: calcAge(o.patient.birthday) || o.patient.age, selfCare: '' },
      needs: [...(o.needs || [])],
      contact: { ...o.contact, mobile: o.contact.mobile || o.contact.phone, phone: o.contact.mobile || o.contact.phone },
      emergency: { name: '', phone: '' },
      note: o.note || '',
      agree: true
    };
  }
  function editOrder(id) {
    const o = state.orders.find((x) => x.id === id);
    if (!o) return;
    editingOrderId = id;
    draft = draftFromOrder(o);
    go('/book');
  }
  function rebookOrder(id) {
    const o = state.orders.find((x) => x.id === id);
    if (!o) return;
    if (!unusedVouchers().length) { toast('服务券已用完，暂不可预约'); go('/vouchers'); return; }
    editingOrderId = null;
    draft = draftFromOrder(o);
    draft.cardId = defaultCard() ? defaultCard().id : '';
    go('/book');
  }

  function cardStripHtml(card, labelOverride = '') {
    const st = cardState(card);
    if (!card) return `<div class="benefit-empty">${icon('receipt')}暂无可用服务券，请联系客服发放</div>`;
    return `<div class="benefit-card">
      <div class="benefit-card__top"><span class="benefit-card__product">${esc(card.productName)}</span><span class="benefit-card__state ${st.valid ? 'is-ok' : ''}">${esc(labelOverride || st.label)}</span></div>
      <div class="benefit-card__type">${esc(card.cardTypeName)}</div>
      <div class="benefit-card__num">券号 ${esc(card.cardNum)}</div>
      <div class="benefit-card__foot"><span>单次使用</span><span>使用人 ${esc(card.mainInsurerName)}</span></div>
    </div>`;
  }

  function requestView() {
    if (!draft) draft = createDraft();
    const today = todayISO();
    const isEditing = !!editingOrderId;
    const available = unusedVouchers();
    const card = isEditing ? (getCard(draft.cardId) || null) : (available[0] || null);
    if (!isEditing && card) draft.cardId = card.id;
    const activeOrders = state.orders.filter((o) => ['pending', 'accepted', 'serving'].includes(o.status));
    const cities = [...new Set(D.hospitals.map((h) => (D.hospitalMeta[h] || {}).city).filter(Boolean))];
    const city = draft.city && cities.includes(draft.city) ? draft.city : ((D.hospitalMeta[draft.hospital] || {}).city || cities[0]);
    const hospitals = D.hospitals.filter((h) => (D.hospitalMeta[h] || {}).city === city);
    const hospital = hospitals.includes(draft.hospital) ? draft.hospital : (hospitals[0] || '');
    const needs = D.careNeeds.map((n) => `<button type="button" class="need-opt ${draft.needs.includes(n) ? 'is-on' : ''}" data-act="need" data-value="${esc(n)}">
      <span class="need-opt__check">${draft.needs.includes(n) ? icon('check') : ''}</span><span class="need-opt__label">${esc(n)}</span>
    </button>`).join('');

    if (!isEditing && !card) {
      return page(`<div class="no-voucher">
        <span class="no-voucher__icon">${icon('receipt')}</span>
        <h2>暂无可用服务券</h2>
        <p>${activeOrders.length ? `您有 ${activeOrders.length} 个进行中预约，服务券已全部使用。取消进行中预约可返还服务券，或等待服务完成后再预约。` : '当前服务券已全部使用，暂时无法提交新的预约。'}</p>
        <div class="no-voucher__actions"><button class="btn btn--primary" data-nav="#/vouchers">查看我的券包</button><button class="btn btn--ghost" data-nav="#/my">返回我的</button></div>
        <div class="no-voucher__tip">${icon('info')} 每张服务券仅可使用 1 次</div>
      </div>`, 'page--tabbar');
    }

    return page(`<header class="req-head book-hero">
      <div class="req-head__row">
        <div class="book-hero__copy">
          <h1>${isEditing ? '修改预约' : '院内照护预约'}</h1>
          <p>${isEditing ? '修改后预约将重新进入待确认状态。' : '填写信息并提交预约，照护顾问将审核评估后确认<span style="white-space:nowrap">服务安排。</span>'}</p>
        </div>
      </div>
      <div class="book-hero__scene" aria-hidden="true">
          <svg viewBox="0 0 390 145" preserveAspectRatio="xMidYMax slice">
            <defs>
              <linearGradient id="sceneSky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F4FAFF"/><stop offset="1" stop-color="#E8F4FF"/></linearGradient>
              <linearGradient id="sceneBld" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F5FAFF"/><stop offset="1" stop-color="#D7E9FF"/></linearGradient>
              <linearGradient id="sceneNurse" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5B9DFF"/><stop offset="1" stop-color="#1B63D5"/></linearGradient>
              <linearGradient id="sceneCare" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9BC7FF"/><stop offset="1" stop-color="#5B96EE"/></linearGradient>
            </defs>
            <rect width="390" height="145" fill="url(#sceneSky)"/>
            <g fill="#FFFFFF" opacity=".78"><ellipse cx="55" cy="30" rx="31" ry="9"/><ellipse cx="86" cy="25" rx="22" ry="7"/><ellipse cx="320" cy="18" rx="26" ry="7"/><ellipse cx="348" cy="24" rx="18" ry="5"/></g>
            <g fill="#CFE5FF" opacity=".7"><rect x="8" y="82" width="38" height="62" rx="5"/><rect x="50" y="96" width="30" height="48" rx="4"/><rect x="84" y="104" width="24" height="40" rx="4"/></g>
            <g transform="translate(280 22)">
              <rect x="0" y="18" width="88" height="112" rx="9" fill="#D3E8FF"/>
              <rect x="13" y="0" width="62" height="130" rx="7" fill="url(#sceneBld)"/>
              <rect x="13" y="0" width="62" height="9" fill="#C5E0FF"/>
              <g fill="#FFFFFF" opacity=".9">
                <rect x="23" y="52" width="12" height="10" rx="2"/><rect x="42" y="52" width="12" height="10" rx="2"/><rect x="61" y="52" width="9" height="10" rx="2"/>
                <rect x="23" y="70" width="12" height="10" rx="2"/><rect x="42" y="70" width="12" height="10" rx="2"/><rect x="61" y="70" width="9" height="10" rx="2"/>
                <rect x="23" y="88" width="12" height="10" rx="2"/><rect x="42" y="88" width="12" height="10" rx="2"/><rect x="61" y="88" width="9" height="10" rx="2"/>
              </g>
              <rect x="31" y="19" width="26" height="24" rx="6" fill="#2E6BFF"/>
              <path d="M44 24v13M37.5 30.5h13" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
              <rect x="6" y="8" width="14" height="10" rx="3" fill="#EAF5FF"/><rect x="68" y="8" width="14" height="10" rx="3" fill="#EAF5FF"/>
            </g>
            <path d="M0 126 Q95 112 196 125 T390 120 V145 H0Z" fill="#F3FAFF" opacity=".9"/>
            <g transform="translate(145 40)">
              <ellipse cx="32" cy="91" rx="27" ry="6" fill="#B7D6FF" opacity=".55"/>
              <path d="M6 89c0-25 12-37 26-37s26 12 26 37v27H6z" fill="url(#sceneCare)"/>
              <path d="M21 84h22v18H21z" fill="#FFFFFF" opacity=".86"/>
              <path d="M16 91h32" stroke="#D7E9FF" stroke-width="2"/>
              <circle cx="32" cy="43" r="18" fill="#FFD9C7"/>
              <path d="M14 41c0-14 8-23 18-23s18 9 18 23c-4-9-10-12-18-12s-14 3-18 12z" fill="#35415A"/>
              <path d="M15 41c1 7 3 10 5 12M49 41c-1 7-3 10-5 12" stroke="#35415A" stroke-width="4" stroke-linecap="round"/>
              <rect x="20" y="47" width="24" height="11" rx="5.5" fill="#FFFFFF"/>
              <path d="M24 53h16" stroke="#C9D9EA" stroke-width="1.4" stroke-linecap="round"/>
              <path d="M32 79c-9-6-15-10-15-17 0-4 3-7 7-7 3 0 5 2 8 5 3-3 5-5 8-5 4 0 7 3 7 7 0 7-6 11-15 17z" fill="#FFFFFF" opacity=".9"/>
              <path d="M32 82c-6-4-11-7-11-12 0-3 2-5 5-5 2 0 4 1 6 3 2-2 4-3 6-3 3 0 5 2 5 5 0 5-5 8-11 12z" fill="#7DB5FF"/>
            </g>
            <g transform="translate(220 27)">
              <ellipse cx="35" cy="103" rx="28" ry="6" fill="#B7D6FF" opacity=".55"/>
              <path d="M10 101c0-29 12-44 25-44s25 15 25 44v15H10z" fill="url(#sceneNurse)"/>
              <path d="M10 101c0-15 5-27 12-35l-8 50H10z" fill="#4C8DF6" opacity=".65"/>
              <path d="M25 95h20v17H25z" fill="#FFFFFF" opacity=".9"/>
              <circle cx="35" cy="48" r="18" fill="#FFD9C7"/>
              <path d="M18 46c0-13 8-21 17-21s17 8 17 21c-4-7-10-10-17-10s-13 3-17 10z" fill="#2F3A50"/>
              <path d="M18 36c2-8 9-13 17-13s15 5 17 13l-2 5H20z" fill="#FFFFFF"/>
              <path d="M35 26v8M31 30h8" stroke="#2E6BFF" stroke-width="2.6" stroke-linecap="round"/>
              <rect x="23" y="51" width="24" height="11" rx="5.5" fill="#FFFFFF"/>
              <path d="M27 57h16" stroke="#C9D9EA" stroke-width="1.4" stroke-linecap="round"/>
              <path d="M57 78h18v28H57z" fill="#EAF4FF" stroke="#A9CBF2" stroke-width="1.2"/>
              <path d="M62 84h8M62 89h8M62 94h6" stroke="#8DB7E8" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M12 78c-4 9-5 20-3 31" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity=".55"/>
            </g>
            <g fill="#79B4FF" opacity=".55"><path d="M118 30c-5-4-9-6-9-10 0-2 2-4 4-4 2 0 3 1 5 3 2-2 3-3 5-3 2 0 4 2 4 4 0 4-4 6-9 10z"/><path d="M260 16c-3-2-6-4-6-7 0-2 1-3 3-3 1 0 2 1 3 2 1-1 2-2 3-2 2 0 3 1 3 3 0 3-3 5-6 7z"/></g>
            <g stroke="#9CC8F5" stroke-width="1.5" opacity=".45"><path d="M118 48v8M114 52h8"/><path d="M273 38v7M269.5 41.5h7"/></g>
          </svg>
        </div>
      <div class="book-assure"><span>${icon('shield')}持证护理员</span><span>${icon('pin')}到院签到</span><span>${icon('file')}全程记录</span></div>
      ${flowSteps(1, 'light')}
    </header>
    <form id="request-form" class="req-body" novalidate>
      ${activeOrders.length && !isEditing ? `<div class="banner banner--blue">${icon('info')} 您有 ${activeOrders.length} 个进行中预约，另有 ${available.length} 张服务券可用，可继续提交新的预约。</div>` : ''}
      <section class="form-card form-card--voucher">
        <div class="form-card__head"><span class="form-card__num is-gold">${icon('receipt')}</span><span class="form-card__title">卡券</span><span class="form-card__aside">${isEditing ? '本次预约使用' : `可用 ${available.length} 张`}</span></div>
        <div id="card-strip">${cardStripHtml(card, isEditing ? '本次预约' : '未使用')}</div>
        <p class="form-note">单次使用券，本次预约将使用 1 张。</p>
      </section>

      <section class="form-card">
        <div class="form-card__head"><span class="form-card__num is-blue">${icon('user')}</span><span class="form-card__title">填写护理人信息</span><span class="form-card__aside">用于服务预约与实名</span></div>
        <div class="form-grid">
          <div class="field field--full"><label class="field__label" for="patientName">姓名<em>*</em></label><input class="field__box" id="patientName" value="${esc(draft.patient.name)}" placeholder="请输入护理人姓名"><span class="field__err">请填写护理人姓名</span></div>
          <div class="field"><label class="field__label">性别<em>*</em></label><div class="seg"><button type="button" class="seg__btn ${draft.patient.gender === '女' ? 'is-on' : ''}" data-act="gender" data-value="女">女</button><button type="button" class="seg__btn ${draft.patient.gender === '男' ? 'is-on' : ''}" data-act="gender" data-value="男">男</button></div></div>
          <div class="field"><label class="field__label" for="birthday">出生日期<em>*</em> <span class="field__tag" id="age-hint">${draft.patient.age ? draft.patient.age + ' 岁' : ''}</span></label><input class="field__box" id="birthday" type="date" value="${esc(draft.patient.birthday)}"><span class="field__err">请填写出生日期</span></div>
          <div class="field field--full"><label class="field__label" for="patientIdType">证件类型<em>*</em></label><select class="field__box" id="patientIdType">${D.idTypes.map(([v, n]) => `<option value="${v}" ${String(draft.patient.idType) === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><span class="field__err"></span></div>
          <div class="field field--full"><label class="field__label" for="patientIdNo">证件号<em>*</em></label><input class="field__box" id="patientIdNo" value="${esc(draft.patient.idNo)}" placeholder="请输入证件号码"><span class="field__err">请填写证件号码</span></div>
        </div>
      </section>

      <section class="form-card">
        <div class="form-card__head"><span class="form-card__num is-teal">${icon('hospital')}</span><span class="form-card__title">填写住院信息</span><span class="form-card__aside">用于匹配院内护理员</span></div>
        <div class="form-grid">
          <div class="field"><label class="field__label" for="city">城市<em>*</em></label><select class="field__box" id="city">${cities.map((c) => `<option value="${esc(c)}" ${city === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select><span class="field__err">请选择城市</span></div>
          <div class="field"><label class="field__label" for="hospital">就诊医院<em>*</em></label><select class="field__box" id="hospital">${hospitals.map((h) => `<option ${hospital === h ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select><span class="field__err">请选择医院</span></div>
          <div class="field field--full"><label class="field__label" for="department">科室 / 病区<em>*</em></label><select class="field__box" id="department">${D.departments.map((d) => `<option ${draft.department === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select><span class="field__err">请选择科室</span></div>
          <div class="field field--full"><label class="field__label" for="disease">入院疾病 / 诊断<em>*</em></label><input class="field__box" id="disease" value="${esc(draft.disease)}" placeholder="如：膝关节骨性关节炎（术后）"><span class="field__err">请填写入院疾病或诊断</span></div>
          <div class="field field--full"><label class="field__label" for="hospitalizedTime">住院日期 <span class="tiny muted">选填</span></label><input class="field__box" id="hospitalizedTime" type="date" max="${today}" value="${esc(draft.hospitalizedTime)}"><span class="field__err"></span></div>
        </div>
      </section>

      <section class="form-card">
        <div class="form-card__head"><span class="form-card__num is-violet">${icon('clock')}</span><span class="form-card__title">期望服务时间</span><span class="form-card__aside">照护顾问将评估确认</span></div>
        <div class="quick-dates">${[[0, '今天'], [1, '明天'], [2, '后天']].map(([n, label]) => { const d = addDays(today, n); return `<button type="button" class="quick-date ${draft.startDate === d ? 'is-on' : ''}" data-act="quick-date" data-date="${d}">${label}<span>${Number(d.slice(5, 7))}/${Number(d.slice(8))}</span></button>`; }).join('')}</div>
        <div class="field" style="margin-top:10px"><label class="field__label" for="serviceTime">期望服务时间<em>*</em></label><input class="field__box" id="serviceTime" type="datetime-local" min="${today}T00:00" value="${esc(draft.startDate)}T${esc(draft.startTime)}"><span class="field__err">请选择期望服务时间</span></div>
      </section>

      <section class="form-card">
        <div class="form-card__head"><span class="form-card__num is-rose">${icon('care')}</span><span class="form-card__title">照护需求</span><span class="form-card__aside" id="needs-count">已选 ${draft.needs.length} 项</span></div>
        <div class="need-grid" id="needs">${needs}</div>
        <span class="field__err" id="needs-err" style="display:none;margin-top:4px">请至少选择一项照护需求</span>
        <div class="field" style="margin-top:12px"><label class="field__label" for="note">补充说明 <span class="tiny muted">选填</span></label><textarea class="field__box" id="note" placeholder="例如：术后不能下床、夜间需要协助起夜、饮食禁忌等">${esc(draft.note)}</textarea></div>
      </section>

      <section class="form-card">
        <div class="form-card__head"><span class="form-card__num is-blue">${icon('users')}</span><span class="form-card__title">填写联系人信息</span><span class="form-card__aside">用于顾问确认</span></div>
        <div class="form-grid">
          <div class="field"><label class="field__label" for="contactName">姓名<em>*</em></label><input class="field__box" id="contactName" value="${esc(draft.contact.name)}" placeholder="姓名"><span class="field__err">请填写联系人姓名</span></div>
          <div class="field"><label class="field__label" for="contactPhone">手机号<em>*</em></label><input class="field__box" id="contactPhone" type="tel" inputmode="numeric" maxlength="11" value="${esc(draft.contact.mobile || draft.contact.phone)}" placeholder="11 位手机号"><span class="field__err">请填写正确手机号</span></div>
        </div>
      </section>

      <div class="agree-block">
        <div class="agree ${draft.agree ? 'is-on' : ''}" id="agree-row" data-act="toggle-agree">
          <span class="agree__box">${icon('check')}</span>
          <span>我已阅读并同意<em>《院内照护服务协议》</em>与<em>《隐私政策》</em>，确认住院信息与照护需求真实有效</span>
        </div>
        <div class="form-foot-note">${icon('shield')} 服务由持证护理员提供，到院签到、护理记录全程可追溯</div>
      </div>

      <div class="actionbar request-actionbar">
        <div class="actionbar__note"><b>提交后照护顾问将审核评估</b>确认服务安排后与您联系</div>
        <button class="btn btn--primary" type="submit">${isEditing ? '保存修改' : '提交预约'}</button>
      </div>
    </form>`, 'page--actionbar page--tabbar');
  }

  function orderCard(o) {
    const st = apptStatus(o);
    const canCancel = ['pending', 'accepted'].includes(o.status);
    const canEdit = ['pending', 'accepted'].includes(o.status);
    const canRebook = ['completed', 'cancelled'].includes(o.status);
    return `<article class="appt-card">
      <div class="appt-card__head">
        <span class="appt-icon">${icon('care')}</span>
        <div class="appt-card__title"><h3>院内照护</h3><div class="appt-card__no">订单号 ${esc(o.no)}</div></div>
        <span class="appt-status appt-status--${st.tone}">${st.label}</span>
      </div>
      <div class="appt-lines">
        <div class="appt-line">${icon('clock')}<span class="appt-line__label">预约时间</span><b>${fmtFull(o.startDate)} ${esc(o.startTime)}</b></div>
        <div class="appt-line">${icon('user')}<span class="appt-line__label">护理人</span><b>${esc(o.patient.name)} · ${esc(o.patient.gender)} · ${o.patient.age}岁</b></div>
        <div class="appt-line">${icon('pin')}<span class="appt-line__label">住院地址</span><b>${esc(o.hospital)} · ${esc(o.department)}</b></div>
      </div>
      <div class="appt-card__actions">
        <button class="appt-action" data-nav="#/order/${o.id}">查看详情</button>
        ${canCancel ? `<button class="appt-action" data-act="cancel" data-id="${o.id}">取消预约</button>` : ''}
        ${canEdit ? `<button class="appt-action appt-action--primary" data-act="edit-order" data-id="${o.id}">修改预约</button>` : ''}
        ${canRebook ? `<button class="appt-action appt-action--primary" data-act="rebook" data-id="${o.id}">重新预约</button>` : ''}
      </div>
    </article>`;
  }

  function myView() {
    const orders = state.orders;
    const active = orders.filter((o) => ['pending', 'accepted', 'serving'].includes(o.status));
    const pending = orders.filter((o) => o.status === 'pending');
    const completed = orders.filter((o) => o.status === 'completed');
    const vouchers = unusedVouchers().length;
    return page(`<header class="my-hero">
      <div class="my-hero__top">
        <div class="avatar avatar--lg">${esc((state.session.name || '用').slice(0, 1))}</div>
        <div><div class="my-hero__name">${esc(state.session.name)}<span class="my-hero__tag">院内照护会员</span></div><div class="my-hero__phone">${phoneMask(state.session.phone)}</div></div>
      </div>
      <div class="my-stats">
        <button class="my-stat" data-nav="#/orders/all"><b>${orders.length}</b><span>全部订单</span></button>
        <button class="my-stat" data-nav="#/orders/pending"><b>${pending.length}</b><span>待确认</span></button>
        <button class="my-stat" data-nav="#/orders/completed"><b>${completed.length}</b><span>已完成</span></button>
      </div>
    </header>
    <div class="my-body">
      <section class="my-card">
        <div class="my-card__head"><div class="my-card__title">${icon('receipt')}正在进行中的订单</div><button class="my-card__more" data-nav="#/orders/all">查看全部${icon('chevR')}</button></div>
        <div class="my-orders">${active.length ? active.slice(0, 2).map(orderCard).join('') : `<div class="my-empty">${icon('receipt')}<p>暂无进行中的预约</p><button class="btn btn--soft btn--sm" data-nav="#/book">去预约</button></div>`}</div>
      </section>
      <div class="menu">
        <button class="menu__item" data-nav="#/vouchers"><span class="menu__ic">${icon('receipt')}</span>卡券<span class="menu__value">${vouchers} 张可用 ${icon('chevR')}</span></button>
        <button class="menu__item" data-nav="#/privacy"><span class="menu__ic">${icon('shield')}</span>隐私政策<span class="menu__arrow">${icon('chevR')}</span></button>
        <button class="menu__item menu__item--danger" data-act="logout"><span class="menu__ic">${icon('logout')}</span>退出登录<span class="menu__arrow">${icon('chevR')}</span></button>
      </div>
      <a class="my-hotline" href="tel:4008006688">服务热线 400-800-6688</a>
      <div class="my-foot"><b>安颐院内照护</b><br>专业陪护，让家人安心</div>
    </div>`, 'page--tabbar');
  }

  function ordersView(tab = 'all') {
    const tabs = [['all', '全部'], ['pending', '待确认'], ['confirmed', '已预约'], ['completed', '已完成'], ['cancelled', '已取消']];
    let list = state.orders;
    if (tab === 'active') list = list.filter((o) => ['pending', 'accepted', 'serving'].includes(o.status));
    if (tab === 'pending') list = list.filter((o) => o.status === 'pending');
    if (tab === 'confirmed') list = list.filter((o) => ['accepted', 'serving'].includes(o.status));
    if (tab === 'completed') list = list.filter((o) => o.status === 'completed');
    if (tab === 'cancelled') list = list.filter((o) => o.status === 'cancelled');
    const emptyLabel = tab === 'active' ? '进行中' : (tabs.find((t) => t[0] === tab) || ['', ''])[1];
    return page(`${ph('我的订单', { back: '#/my' })}
      <div class="order-tabs">${tabs.map(([k, l]) => `<button class="order-tab ${tab === k ? 'is-on' : ''}" data-nav="#/orders/${k}">${l}</button>`).join('')}</div>
      <div class="appt-list">${list.length ? list.map(orderCard).join('') : `<div class="appt-empty">${icon('receipt')}<p>暂无${emptyLabel}预约</p><button class="btn btn--primary btn--sm" data-nav="#/book">去预约</button></div>`}</div>`, 'page--tabbar');
  }

  function vouchersView(tab = 'all') {
    const tabs = [['all', '全部'], ['unused', '未使用'], ['used', '已使用']];
    const vouchers = allCards();
    const list = vouchers.filter((v) => tab === 'all' || (tab === 'unused' ? v.status !== 'used' : v.status === 'used'));
    return page(`${ph('卡券', { back: '#/my' })}
      <div class="order-tabs voucher-tabs">${tabs.map(([k, l]) => `<button class="order-tab ${tab === k ? 'is-on' : ''}" data-nav="#/vouchers/${k}">${l}</button>`).join('')}</div>
      <div class="voucher-list">${list.map((v) => {
        const used = v.status === 'used';
        const order = used ? state.orders.find((o) => o.id === v.orderId || o.card.cardNum === v.cardNum) : null;
        return `<article class="voucher-item ${used ? 'is-used' : ''}">
          <div class="voucher-item__top"><span class="voucher-item__product">${esc(v.productName)}</span><span class="voucher-tag ${used ? 'is-used' : ''}">${used ? '已使用' : '未使用'}</span></div>
          <div class="voucher-item__type">${esc(v.cardTypeName)}</div>
          <div class="voucher-item__num">券号 ${esc(v.cardNum)}</div>
          <div class="voucher-item__foot"><span>单次使用</span>${used ? `<span>${order ? '订单 ' + esc(order.no) : '已使用'}</span>` : `<button class="voucher-use" data-nav="#/book">去使用${icon('chevR')}</button>`}</div>
        </article>`;
      }).join('') || `<div class="appt-empty">${icon('receipt')}<p>暂无${tab === 'all' ? '' : tabs.find((t) => t[0] === tab)[1]}服务券</p></div>`}</div>
      <div class="voucher-note">${icon('info')} 服务券由后台发放，取消进行中的预约后会自动返还。</div>`);
  }

  function orderDetailView(id) {
    const o = state.orders.find((x) => x.id === id);
    if (!o) return page(`${ph('订单详情', { back: '#/my' })}<div class="empty"><div class="empty__ic">${icon('info')}</div><h3>订单不存在</h3><p>请返回我的预约查看</p><button class="btn btn--primary" data-nav="#/my">返回我的</button></div>`);
    const st = STATUS[o.status] || STATUS.pending;
    const step = o.status === 'pending' ? 2 : ['accepted', 'serving'].includes(o.status) ? 3 : o.status === 'completed' ? 5 : 0;
    const timeline = (o.timeline || []).slice().reverse().map((t, i) => `<div class="tl-item ${i === 0 ? 'is-latest' : ''}"><b>${esc(t.title)}</b><p>${esc(t.desc)}</p><time>${esc(t.time)}</time></div>`).join('');
    const caregiver = o.caregiver ? `<section class="dcard">${dhead('users', 'is-blue', '服务护理员', '已安排')}<div class="caregiver"><div class="avatar">${esc(o.caregiver.name.slice(0, 1))}</div><div class="caregiver__main"><b>${esc(o.caregiver.name)}</b><span>${esc(o.caregiver.level)} · ${o.caregiver.years} 年经验</span></div><div class="caregiver__right"><b>${o.caregiver.rating}</b><span>服务评分</span></div></div></section>` : '';
    return page(`<div class="order-hero">
      <div class="order-hero__nav"><button class="ph__btn" data-nav="#/my" aria-label="返回">${icon('chevL')}</button><span class="order-hero__brand">${icon('hospital')} 院内照护</span></div>
      <div class="order-hero__glass">
        <span class="order-hero__pill">${st.label}</span>
        <h1>${esc(st.title)}</h1>
        <p>${esc(st.desc)}</p>
        <div class="order-hero__meta">${icon('calendar')}${fmtFull(o.startDate)} ${esc(o.startTime)}</div>
        ${flowSteps(step, 'dark')}
      </div>
    </div>
    <div class="order-body">
      ${o.status === 'pending' ? `<div class="dcard dcard--notice">${icon('clock')}<span>预约已收到，照护顾问将审核评估后与您确认服务安排，请保持电话畅通。</span></div>` : ''}
      <section class="dcard">${dhead('clock', 'is-teal', '订单进度', `更新于 ${esc((o.timeline && o.timeline[o.timeline.length - 1].time) || '')}`)}<div class="timeline">${timeline || '<div class="tiny muted">暂无进度</div>'}</div></section>
      <section class="dcard">${dhead('receipt', 'is-gold', '服务券', esc(o.card.cardTypeName))}
        <div class="benefit-mini"><div><b>${esc(o.card.productName)}</b><span>券号 ${esc(o.card.cardNum)}</span></div><div class="benefit-mini__period">单次使用</div></div>
      </section>
      <section class="dcard">${dhead('hospital', 'is-teal', '住院信息')}
        <div class="detail-kv"><span>医院</span><b>${esc(o.hospital)}</b></div>
        <div class="detail-kv"><span>服务城市</span><b>${esc(o.city || '')}</b></div>
        <div class="detail-kv"><span>科室 / 病区</span><b>${esc(o.department)}</b></div>
        ${o.hospitalizedTime ? `<div class="detail-kv"><span>住院日期</span><b>${fmtFull(o.hospitalizedTime)}</b></div>` : ''}
        <div class="detail-kv"><span>入院疾病</span><b style="max-width:230px">${esc(o.disease || '—')}</b></div>
      </section>
      <section class="dcard">${dhead('user', 'is-blue', '护理人信息')}
        <div class="detail-kv"><span>姓名 / 性别</span><b>${esc(o.patient.name)} · ${esc(o.patient.gender)} · ${o.patient.age}岁</b></div>
        <div class="detail-kv"><span>证件</span><b>${esc(idTypeName(o.patient.idType))} ${maskId(o.patient.idNo)}</b></div>
        <div class="detail-kv"><span>出生日期</span><b>${fmtFull(o.patient.birthday)}</b></div>
      </section>
      <section class="dcard">${dhead('clipboard', 'is-violet', '期望服务时间')}
        <div class="detail-kv"><span>服务项目</span><b>院内照护</b></div>
        <div class="detail-kv"><span>期望时间</span><b>${fmtDate(o.startDate)} ${esc(o.startTime)}</b></div>
        <div class="detail-kv"><span>照护需求</span><b style="max-width:230px">${o.needs.map((n) => `<span class="tag tag--blue" style="margin:0 0 4px 4px">${esc(n)}</span>`).join('')}</b></div>
        ${o.note ? `<div class="detail-kv"><span>补充说明</span><b style="max-width:230px">${esc(o.note)}</b></div>` : ''}
      </section>
      ${caregiver}
      <section class="dcard">${dhead('users', 'is-blue', '联系人信息')}
        <div class="detail-kv"><span>姓名</span><b>${esc(o.contact.name)}</b></div>
        <div class="detail-kv"><span>手机号</span><b>${phoneMask(o.contact.mobile || o.contact.phone)}</b></div>
      </section>
      <section class="dcard">${dhead('receipt', 'is-gold', '订单信息')}
        <div class="detail-kv"><span>订单编号</span><b>${esc(o.no)}</b></div>
        <div class="detail-kv"><span>提交时间</span><b>${esc(o.createdAt)}</b></div>
      </section>
      ${['pending', 'accepted'].includes(o.status) ? `<div class="detail-actions">
        <button class="btn btn--ghost" data-act="cancel" data-id="${o.id}">取消预约</button><button class="btn btn--soft" data-act="edit-order" data-id="${o.id}">修改预约</button>
      </div>` : ''}
    </div>`, 'page--tabbar');
  }

  function dhead(iconName, tone, title, aside = '') {
    return `<div class="dcard__head"><div class="dcard__title"><span class="form-card__num ${tone}">${icon(iconName)}</span>${title}</div>${aside ? `<span class="dcard__aside">${aside}</span>` : ''}</div>`;
  }

  function accountView() {
    const joined = D.account.joinedAt;
    return page(`${ph('账户信息', { back: '#/my' })}
      <div class="account-hero"><div class="account-hero__main"><div class="avatar avatar--lg">${esc((state.session.name || '张').slice(0, 1))}</div><div><h1>${esc(state.session.name)}</h1><p>${phoneMask(state.session.phone)} · 院内照护账户</p></div></div></div>
      <div class="account-body">
        <div class="account-card"><div class="account-card__head"><b>登录与身份</b><button class="ph__link" data-act="edit-name">修改姓名</button></div>
          <div class="account-row"><span>姓名</span><b>${esc(state.session.name)}</b></div>
          <div class="account-row"><span>登录手机号</span><b>${phoneMask(state.session.phone)}</b></div>
          <div class="account-row"><span>登录方式</span><b>手机号 + 验证码</b></div>
          <div class="account-row"><span>会员编号</span><b>${esc(D.account.memberNo)}</b></div>
        </div>
        <div class="account-card"><div class="account-card__head"><b>账户状态</b><span class="pill pill--green">正常</span></div>
          <div class="account-row"><span>注册时间</span><b>${fmtFull(joined)}</b></div>
          <div class="account-row"><span>账户类型</span><b>院内照护会员</b></div>
          <div class="account-row"><span>数据范围</span><b>本人及家庭成员</b></div>
        </div>
        <div class="account-card"><div class="account-card__head"><b>安全与隐私</b></div>
          <button class="menu__item" style="padding-left:0;padding-right:0" data-nav="#/privacy"><span class="menu__ic">${icon('shield')}</span>隐私政策<span class="menu__arrow">${icon('chevR')}</span></button>
          <button class="menu__item" style="padding-left:0;padding-right:0;border-bottom:0" data-act="contact"><span class="menu__ic">${icon('headset')}</span>联系客服<span class="menu__arrow">400-800-6688 ${icon('chevR')}</span></button>
        </div>
        <button class="btn btn--ghost btn--block" data-act="logout" style="color:var(--rose);margin-top:2px">${icon('logout')}退出登录</button>
      </div>`);
  }

  function privacyView() {
    return page(`${ph('隐私政策', { back: '#/my' })}
      <div class="privacy">
        <h1>隐私政策</h1>
        <div class="privacy__date">更新日期：2026 年 11 月 12 日 · 生效日期：2026 年 11 月 12 日</div>
        <p>安颐院内照护（以下简称“我们”）深知个人信息对您和家人的重要性。本政策说明我们在提供院内陪护服务过程中如何收集、使用、存储和保护信息。</p>
        <h2>一、我们收集的信息</h2>
        <ul><li>登录信息：手机号、姓名、验证码校验记录。</li><li>服务信息：城市、医院、科室、入院疾病、期望服务时间与照护需求。</li><li>护理人信息：姓名、性别、年龄、证件类型与证件号。</li><li>联系人信息：姓名、手机号。</li><li>订单与服务记录：订单状态、护理员安排、到院服务与服务完成记录。</li></ul>
        <h2>二、信息使用目的</h2>
        <p>用于创建和管理院内照护订单、匹配护理员、照护顾问电话确认、服务交接、订单进度展示、客服处理与安全保障。我们不会将健康相关信息用于与服务无关的营销。</p>
        <h2>三、信息共享</h2>
        <p>仅在提供服务所必需时，向承接服务的护理员、所属机构及照护顾问共享必要的住院信息与照护需求；法律法规另有要求的除外。我们不会出售您的个人信息。</p>
        <h2>四、信息存储与保护</h2>
        <p>信息存储在中华人民共和国境内。我们采用访问控制、传输加密、最小必要授权和操作留痕等措施保护信息。演示版本的数据仅保存在您当前浏览器的本地存储中。</p>
        <h2>五、您的权利</h2>
        <p>您可以查询、更正账户信息，或通过客服申请删除不再需要的订单与个人信息。注销账户后，我们将按法律法规要求处理相关信息。</p>
        <h2>六、未成年人保护</h2>
        <p>本服务面向成年家属为住院长辈提交照护需求。若涉及未成年人信息，请由监护人代为提交并取得授权。</p>
        <h2>七、联系我们</h2>
        <p>如对本政策有任何疑问，可拨打服务热线 400-800-6688（08:00–22:00），或通过「我的 → 账户信息 → 联系客服」与我们联系。</p>
        <div class="privacy__note">${icon('shield')} 本页面为高保真产品原型，隐私政策文本用于演示信息架构，正式上线前需由法务审核并补充完整条款。</div>
      </div>`);
  }

  function cardsView() {
    const cards = allCards();
    const validCount = cards.filter((c) => cardState(c).valid).length;
    return page(`${ph('服务卡与权益', { back: '#/my', right: `<button class="ph__link" data-act="contact">客服</button>` })}
      <div class="account-hero"><div class="account-hero__main"><span class="card-hero-icon">${icon('shield')}</span><div><h1>我的服务卡</h1><p>${validCount} 张可用 · 由易得康同步服务权益</p></div></div></div>
      <div class="account-body">
        <div class="card-list">${cards.map((card) => {
          const st = cardState(card);
          const isDefault = state.defaultCardId === card.id;
          return `<section class="card-item ${st.valid ? '' : 'is-disabled'}">
            <div class="card-item__top"><div><div class="card-item__product">${esc(card.productName)}</div><div class="card-item__type">${esc(card.cardTypeName)} · ${esc(card.productCode)}</div></div><span class="pill pill--${st.tone}">${st.label}</span></div>
            <div class="card-item__num">${maskCard(card.cardNum)}</div>
            <div class="card-item__meta"><span>服务期 ${fmtFull(card.startTime)} – ${fmtFull(card.endTime)}</span><span>持卡人 ${esc(card.mainInsurerName)}</span></div>
            <div class="card-item__foot">${isDefault ? `<span class="tag tag--blue">默认服务卡</span>` : `<button class="link" data-act="set-default-card" data-id="${card.id}">设为默认</button>`}<button class="link" data-act="card-benefit" data-id="${card.id}">查看权益${icon('chevR')}</button></div>
          </section>`;
        }).join('') || `<div class="empty"><div class="empty__ic">${icon('receipt')}</div><h3>暂无服务卡</h3><p>请联系客服或使用激活码绑定服务卡。</p><button class="btn btn--primary" data-act="contact">联系客服</button></div>`}</div>
        <section class="account-card"><div class="account-card__head"><b>权益说明</b></div><div class="account-tip">${icon('info')} 服务卡用于院内陪护服务申请，卡号、持卡人证件与手机号默认脱敏展示；具体服务范围以易得康权益为准。</div></section>
        <button class="btn btn--ghost btn--block" data-act="contact">${icon('headset')}联系客服激活或查询权益</button>
      </div>`);
  }

  function customerView() {
    const p = state.profile.patient;
    const c = state.profile.contact;
    const activeOrders = state.orders.filter((o) => ['pending', 'accepted', 'serving'].includes(o.status));
    return page(`${ph('客户信息', { back: '#/my', right: `<button class="ph__link" data-act="edit-customer">编辑</button>` })}
      <div class="account-hero"><div class="account-hero__main"><div class="avatar avatar--lg">${esc(p.name.slice(0, 1))}</div><div><h1>${esc(p.name)}</h1><p>${esc(c.name)} · ${phoneMask(c.mobile)} · 默认客户档案</p></div></div></div>
      <div class="account-body">
        <section class="account-card"><div class="account-card__head"><b>护理对象</b><button class="ph__link" data-act="edit-patient">编辑</button></div>
          <div class="account-row"><span>姓名 / 性别</span><b>${esc(p.name)} · ${esc(p.gender)}</b></div>
          <div class="account-row"><span>出生日期</span><b>${fmtFull(p.birthday)} · ${calcAge(p.birthday)} 岁</b></div>
          <div class="account-row"><span>证件</span><b>${esc(idTypeName(p.idType))} ${maskId(p.idNo)}</b></div>
          <div class="account-row"><span>手机号</span><b>${phoneMask(p.mobile) || '未填写'}</b></div>
        </section>
        <section class="account-card"><div class="account-card__head"><b>联系人</b><button class="ph__link" data-act="edit-contact">编辑</button></div>
          <div class="account-row"><span>姓名</span><b>${esc(c.name)}</b></div>
          <div class="account-row"><span>手机号</span><b>${phoneMask(c.mobile)}</b></div>
          <div class="account-row"><span>证件</span><b>${c.idNo ? `${esc(idTypeName(c.idType))} ${maskId(c.idNo)}` : '未填写'}</b></div>
        </section>
        <section class="account-card"><div class="account-card__head"><b>常用地址</b></div>
          <div class="account-row"><span>省 / 市 / 区</span><b>${esc(p.province)} ${esc(p.city)} ${esc(p.county)}</b></div>
          <div class="account-row"><span>详细地址</span><b>${esc(p.address) || '未填写'}</b></div>
        </section>
        <section class="account-card"><div class="account-card__head"><b>易得康同步</b><span class="pill pill--green">已同步</span></div>
          <div class="account-tip">${icon('checkC')} 当前档案已用于 ${activeOrders.length} 个进行中预约；修改后将同步至进行中预约（演示）。</div>
        </section>
        <button class="btn btn--primary btn--block" data-act="edit-customer">${icon('edit')}编辑客户信息</button>
      </div>`);
  }

  function openCardSheet() {
    const cards = allCards();
    openSheet(`<div class="sheet__handle"></div><div class="sheet__head"><div><h2>选择服务卡</h2><p>仅可选择有效期内的服务卡</p></div><button class="sheet__close" data-act="close-sheet">${icon('close')}</button></div>
      <div class="sheet-card-list">${cards.map((card) => {
        const st = cardState(card);
        return `<button class="sheet-card ${draft && draft.cardId === card.id ? 'is-on' : ''}" data-act="pick-card" data-id="${card.id}" ${st.valid ? '' : 'disabled'}>
          <div class="sheet-card__main"><b>${esc(card.productName)}</b><span>${esc(card.cardTypeName)} · ${maskCard(card.cardNum)}</span><small>服务期 ${fmtFull(card.startTime)} – ${fmtFull(card.endTime)}</small></div>
          <span class="pill pill--${st.tone}">${st.label}</span>
        </button>`;
      }).join('')}</div>
      <div class="sheet__foot"><button class="btn btn--ghost btn--block" data-act="close-sheet">取消</button></div>`);
  }

  function openCardBenefit(id) {
    const card = getCard(id);
    if (!card) return;
    const st = cardState(card);
    openSheet(`<div class="sheet__handle"></div><div class="sheet__head"><div><h2>服务权益</h2><p>${esc(card.productName)}</p></div><button class="sheet__close" data-act="close-sheet">${icon('close')}</button></div>
      <div class="benefit-detail">
        <div class="benefit-detail__row"><span>卡类型</span><b>${esc(card.cardTypeName)}</b></div>
        <div class="benefit-detail__row"><span>产品编码</span><b>${esc(card.productCode)}</b></div>
        <div class="benefit-detail__row"><span>卡号</span><b>${maskCard(card.cardNum)}</b></div>
        <div class="benefit-detail__row"><span>服务期</span><b>${fmtFull(card.startTime)} – ${fmtFull(card.endTime)}</b></div>
        <div class="benefit-detail__row"><span>使用年限</span><b>${esc(card.dueline)}</b></div>
        <div class="benefit-detail__row"><span>持卡人</span><b>${esc(card.mainInsurerName)}</b></div>
        <div class="benefit-detail__row"><span>权益状态</span><b>${st.label}</b></div>
      </div>
      <div class="account-tip" style="margin-top:12px">${icon('info')} 本卡可用于院内陪护服务申请，具体服务次数、家庭卡使用范围以易得康权益规则为准。</div>
      <div class="sheet__foot"><button class="btn btn--ghost btn--block" data-act="close-sheet">关闭</button></div>`);
  }

  function openCustomerSheet() {
    const p = state.profile.patient;
    const c = state.profile.contact;
    openSheet(`<div class="sheet__handle"></div><div class="sheet__head"><div><h2>编辑客户信息</h2><p>修改后将用于后续院内照护申请，并同步至进行中订单</p></div><button class="sheet__close" data-act="close-sheet">${icon('close')}</button></div>
      <form data-form="customer"><div class="form-section">联系人</div><div class="form-grid">
        <div class="field"><label class="field__label">姓名</label><input class="field__box" id="custContactName" value="${esc(c.name)}" placeholder="联系人姓名"></div>
        <div class="field"><label class="field__label">手机号</label><input class="field__box" id="custContactMobile" type="tel" maxlength="11" value="${esc(c.mobile)}" placeholder="11 位手机号"></div>
        <div class="field"><label class="field__label">证件类型</label><select class="field__box" id="custContactIdType">${D.idTypes.map(([v, n]) => `<option value="${v}" ${String(c.idType) === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
        <div class="field"><label class="field__label">证件号</label><input class="field__box" id="custContactIdNo" value="${esc(c.idNo)}" placeholder="选填"></div>
      </div>
      <div class="form-section" style="margin-top:14px">护理对象</div><div class="form-grid">
        <div class="field"><label class="field__label">姓名</label><input class="field__box" id="custName" value="${esc(p.name)}" placeholder="护理对象姓名"></div>
        <div class="field"><label class="field__label">性别</label><select class="field__box" id="custGender"><option ${p.gender === '女' ? 'selected' : ''}>女</option><option ${p.gender === '男' ? 'selected' : ''}>男</option><option ${p.gender === '不详' ? 'selected' : ''}>不详</option></select></div>
        <div class="field"><label class="field__label">证件类型</label><select class="field__box" id="custIdType">${D.idTypes.map(([v, n]) => `<option value="${v}" ${String(p.idType) === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
        <div class="field"><label class="field__label">证件号</label><input class="field__box" id="custIdNo" value="${esc(p.idNo)}" placeholder="证件号码"></div>
        <div class="field"><label class="field__label">出生日期</label><input class="field__box" id="custBirthday" type="date" value="${esc(p.birthday)}"></div>
        <div class="field"><label class="field__label">手机号</label><input class="field__box" id="custMobile" type="tel" maxlength="11" value="${esc(p.mobile)}" placeholder="选填"></div>
        <div class="field"><label class="field__label">省</label><input class="field__box" id="custProvince" value="${esc(p.province)}" placeholder="省 / 直辖市"></div>
        <div class="field"><label class="field__label">市</label><input class="field__box" id="custCity" value="${esc(p.city)}" placeholder="城市"></div>
        <div class="field"><label class="field__label">区 / 县</label><input class="field__box" id="custCounty" value="${esc(p.county)}" placeholder="区 / 县"></div>
        <div class="field"><label class="field__label">详细地址</label><input class="field__box" id="custAddress" value="${esc(p.address)}" placeholder="街道、门牌"></div>
      </div>
      <div class="sheet__foot"><button type="button" class="btn btn--ghost" data-act="close-sheet">取消</button><button class="btn btn--primary" type="submit">保存并同步</button></div></form>`);
  }

  /* ---------------- sheets ---------------- */
  function openSheet(content) {
    const root = $('#modal-root');
    root.innerHTML = `<div class="sheet-mask" data-act="close-sheet"><div class="sheet" role="dialog" aria-modal="true">${content}</div></div>`;
    document.body.classList.add('no-scroll');
  }
  function closeSheet() {
    $('#modal-root').innerHTML = '';
    document.body.classList.remove('no-scroll');
  }
  function privacySheet() {
    openSheet(`<div class="sheet__handle"></div><div class="sheet__head"><div><h2>隐私政策</h2><p>我们如何收集和使用您的信息</p></div><button class="sheet__close" data-act="close-sheet">${icon('close')}</button></div>
      <div class="sheet__body"><p>我们仅收集完成院内照护服务所必需的信息，包括登录手机号、住院信息、照护对象信息与联系人信息，用于订单创建、护理员匹配、顾问确认和服务交接。</p><p style="margin-top:8px">信息不会用于无关营销，不会出售给第三方。演示版本的数据仅保存在当前浏览器本地。您可以通过「我的 → 隐私政策」查看完整条款。</p></div>
      <div class="sheet__foot"><button class="btn btn--primary btn--block" data-act="close-sheet">我知道了</button></div>`);
  }
  function logoutSheet() {
    openSheet(`<div class="sheet__handle"></div><div class="sheet__head"><div><h2>退出登录</h2><p>退出后需要重新登录才能提交需求和查看订单。</p></div><button class="sheet__close" data-act="close-sheet">${icon('close')}</button></div>
      <div class="sheet__body"><div class="avatar logout-avatar">${esc((state.session.name || '张').slice(0, 1))}</div><b style="font-size:12px">${esc(state.session.name)}</b><div class="tiny muted" style="margin-top:3px">${phoneMask(state.session.phone)}</div></div>
      <div class="sheet__foot"><button class="btn btn--ghost" data-act="close-sheet">取消</button><button class="btn btn--primary" style="background:linear-gradient(120deg,#DE5B70,#EC8292);box-shadow:none" data-act="confirm-logout">退出登录</button></div>`);
  }
  function contactSheet() {
    openSheet(`<div class="sheet__handle"></div><div class="sheet__head"><div><h2>联系照护顾问</h2><p>服务时间 08:00–22:00</p></div><button class="sheet__close" data-act="close-sheet">${icon('close')}</button></div>
      <div class="sheet__body"><p>如需修改住院信息、服务时间或照护需求，可直接拨打服务热线，我们会尽快为您协调。</p><a class="btn btn--primary btn--block" style="margin-top:12px" href="tel:4008006688">${icon('phone')}拨打 400-800-6688</a></div>
      <div class="sheet__foot"><button class="btn btn--ghost btn--block" data-act="close-sheet">稍后联系</button></div>`);
  }
  function cancelSheet(id) {
    openSheet(`<div class="sheet__handle"></div><div class="sheet__head"><div><h2>取消预约</h2><p>取消后如需服务，需要重新提交预约。</p></div><button class="sheet__close" data-act="close-sheet">${icon('close')}</button></div>
      <div class="sheet__body"><p>照护顾问可能已经与您联系，取消前请确认不再需要本次陪护服务。</p></div>
      <div class="sheet__foot"><button class="btn btn--ghost" data-act="close-sheet">保留预约</button><button class="btn btn--primary" style="background:linear-gradient(120deg,#DE5B70,#EC8292);box-shadow:none" data-act="confirm-cancel" data-id="${id}">确认取消</button></div>`);
  }
  function editNameSheet() {
    openSheet(`<div class="sheet__handle"></div><div class="sheet__head"><div><h2>修改姓名</h2><p>姓名将用于照护顾问联系与服务确认。</p></div><button class="sheet__close" data-act="close-sheet">${icon('close')}</button></div>
      <form data-form="name"><div class="field"><label class="field__label">姓名</label><input class="field__box" id="edit-name" value="${esc(state.session.name)}" maxlength="20" placeholder="请输入姓名"></div><div class="sheet__foot"><button type="button" class="btn btn--ghost" data-act="close-sheet">取消</button><button class="btn btn--primary" type="submit">保存</button></div></form>`);
  }

  /* ---------------- router ---------------- */
  function parse() {
    let h = location.hash.replace(/^#/, '');
    if (!h) h = '/';
    const [path, q] = h.split('?');
    return { parts: path.split('/').filter(Boolean), query: new URLSearchParams(q || '') };
  }
  function go(hash) {
    const next = hash.startsWith('#') ? hash : '#' + hash;
    if (editingOrderId && next !== '#/book') { editingOrderId = null; draft = null; }
    if (location.hash === next) render();
    else location.hash = next;
  }
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('is-on'), 2200);
  }

  function render() {
    const { parts } = parse();
    let p = parts[0] || '';
    if (!state.session && p !== 'login') { location.hash = '#/login'; return; }
    if (state.session && p === 'login') { location.hash = '#/book'; return; }

    let html;
    if (p === 'login') html = loginView();
    else if (p === 'book' || p === 'request' || !p) html = requestView();
    else if (p === 'my') html = myView();
    else if (p === 'orders') html = ordersView(parts[1] || 'all');
    else if (p === 'order') html = orderDetailView(parts[1]);
    else if (p === 'success') { location.hash = '#/orders'; return; }
    else if (p === 'account') html = accountView();
    else if (p === 'cards') { location.hash = '#/vouchers'; return; }
    else if (p === 'vouchers') html = vouchersView(parts[1] || 'all');
    else if (p === 'customer') { location.hash = '#/my'; return; }
    else if (p === 'privacy') html = privacyView();
    else html = requestView();

    $('#view').innerHTML = html;
    const tabbar = $('#tabbar');
    const showTab = ['book', 'request', 'my', 'orders', 'order'].includes(p);
    tabbar.hidden = !showTab;
    tabbar.innerHTML = showTab ? `<button class="tabbar__item ${p === 'book' || p === 'request' ? 'is-on' : ''}" data-nav="#/book">${icon('hospital')}<span>服务预约</span></button><button class="tabbar__item ${p !== 'book' && p !== 'request' ? 'is-on' : ''}" data-nav="#/my">${icon('receipt')}<span>我的</span></button>` : '';
    document.title = p === 'login' ? '登录 · 安颐院内照护' : p === 'my' ? '我的 · 安颐院内照护' : p === 'book' ? '服务预约 · 安颐院内照护' : p === 'orders' ? '我的订单 · 安颐院内照护' : '院内照护 · 安颐照护';
    window.scrollTo(0, 0);
    requestAnimationFrame(updateRequestBar);
  }

  /* ---------------- validation / submit ---------------- */
  function markError(input, error) {
    const field = input.closest('.field');
    if (field) field.classList.add('field--error');
    const err = field && field.querySelector('.field__err');
    if (err && error) err.textContent = error;
    return field;
  }
  function clearErrors(form) {
    $$('.field--error', form).forEach((f) => f.classList.remove('field--error'));
    $$('.field__err', form).forEach((e) => { if (e.dataset.keep) e.style.display = 'none'; });
    $('#agree-row')?.classList.remove('agree--error');
    $('#service-err') && ($('#service-err').style.display = 'none');
    $('#needs-err') && ($('#needs-err').style.display = 'none');
  }

  function submitRequest(form) {
    clearErrors(form);
    const isEditing = !!editingOrderId;
    const current = isEditing ? getCard(draft.cardId) : null;
    const card = current || unusedVouchers()[0] || null;
    const hospital = $('#hospital').value;
    const city = $('#city').value;
    const department = $('#department').value;
    const hospitalizedTime = $('#hospitalizedTime').value;
    const disease = $('#disease').value.trim();
    const serviceTime = $('#serviceTime').value;
    const [startDate, startTime] = serviceTime ? serviceTime.split('T') : ['', ''];
    const patientName = $('#patientName').value.trim();
    const patientBirthday = $('#birthday').value;
    const patientAge = calcAge(patientBirthday);
    const patientGender = draft.patient.gender;
    const patientIdType = $('#patientIdType').value;
    const patientIdNo = $('#patientIdNo').value.trim();
    const contactName = $('#contactName').value.trim();
    const contactPhone = $('#contactPhone').value.trim();
    const note = $('#note').value.trim();

    let first = null;
    const fail = (input, msg) => { const f = markError(input, msg); if (!first) first = f || input; };
    if (!card) {
      toast('暂无可用服务券');
      first = $('#card-strip');
    } else if (!isEditing && card.status === 'used') {
      toast('该服务券已使用，请选择其他服务券');
      first = $('#card-strip');
    }
    if (!city) fail($('#city'), '请选择城市');
    if (!hospital) fail($('#hospital'), '请选择医院');
    if (!(D.hospitalMeta[hospital] || {}).code) fail($('#hospital'), '该医院暂未配置服务编码，请选择其他医院');
    if (!department) fail($('#department'), '请选择科室');
    if (!disease) fail($('#disease'), '请填写入院疾病或诊断');
    if (!serviceTime || startDate < todayISO()) fail($('#serviceTime'), '请选择今天或之后的期望服务时间');
    if (!patientName) fail($('#patientName'), '请填写护理人姓名');
    if (!['女', '男'].includes(patientGender)) fail($('#patientName'), '请选择护理人性别');
    if (!patientBirthday) fail($('#birthday'), '请填写出生日期');
    if (!patientIdNo) fail($('#patientIdNo'), '请填写证件号码');
    if (patientIdType === '1' && patientIdNo && !/^\d{17}[\dXx]$/.test(patientIdNo)) fail($('#patientIdNo'), '身份证号格式不正确');
    if (!contactName) fail($('#contactName'), '请填写联系人姓名');
    if (!/^1[3-9]\d{9}$/.test(contactPhone)) fail($('#contactPhone'), '请填写正确的 11 位手机号');
    if (!draft.needs.length) { $('#needs-err').style.display = 'block'; if (!first) first = $('#needs'); }
    if (!draft.agree) { $('#agree-row').classList.add('agree--error'); if (!first) first = $('#agree-row'); }
    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast('请补充带 * 的必填信息');
      return;
    }

    const meta = D.hospitalMeta[hospital] || {};
    const seq = state.seq++;
    const now = nowText();
    const order = {
      id: 'h-' + Date.now(),
      no: 'AYH' + todayISO().replace(/-/g, '') + String(seq).padStart(3, '0'),
      hospital, hospitalCode: meta.code, city,
      department, bed: '', hospitalNo: '', hospitalizedTime, disease,
      serviceType: '院内照护',
      serviceId: 'hospital',
      startDate, startTime,
      card: {
        cardNum: card.cardNum, cardType: card.cardType, cardTypeName: card.cardTypeName,
        productName: card.productName, productCode: card.productCode
      },
      voucherId: card.id,
      patient: {
        name: patientName, gender: patientGender, idType: patientIdType, idNo: patientIdNo,
        birthday: patientBirthday, age: patientAge, mobile: '', province: '', city: '', county: '', address: '', selfCare: ''
      },
      needs: [...draft.needs],
      contact: { name: contactName, mobile: contactPhone, phone: contactPhone },
      emergency: { name: '', phone: '' },
      note,
      status: 'pending',
      syncStatus: 'success',
      syncedAt: now,
      caregiver: null,
      createdAt: now,
      timeline: [{ title: '预约已提交', desc: '照护顾问将审核评估后确认服务安排', time: mdText(now) }]
    };

    if (isEditing) {
      const ex = state.orders.find((x) => x.id === editingOrderId);
      if (ex) {
        const old = { id: ex.id, no: ex.no, createdAt: ex.createdAt, timeline: ex.timeline || [] };
        Object.assign(ex, order, { id: old.id, no: old.no, createdAt: old.createdAt, status: 'pending', caregiver: null });
        ex.timeline = [...old.timeline, { title: '预约已修改', desc: '修改后的预约等待照护顾问评估确认', time: mdText(now) }];
        save();
        editingOrderId = null;
        draft = null;
        go('/order/' + ex.id);
        toast('预约已修改，等待评估确认');
        return;
      }
    }

    card.status = 'used';
    card.orderId = order.id;
    state.orders.unshift(order);
    save();
    draft = null;
    go('/order/' + order.id);
    toast('预约已提交，照护顾问将审核评估');
  }

  /* ---------------- events ---------------- */
  let codeTimer = null;
  let codeLeft = 0;
  function startCodeCountdown() {
    clearInterval(codeTimer);
    codeLeft = 60;
    const tick = () => {
      const btn = $('#send-code');
      if (!btn) { clearInterval(codeTimer); return; }
      if (codeLeft <= 0) {
        clearInterval(codeTimer);
        btn.disabled = false;
        btn.textContent = '获取验证码';
        return;
      }
      btn.disabled = true;
      btn.textContent = `${codeLeft}s 后重试`;
      codeLeft -= 1;
    };
    tick();
    codeTimer = setInterval(tick, 1000);
  }

  function updateRequestBar() {
    const bar = $('.request-actionbar');
    if (!bar) return;
    const doc = document.documentElement;
    const atBottom = window.scrollY + window.innerHeight >= doc.scrollHeight - 12;
    bar.classList.toggle('is-visible', atBottom);
  }
  window.addEventListener('scroll', updateRequestBar, { passive: true });
  window.addEventListener('resize', updateRequestBar);

  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav && !nav.closest('form')) {
      e.preventDefault();
      go(nav.dataset.nav);
      return;
    }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (act === 'send-code') {
      const phone = $('#login-phone').value.trim();
      if (!/^\d{11}$/.test(phone)) { toast('请输入 11 位手机号'); $('#login-phone').focus(); return; }
      startCodeCountdown();
      toast('验证码已发送，输入任意 6 位数字即可登录');
      return;
    }
    if (act === 'login-back') {
      if (history.length > 1) history.back();
      else toast('请先登录');
      return;
    }
    if (act === 'toggle-login-agree') {
      state.loginAgree = !state.loginAgree;
      save();
      el.classList.toggle('is-on', state.loginAgree);
      const box = el.querySelector('.login-protocol__box');
      if (box) box.innerHTML = state.loginAgree ? icon('check') : '';
      return;
    }
    if (act === 'open-privacy') {
      e.preventDefault();
      privacySheet();
      return;
    }
    if (act === 'close-sheet') {
      closeSheet();
      return;
    }
    if (act === 'service') {
      draft.serviceId = el.dataset.id;
      $$('.service-opt').forEach((b) => b.classList.toggle('is-on', b.dataset.id === draft.serviceId));
      $('#service-err').style.display = 'none';
      return;
    }
    if (act === 'pick-date') {
      draft.startDate = el.dataset.date;
      const hidden = $('#startDate');
      if (hidden) hidden.value = draft.startDate;
      $$('.date-chip').forEach((b) => b.classList.toggle('is-on', b.dataset.date === draft.startDate));
      return;
    }
    if (act === 'edit-order') { editOrder(el.dataset.id); return; }
    if (act === 'rebook') { rebookOrder(el.dataset.id); return; }
    if (act === 'choose-card') { openCardSheet(); return; }
    if (act === 'pick-card') {
      const card = getCard(el.dataset.id);
      if (!card || !cardState(card).valid) { toast('该服务卡当前不可用'); return; }
      draft.cardId = card.id;
      const strip = $('#card-strip');
      if (strip) strip.innerHTML = cardStripHtml(card);
      closeSheet();
      toast('已切换服务卡');
      return;
    }
    if (act === 'set-default-card') {
      const card = getCard(el.dataset.id);
      if (!card) return;
      state.defaultCardId = card.id;
      save();
      render();
      toast('已设为默认服务卡');
      return;
    }
    if (act === 'card-benefit') { openCardBenefit(el.dataset.id); return; }
    if (act === 'edit-customer') { openCustomerSheet(); return; }
    if (act === 'edit-contact') { openCustomerSheet('contact'); return; }
    if (act === 'edit-patient') { openCustomerSheet('patient'); return; }
    if (act === 'need') {
      const v = el.dataset.value;
      if (draft.needs.includes(v)) draft.needs = draft.needs.filter((x) => x !== v);
      else draft.needs.push(v);
      const selected = draft.needs.includes(v);
      el.classList.toggle('is-on', selected);
      const check = el.querySelector('.need-opt__check');
      if (check) check.innerHTML = selected ? icon('check') : '';
      const count = $('#needs-count');
      if (count) count.textContent = `已选 ${draft.needs.length} 项`;
      if (draft.needs.length) $('#needs-err').style.display = 'none';
      return;
    }
    if (act === 'days') {
      const step = Number(el.dataset.step);
      draft.days = Math.max(1, Math.min(30, draft.days + step));
      $('#days-value').textContent = draft.days + ' 天';
      const buttons = $$('[data-act="days"]');
      buttons[0].disabled = draft.days <= 1;
      buttons[1].disabled = draft.days >= 30;
      return;
    }
    if (act === 'quick-date') {
      const date = el.dataset.date;
      const input = $('#serviceTime');
      const time = input && input.value.includes('T') ? input.value.split('T')[1] : (draft.startTime || '09:00');
      draft.startDate = date;
      if (input) input.value = date + 'T' + time;
      $$('.quick-date').forEach((b) => b.classList.toggle('is-on', b.dataset.date === date));
      return;
    }
    if (act === 'gender') {
      draft.patient.gender = el.dataset.value;
      $$('[data-act="gender"]').forEach((b) => b.classList.toggle('is-on', b.dataset.value === draft.patient.gender));
      return;
    }
    if (act === 'toggle-agree') {
      draft.agree = !draft.agree;
      el.classList.toggle('is-on', draft.agree);
      el.classList.remove('agree--error');
      return;
    }
    if (act === 'logout') { logoutSheet(); return; }
    if (act === 'confirm-logout') {
      state.session = null;
      save();
      draft = null;
      clearInterval(codeTimer);
      closeSheet();
      go('/login');
      return;
    }
    if (act === 'contact') { contactSheet(); return; }
    if (act === 'cancel') { cancelSheet(el.dataset.id); return; }
    if (act === 'confirm-cancel') {
      const o = state.orders.find((x) => x.id === el.dataset.id);
      if (o) {
        o.status = 'cancelled';
        o.timeline.push({ title: '预约已取消', desc: '家属取消本次院内照护预约', time: mdText(nowText()) });
        const v = state.vouchers.find((x) => x.id === o.voucherId) || state.vouchers.find((x) => x.cardNum === o.card.cardNum);
        if (v) { v.status = 'unused'; v.orderId = null; }
        save();
      }
      closeSheet();
      render();
      toast('预约已取消，服务券已返还');
      return;
    }
    if (act === 'edit-name') { editNameSheet(); return; }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'city') {
      const city = e.target.value;
      const hospitals = D.hospitals.filter((h) => (D.hospitalMeta[h] || {}).city === city);
      const sel = $('#hospital');
      if (sel) sel.innerHTML = hospitals.map((h) => `<option>${esc(h)}</option>`).join('');
      draft.city = city;
      draft.hospital = hospitals[0] || '';
      return;
    }
    if (e.target.id === 'hospital') {
      draft.hospital = e.target.value;
      return;
    }
    if (e.target.id === 'serviceTime' && e.target.value) {
      const [d, t] = e.target.value.split('T');
      draft.startDate = d;
      draft.startTime = t;
      return;
    }
    if (e.target.id === 'birthday') {
      const hint = $('#age-hint');
      const age = calcAge(e.target.value);
      if (hint) hint.textContent = age ? `${age} 岁` : '';
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'patientIdNo') {
      const id = e.target.value.trim();
      const type = $('#patientIdType') ? $('#patientIdType').value : '1';
      if (type === '1' && /^\d{17}[\dXx]$/.test(id)) {
        const birth = `${id.slice(6, 10)}-${id.slice(10, 12)}-${id.slice(12, 14)}`;
        const gender = Number(id.slice(16, 17)) % 2 ? '男' : '女';
        const bEl = $('#birthday');
        if (bEl) bEl.value = birth;
        draft.patient.gender = gender;
        $$('[data-act="gender"]').forEach((b) => b.classList.toggle('is-on', b.dataset.value === gender));
        const hint = $('#age-hint');
        const age = calcAge(birth);
        if (hint) hint.textContent = age ? `${age} 岁` : '';
      }
    }
    if (e.target.id === 'birthday') {
      const hint = $('#age-hint');
      const age = calcAge(e.target.value);
      if (hint) hint.textContent = age ? `${age} 岁` : '';
    }
  });

  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (form.dataset.form === 'login') {
      e.preventDefault();
      const phone = $('#login-phone').value.trim();
      const code = $('#login-code').value.trim();
      if (!/^\d{11}$/.test(phone)) { toast('请输入 11 位手机号'); $('#login-phone').focus(); return; }
      if (!/^\d{6}$/.test(code)) { toast('请输入 6 位验证码'); $('#login-code').focus(); return; }
      if (!state.loginAgree) { toast('请先阅读并同意用户服务协议与隐私协议'); return; }
      const name = phone === D.account.phone ? D.account.name : '用户' + phone.slice(-4);
      state.session = { phone, name, loginAt: Date.now() };
      save();
      draft = null;
      clearInterval(codeTimer);
      go('/book');
      return;
    }
    if (form.id === 'request-form') {
      e.preventDefault();
      submitRequest(form);
      return;
    }
    if (form.dataset.form === 'customer') {
      e.preventDefault();
      const contact = {
        name: $('#custContactName').value.trim(),
        mobile: $('#custContactMobile').value.trim(),
        idType: $('#custContactIdType').value,
        idNo: $('#custContactIdNo').value.trim()
      };
      const patient = {
        name: $('#custName').value.trim(),
        gender: $('#custGender').value,
        idType: $('#custIdType').value,
        idNo: $('#custIdNo').value.trim(),
        birthday: $('#custBirthday').value,
        mobile: $('#custMobile').value.trim(),
        province: $('#custProvince').value.trim(),
        city: $('#custCity').value.trim(),
        county: $('#custCounty').value.trim(),
        address: $('#custAddress').value.trim(),
        selfCare: state.profile.patient.selfCare || '半自理'
      };
      if (!contact.name) { toast('请填写联系人姓名'); return; }
      if (!/^1[3-9]\d{9}$/.test(contact.mobile)) { toast('联系人手机号格式不正确'); return; }
      if (!patient.name) { toast('请填写护理对象姓名'); return; }
      if (!patient.idNo) { toast('请填写护理对象证件号'); return; }
      if (patient.idType === '1' && !/^\d{17}[\dXx]$/.test(patient.idNo)) { toast('护理对象身份证号格式不正确'); return; }
      if (!patient.birthday) { toast('请填写护理对象出生日期'); return; }
      if (!patient.city) { toast('请填写护理对象所在城市'); return; }
      if (patient.mobile && !/^1[3-9]\d{9}$/.test(patient.mobile)) { toast('护理对象手机号格式不正确'); return; }
      patient.age = calcAge(patient.birthday);
      state.profile = { contact, patient };
      const active = state.orders.filter((o) => ['pending', 'accepted', 'serving'].includes(o.status));
      active.forEach((o) => {
        o.patient = { ...patient };
        o.contact = { ...contact, phone: contact.mobile };
        o.syncStatus = 'success';
        o.syncedAt = nowText();
      });
      save();
      draft = null;
      closeSheet();
      render();
      toast(active.length ? `已保存并同步 ${active.length} 个进行中订单` : '客户信息已保存');
      return;
    }
    if (form.dataset.form === 'name') {
      e.preventDefault();
      const name = $('#edit-name').value.trim();
      if (!name) { toast('请输入姓名'); return; }
      state.session.name = name;
      save();
      closeSheet();
      render();
      toast('姓名已更新');
    }
  });

  window.addEventListener('hashchange', render);
  render();
  window.__HOSPITAL__ = { state, save, render, go };
})();
