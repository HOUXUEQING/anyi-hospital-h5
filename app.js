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
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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
      const oVoucher = s.vouchers.find((x) => x.id === o.voucherId);
      if (oVoucher) {
        o.card.startTime = o.card.startTime || oVoucher.startTime;
        o.card.endTime = o.card.endTime || oVoucher.endTime;
      }
      if (!o.city) o.city = (D.hospitalMeta[o.hospital] || {}).city || '';
      if (!o.hospitalCode) o.hospitalCode = (D.hospitalMeta[o.hospital] || {}).code || '';
      if (!o.disease) o.disease = '—';
      if (!o.patient.idType) o.patient = { ...s.profile.patient, ...o.patient };
      if (!o.contact.idType) o.contact = { ...s.profile.contact, ...o.contact };
      if (!o.syncStatus) o.syncStatus = 'success';
      if (!Array.isArray(o.materials)) o.materials = [];
      if (!o.staffGender) o.staffGender = '随机分配';
      if (o.caregiver) {
        const seed = D.seedOrders.find((x) => x.id === o.id || (x.caregiver && x.caregiver.name === o.caregiver.name));
        if (seed && seed.caregiver) {
          ['gender', 'age', 'phone'].forEach((k) => {
            if ((o.caregiver[k] == null || o.caregiver[k] === '' || o.caregiver[k] === '—') && seed.caregiver[k] != null) o.caregiver[k] = seed.caregiver[k];
          });
        }
      }
      o.timeline = (o.timeline || []).map((t) => {
        const title = String(t.title || '');
        if (/服务申请已提交|需求已提交|预约已提交/.test(title)) return { ...t, title: '服务申请已提交', desc: '照护顾问已收到院内照护需求，待评估后安排' };
        if (/服务评估完成|护理员已接单|护理员已安排/.test(title)) {
          const desc = o.caregiver && !String(t.desc || '').includes('·') ? `${o.caregiver.name} · ${o.caregiver.level}` : t.desc;
          return { ...t, title: '服务评估完成，已安排护理员', desc };
        }
        if (title === '服务开始') return { ...t, title: '服务开始', desc: '护理员已到院签到，照护开始' };
        if (title === '服务完成') return { ...t, title: '服务完成', desc: '照护结束，服务完成' };
        if (title === '预约已修改') return { ...t, title: '服务申请已修改', desc: '修改后的服务申请等待照护顾问评估确认' };
        if (title === '预约已取消') return { ...t, title: '服务申请已取消', desc: '家属取消本次院内照护服务申请' };
        return t;
      });
      if (o.caregiver && o.caregiver.name === '王秀兰') {
        o.caregiver.name = '王建国';
        o.caregiver.gender = '男';
        o.timeline = (o.timeline || []).map((t) => t.desc ? { ...t, desc: String(t.desc).replaceAll('王秀兰', '王建国') } : t);
      }
    });
    s.vouchers.forEach((v) => {
      const active = s.orders.find((o) => o.voucherId === v.id && o.status !== 'cancelled');
      if (active) { v.status = 'used'; v.orderId = active.id; }
      else { v.status = 'unused'; v.orderId = null; }
    });
    const withSec = (t) => {
      if (!t) return t;
      return /^\d{2}-\d{2} \d{2}:\d{2}$/.test(t) || /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(t) ? t + ':00' : t;
    };
    s.orders.forEach((o) => {
      o.createdAt = withSec(o.createdAt);
      o.completedAt = withSec(o.completedAt);
      (o.timeline || []).forEach((t) => { t.time = withSec(t.time); });
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
  const quotaStats = () => { const list = allCards(); const used = list.filter((c) => c.status === 'used').length; return { total: list.length, used, remaining: list.length - used }; };
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
    serving: { label: '服务中', tone: 'blue', title: '服务进行中', desc: '护理员正在院内照护，服务记录会持续更新' },
    completed: { label: '已完成', tone: 'green', title: '本次陪护已完成', desc: '感谢您的信任，期待再次为您服务' },
    cancelled: { label: '已取消', tone: 'gray', title: '预约已取消', desc: '如仍需院内陪护，可重新提交预约' }
  };
  function apptStatus(o) {
    if (o.status === 'pending') return { label: '待确认', tone: 'blue' };
    if (o.status === 'accepted') return { label: '已预约', tone: 'blue' };
    if (o.status === 'serving') return { label: '服务中', tone: 'blue' };
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

  const avatarNeutral = () => `<img class="avatar-art" src="assets/avatar-default.jpg" alt="">`;
  const avatarFemale = () => `<img class="avatar-art" src="assets/avatar-female.jpg" alt="">`;
  const avatarMale = () => `<img class="avatar-art" src="assets/avatar-male.jpg" alt="">`;
  const caregiverAvatar = (gender) => String(gender || '').includes('男') ? avatarMale() : (String(gender || '').includes('女') ? avatarFemale() : avatarNeutral());
  function ph(title, { back = '#/my', right = '', sub = '' } = {}) {
    return `<div class="float-back-row">${back ? `<button class="float-back" data-nav="${back}" aria-label="返回">${icon('chevL')}</button>` : ''}<span class="sr-only">${esc(title)}</span></div>`;
  }
  function titlebar(title, back = '') {
    if (!back) return `<span class="sr-only">${esc(title)}</span>`;
    return `<div class="float-back-row"><button class="float-back" data-nav="${back}" aria-label="返回">${icon('chevL')}</button><span class="sr-only">${esc(title)}</span></div>`;
  }
  function loginView() {
    state.loginAgree = false;
    return page(`<div class="login-page">
      <button class="float-back login-float" type="button" data-act="login-back" aria-label="返回">${icon('chevL')}</button><span class="sr-only">登录注册</span>
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
      staffGender: '随机分配',
      materials: [],
      contact: { name: c.name, mobile: c.mobile || (state.session ? state.session.phone : D.account.phone), phone: c.mobile || (state.session ? state.session.phone : D.account.phone) },
      emergency: { name: '', phone: '' },
      note: '',
      agree: false
    };
  }
  let draft = null;
  let editingOrderId = null;
  let materialEdit = null;
  let cityPick = null;

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
      staffGender: o.staffGender || '随机分配',
      materials: [...(o.materials || [])],
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
    if (!unusedVouchers().length) { toast('使用额度已用完，暂不可预约'); go('/book'); return; }
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
      <div class="benefit-card__type">${card.startTime && card.endTime ? `有效期 ${fmtFull(card.startTime)} – ${fmtFull(card.endTime)}` : ''}</div>
      <div class="benefit-card__num">券号 ${esc(card.cardNum)}</div>
      <div class="benefit-card__foot"><span>单次使用</span><span>使用人 ${esc(card.mainInsurerName)}</span></div>
    </div>`;
  }

  function formatSize(n) {
    if (!n) return '0 KB';
    return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
  }
  const materialTypes = () => D.materialTypes || ['其他就医材料'];
  function guessMaterialType(name = '') {
    if (/住院|申请单|凭证/.test(name)) return '住院申请单 / 住院凭证';
    if (/病历|出院|入院记录/.test(name)) return '病历资料';
    if (/检查|报告|CT|核磁|超声|化验/.test(name)) return '检查报告';
    if (/床头卡/.test(name)) return '床头卡';
    if (/手环/.test(name)) return '手环';
    return '其他就医材料';
  }
  function materialTiles(list = [], orderId = '') {
    return list.map((m) => {
      const isImg = m.dataUrl && String(m.mime || '').startsWith('image/');
      return `<div class="material-item"><button class="material-thumb" type="button" data-act="view-material" data-id="${esc(m.id)}" data-order="${esc(orderId)}">${isImg ? `<img src="${m.dataUrl}" alt="">` : icon('file')}</button><div class="material-main"><b>${esc(m.name)}</b><span>${esc(m.type)} · ${formatSize(m.size)}</span><span class="material-time">上传于 ${esc(String(m.uploadedAt || '').slice(5))}</span></div><div class="material-actions"><button type="button" data-act="edit-material" data-id="${esc(m.id)}" data-order="${esc(orderId)}">编辑</button><button type="button" class="is-danger" data-act="delete-material" data-id="${esc(m.id)}" data-order="${esc(orderId)}">删除</button></div></div>`;
    }).join('');
  }
  function renderMaterials() {
    const box = $('#material-list');
    if (box) box.innerHTML = materialTiles(draft?.materials || []);
    const count = $('#material-count');
    if (count) count.textContent = `${(draft?.materials || []).length} 份`;
  }

  function findMaterial(id, orderId = '') {
    if (orderId) {
      const o = state.orders.find((x) => x.id === orderId);
      return { m: (o?.materials || []).find((x) => x.id === id), o };
    }
    return { m: (draft?.materials || []).find((x) => x.id === id), o: null };
  }
  function openMaterialView(id, orderId = '') {
    const { m } = findMaterial(id, orderId);
    if (!m) return;
    const isImg = m.dataUrl && String(m.mime || '').startsWith('image/');
    openSheet(`<div class="sheet__handle"></div><div class="sheet__head"><div><h2>${esc(m.name)}</h2><p>${esc(m.type)} · ${formatSize(m.size)}</p></div><button class="sheet__close" data-act="close-sheet">${icon('close')}</button></div>
      <div class="sheet__body">${isImg ? `<img class="material-preview" src="${m.dataUrl}" alt="${esc(m.name)}">` : `<div class="material-file-preview">${icon('file')}<b>${esc(m.name)}</b><span>${formatSize(m.size)}</span></div>`}${m.dataUrl ? `<a class="material-download" href="${m.dataUrl}" download="${esc(m.name)}">下载/打开文件</a>` : ''}<p class="tiny muted" style="margin-top:8px">上传时间 ${esc(m.uploadedAt || '')}</p></div>`);
  }
  function openMaterialSheet(id, orderId = '') {
    const { m } = findMaterial(id, orderId);
    if (!m) return;
    materialEdit = { id, orderId };
    openSheet(`<div class="sheet__handle"></div><div class="sheet__head"><div><h2>编辑材料</h2><p>修改材料名称或类型</p></div><button class="sheet__close" data-act="close-sheet">${icon('close')}</button></div>
      <div class="sheet__body"><div class="field"><label class="field__label" for="material-name">材料名称</label><input class="field__box" id="material-name" value="${esc(m.name)}"></div><div class="field" style="margin-top:10px"><label class="field__label" for="material-type">材料类型</label><select class="field__box" id="material-type">${materialTypes().map((t) => `<option ${t === m.type ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div></div>
      <div class="sheet__foot"><button class="btn btn--ghost" data-act="close-sheet">取消</button><button class="btn btn--primary" data-act="save-material">保存</button></div>`);
  }
  function openMaterialDelete(id, orderId = '') {
    const { m } = findMaterial(id, orderId);
    if (!m) return;
    materialEdit = { id, orderId };
    openSheet(`<div class="sheet__handle"></div><div class="sheet__head"><div><h2>删除材料</h2><p>删除后如已提交预约，将同步移除该材料。</p></div><button class="sheet__close" data-act="close-sheet">${icon('close')}</button></div>
      <div class="sheet__body"><p>确认删除「${esc(m.name)}」？</p></div><div class="sheet__foot"><button class="btn btn--ghost" data-act="close-sheet">取消</button><button class="btn btn--primary" style="background:linear-gradient(120deg,#DE5B70,#EC8292);box-shadow:none" data-act="confirm-delete-material">删除</button></div>`);
  }

  function provinceCityMap() {
    const map = {};
    D.hospitals.forEach((h) => {
      const meta = D.hospitalMeta[h] || {};
      if (!meta.province || !meta.city) return;
      if (!map[meta.province]) map[meta.province] = [];
      if (!map[meta.province].includes(meta.city)) map[meta.province].push(meta.city);
    });
    return map;
  }
  function paintCityPicker() {
    if (!cityPick) return;
    const map = provinceCityMap();
    $$('.city-prov').forEach((b) => b.classList.toggle('is-on', b.dataset.value === cityPick.province));
    const box = $('#city-city-list');
    if (box) box.innerHTML = (map[cityPick.province] || []).map((c) => `<button type="button" class="city-option city-city ${c === cityPick.city ? 'is-on' : ''}" data-act="pick-city" data-value="${esc(c)}">${esc(c)}</button>`).join('');
  }
  function openCitySheet() {
    const map = provinceCityMap();
    const provinces = Object.keys(map);
    const meta = D.hospitalMeta[draft.hospital] || {};
    let p = draft.province || meta.province || provinces[0];
    if (!map[p]) p = provinces[0];
    let c = draft.city || map[p][0];
    if (!map[p].includes(c)) c = map[p][0];
    cityPick = { province: p, city: c };
    openSheet(`<div class="sheet__handle"></div><div class="sheet__head"><div><h2>选择省市</h2><p>上下滚动选择服务城市</p></div><button class="sheet__close" data-act="close-sheet">${icon('close')}</button></div>
      <div class="sheet__body city-picker"><div class="city-picker__col" id="city-province-list">${provinces.map((x) => `<button type="button" class="city-option city-prov ${x === p ? 'is-on' : ''}" data-act="pick-province" data-value="${esc(x)}">${esc(x)}</button>`).join('')}</div><div class="city-picker__col" id="city-city-list">${map[p].map((x) => `<button type="button" class="city-option city-city ${x === c ? 'is-on' : ''}" data-act="pick-city" data-value="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
      <div class="sheet__foot"><button class="btn btn--ghost" data-act="close-sheet">取消</button><button class="btn btn--primary" data-act="confirm-city">确定</button></div>`);
  }
  function paintHospitalSuggest(q = '') {
    const box = $('#hospital-suggest');
    if (!box) return;
    const query = q.trim();
    if (!query) { box.hidden = true; box.innerHTML = ''; return; }
    const list = D.hospitals.filter((h) => (D.hospitalMeta[h] || {}).city === draft.city && h.includes(query));
    box.hidden = false;
    box.innerHTML = list.length ? list.map((h) => `<button type="button" class="hospital-option ${draft.hospital === h ? 'is-on' : ''}" data-act="pick-hospital-inline" data-value="${esc(h)}"><b>${esc(h)}</b><span>${esc((D.hospitalMeta[h] || {}).province || '')} ${esc((D.hospitalMeta[h] || {}).city || '')}</span></button>`).join('') : `<div class="hospital-empty">未找到可服务医院</div>`;
  }
  function selectHospital(name) {
    if (!D.hospitals.includes(name)) return;
    draft.hospital = name;
    const meta = D.hospitalMeta[name] || {};
    if (meta.province) draft.province = meta.province;
    if ($('#hospital')) $('#hospital').value = name;
    if ($('#province')) $('#province').value = draft.province || '';
    if ($('#hospital-input')) $('#hospital-input').value = name;
    const box = $('#hospital-suggest');
    if (box) { box.hidden = true; box.innerHTML = ''; }
  }

  function openHospitalSheet() {
    if (!draft.city) { toast('请先选择城市'); return; }
    openSheet(`<div class="sheet__handle"></div><div class="sheet__head"><div><h2>选择就诊医院</h2><p>仅可选择当前城市可服务医院</p></div><button class="sheet__close" data-act="close-sheet">${icon('close')}</button></div>
      <div class="sheet__body"><div class="input-wrap" style="margin-bottom:10px">${icon('search')}<input id="hospital-search" placeholder="搜索医院名称" autocomplete="off"></div><div class="hospital-results" id="hospital-results"></div></div>`);
    paintHospitalResults('');
  }
  function paintHospitalResults(q = '') {
    const box = $('#hospital-results');
    if (!box) return;
    const list = D.hospitals.filter((h) => (D.hospitalMeta[h] || {}).city === draft.city && h.includes(q.trim()));
    box.innerHTML = list.length ? list.map((h) => `<button type="button" class="hospital-option ${draft.hospital === h ? 'is-on' : ''}" data-act="pick-hospital" data-value="${esc(h)}"><b>${esc(h)}</b><span>${esc((D.hospitalMeta[h] || {}).province || '')} ${esc((D.hospitalMeta[h] || {}).city || '')}</span></button>`).join('') : `<div class="empty" style="padding:26px 10px"><p>未找到可服务医院</p><span class="tiny muted">仅支持当前城市清单内医院</span></div>`;
  }

  function requestView() {
    if (!draft) draft = createDraft();
    const today = todayISO();
    const isEditing = !!editingOrderId;
    const available = unusedVouchers();
    const quota = quotaStats();
    const card = isEditing ? (getCard(draft.cardId) || null) : (available[0] || null);
    if (!isEditing && card) draft.cardId = card.id;
    const activeOrders = state.orders.filter((o) => ['pending', 'accepted', 'serving'].includes(o.status));
    const cities = [...new Set(D.hospitals.map((h) => (D.hospitalMeta[h] || {}).city).filter(Boolean))];
    const city = draft.city && cities.includes(draft.city) ? draft.city : ((D.hospitalMeta[draft.hospital] || {}).city || cities[0]);
    const province = draft.province || (D.hospitalMeta[draft.hospital] || {}).province || '';
    const hospitals = D.hospitals.filter((h) => (D.hospitalMeta[h] || {}).city === city);
    const hospital = hospitals.includes(draft.hospital) ? draft.hospital : (hospitals[0] || '');
    const needs = D.careNeeds.map((n) => `<button type="button" class="need-opt ${draft.needs.includes(n) ? 'is-on' : ''}" data-act="need" data-value="${esc(n)}">
      <span class="need-opt__check">${draft.needs.includes(n) ? icon('check') : ''}</span><span class="need-opt__label">${esc(n)}</span>
    </button>`).join('');

    if (!isEditing && !card) {
      return page(`${titlebar('服务预约')}<div class="no-voucher">
        <span class="no-voucher__icon">${icon('receipt')}</span>
        <h2>暂无可用额度</h2>
        <p>${activeOrders.length ? `您有 ${activeOrders.length} 个进行中预约，使用额度已全部使用。取消进行中预约可返还 1 次额度，或等待服务完成后再预约。` : '当前使用额度已全部使用，暂时无法提交新的预约。'}</p>
        <div class="no-voucher__actions"><button class="btn btn--primary" data-nav="#/service">查看服务详情</button><button class="btn btn--ghost" data-nav="#/my">返回我的</button></div>
        <div class="no-voucher__tip">${icon('info')} 每次预约使用 1 次额度</div>
      </div>`, 'page--tabbar');
    }

    return page(`${titlebar('服务预约')}<header class="req-head book-hero">
      <div class="req-head__row">
        <div class="book-hero__copy">
          <div class="book-title-row"><h1>${isEditing ? '修改预约' : '院内照护预约'}</h1><button type="button" class="book-service-link" data-act="go-service">服务详情${icon('chevR')}</button></div>
          <p>${isEditing ? '修改后预约将重新进入待确认状态。' : '填写信息并提交预约，照护顾问将审核评估后确认<span style="white-space:nowrap">服务安排。</span>'}</p>
        </div>
      </div>
      <div class="book-hero__photo" aria-hidden="true"><img src="assets/hospital-room.jpg" alt=""></div>
    </header>
    <form id="request-form" class="req-body" novalidate>
      ${activeOrders.length && !isEditing ? `<div class="banner banner--blue"><span class="banner__text">${icon('info')} 您有 ${activeOrders.length} 个进行中预约，另有 ${available.length} 次使用额度，可继续提交新的预约。</span><button class="banner__action" type="button" data-act="view-orders">查看订单${icon('chevR')}</button></div>` : ''}
      <section class="form-card" id="quota-card">
        <div class="form-card__head"><span class="form-card__num is-gold">${icon('shield')}</span><span class="form-card__title">使用额度</span><span class="form-card__aside">剩余 ${quota.remaining} 次</span></div>
        <div class="quota-grid">
          <div class="quota-cell"><b>${quota.total}</b><span>总次数</span></div>
          <div class="quota-cell"><b>${quota.used}</b><span>已使用</span></div>
          <div class="quota-cell is-accent"><b>${quota.remaining}</b><span>剩余次数</span></div>
        </div>
        <div class="quota-foot"><span>每次预约使用 1 次额度，取消预约后返还</span></div>
      </section>

      <section class="form-card">
        <div class="form-card__head"><span class="form-card__num is-blue">${icon('user')}</span><span class="form-card__title">填写护理人信息</span><span class="form-card__aside">用于服务预约与实名</span></div>
        <div class="form-grid">
          <div class="field field--full"><label class="field__label" for="patientName">姓名<em>*</em></label><input class="field__box" id="patientName" value="${esc(draft.patient.name)}" placeholder="请输入护理人姓名"><span class="field__err">请填写护理人姓名</span></div>
          <div class="field field--full"><label class="field__label">性别<em>*</em></label><div class="seg"><button type="button" class="seg__btn ${draft.patient.gender === '女' ? 'is-on' : ''}" data-act="gender" data-value="女">女</button><button type="button" class="seg__btn ${draft.patient.gender === '男' ? 'is-on' : ''}" data-act="gender" data-value="男">男</button></div></div>
          <div class="field field--full"><label class="field__label" for="birthday">出生日期<em>*</em> <span class="field__tag" id="age-hint">${draft.patient.age ? draft.patient.age + ' 岁' : ''}</span></label><input class="field__box" id="birthday" type="date" value="${esc(draft.patient.birthday)}"><span class="field__err">请填写出生日期</span></div>
          <div class="field field--full"><label class="field__label" for="patientIdType">证件类型<em>*</em></label><select class="field__box" id="patientIdType">${D.idTypes.map(([v, n]) => `<option value="${v}" ${String(draft.patient.idType) === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><span class="field__err"></span></div>
          <div class="field field--full"><label class="field__label" for="patientIdNo">证件号<em>*</em></label><input class="field__box" id="patientIdNo" value="${esc(draft.patient.idNo)}" placeholder="请输入证件号码"><span class="field__err">请填写证件号码</span></div>
        </div>
      </section>

      <section class="form-card">
        <div class="form-card__head"><span class="form-card__num is-teal">${icon('hospital')}</span><span class="form-card__title">填写住院信息</span><span class="form-card__aside">用于匹配院内护理员</span></div>
        <div class="form-grid">
          <div class="field field--full"><label class="field__label" for="city">城市<em>*</em></label><input type="hidden" id="city" value="${esc(city)}"><input type="hidden" id="province" value="${esc(province)}"><button type="button" class="field__box field__box--picker" id="city-picker-btn" data-act="choose-city"><span id="city-label">${esc(province && province !== city ? province + ' ' + city : city)}</span>${icon('chevD')}</button><span class="field__err">请选择城市</span></div>
          <div class="field field--full"><label class="field__label" for="hospital-input">就诊医院<em>*</em></label><div class="hospital-input-wrap">${icon('search')}<input class="field__box" id="hospital-input" value="${esc(hospital)}" placeholder="输入医院名称搜索" autocomplete="off"><input type="hidden" id="hospital" value="${esc(hospital)}"></div><div class="hospital-suggest" id="hospital-suggest" hidden></div><span class="field__err">请选择清单内医院</span></div>
          <div class="field field--full"><label class="field__label" for="department">科室 / 病区<em>*</em></label><select class="field__box" id="department">${D.departments.map((d) => `<option ${draft.department === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select><span class="field__err">请选择科室</span></div>
          <div class="field field--full"><label class="field__label" for="disease">入院疾病 / 诊断<em>*</em></label><input class="field__box" id="disease" value="${esc(draft.disease)}" placeholder="如：膝关节骨性关节炎（术后）"><span class="field__err">请填写入院疾病或诊断</span></div>
          <div class="field field--full"><label class="field__label" for="hospitalizedTime">住院日期 <span class="tiny muted">选填</span></label><input class="field__box" id="hospitalizedTime" type="date" max="${today}" value="${esc(draft.hospitalizedTime)}"><span class="field__err"></span></div>
        </div>
      </section>

      <section class="form-card">
        <div class="form-card__head"><span class="form-card__num is-teal">${icon('file')}</span><span class="form-card__title">材料收集</span><span class="form-card__aside" id="material-count">${(draft.materials || []).length} 份</span></div>
        <p class="form-note">请上传住院申请单或其他住院凭证、病历资料、检查报告、床头卡、手环等就医材料，用于顾问评估审核。</p>
        <div class="material-list" id="material-list">${materialTiles(draft.materials || [])}</div>
        <label class="material-upload"><input id="material-input" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" multiple><span>${icon('plus')}上传材料</span><small>支持图片、PDF、Word，单文件不超过 5MB</small></label>
      </section>


      <section class="form-card">
        <div class="form-card__head"><span class="form-card__num is-violet">${icon('clock')}</span><span class="form-card__title">期望服务时间</span><span class="form-card__aside">照护顾问将评估确认</span></div>
        <div class="quick-dates">${[[0, '今天'], [1, '明天'], [2, '后天']].map(([n, label]) => { const d = addDays(today, n); return `<button type="button" class="quick-date ${draft.startDate === d ? 'is-on' : ''}" data-act="quick-date" data-date="${d}">${label}<span>${Number(d.slice(5, 7))}/${Number(d.slice(8))}</span></button>`; }).join('')}</div>
        <div class="field" style="margin-top:10px"><label class="field__label" for="serviceTime">期望服务时间<em>*</em></label><input class="field__box" id="serviceTime" type="datetime-local" min="${today}T00:00" value="${esc(draft.startDate)}T${esc(draft.startTime)}"><span class="field__err">请选择期望服务时间</span></div>
      </section>

      <section class="form-card">
        <div class="form-card__head"><span class="form-card__num is-rose">${icon('care')}</span><span class="form-card__title">护理员要求</span><span class="form-card__aside">可指定护理员性别</span></div>
        <div class="form-grid">
          <div class="field field--full"><label class="field__label">指定性别<em>*</em></label><div class="seg seg--three"><button type="button" class="seg__btn ${draft.staffGender === '随机分配' ? 'is-on' : ''}" data-act="staff-gender" data-value="随机分配">随机分配</button><button type="button" class="seg__btn ${draft.staffGender === '女' ? 'is-on' : ''}" data-act="staff-gender" data-value="女">女</button><button type="button" class="seg__btn ${draft.staffGender === '男' ? 'is-on' : ''}" data-act="staff-gender" data-value="男">男</button></div></div>
          <div class="field field--full"><label class="field__label" for="note">补充说明 <span class="tiny muted">选填</span></label><textarea class="field__box" id="note" placeholder="例如：希望护理员有骨科护理经验、夜间需要协助起夜等">${esc(draft.note)}</textarea></div>
        </div>
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
          <span>我已阅读并同意<em>《院内照护服务协议》</em>与<em>《隐私政策》</em>，确认住院信息与护理员要求真实有效</span>
        </div>
        <div class="form-foot-note">${icon('shield')} 服务由持证护理员提供，到院签到、护理记录全程可追溯</div>
      </div>

      <div class="submit-block">
        <div class="submit-block__note"><b>提交后照护顾问将审核评估</b>确认服务安排后与您联系</div>
        <button class="btn btn--primary btn--block" type="submit">${isEditing ? '保存修改' : '提交预约'}</button>
      </div>
    </form>`, 'page--tabbar');
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
    const serving = orders.filter((o) => o.status === 'serving');
    const completed = orders.filter((o) => o.status === 'completed');
    const materialCount = orders.reduce((n, o) => n + ((o.materials && o.materials.length) || 0), 0);
    return page(`${titlebar('我的')}<header class="my-hero">
      <div class="my-hero__top">
        <div class="avatar avatar--lg">${avatarNeutral()}</div>
        <div><div class="my-hero__name">${phoneMask(state.session.phone)}</div></div>
      </div>
      <div class="my-stats">
        <button class="my-stat" data-nav="#/orders/all"><b>${orders.length}</b><span>全部订单</span></button>
        <button class="my-stat" data-nav="#/orders/pending"><b>${pending.length}</b><span>待确认</span></button>
        <button class="my-stat" data-nav="#/orders/serving"><b>${serving.length}</b><span>服务中</span></button>
        <button class="my-stat" data-nav="#/orders/completed"><b>${completed.length}</b><span>已完成</span></button>
      </div>
    </header>
    <div class="my-body">
      <section class="my-card">
        <div class="my-card__head"><div class="my-card__title">${icon('receipt')}正在进行中的订单</div><button class="my-card__more" data-nav="#/orders/all">查看全部${icon('chevR')}</button></div>
        <div class="my-orders">${active.length ? active.slice(0, 2).map(orderCard).join('') : `<div class="my-empty">${icon('receipt')}<p>暂无进行中的预约</p><button class="btn btn--soft btn--sm" data-nav="#/book">去预约</button></div>`}</div>
      </section>
      <div class="menu">
        <button class="menu__item" data-nav="#/records"><span class="menu__ic">${icon('file')}</span>病历资料<span class="menu__value">${materialCount} 份 ${icon('chevR')}</span></button>
        <button class="menu__item" data-nav="#/privacy"><span class="menu__ic">${icon('shield')}</span>隐私政策<span class="menu__arrow">${icon('chevR')}</span></button>
        <button class="menu__item menu__item--danger" data-act="logout"><span class="menu__ic">${icon('logout')}</span>退出登录<span class="menu__arrow">${icon('chevR')}</span></button>
      </div>
      <a class="my-hotline" href="tel:4008006688">服务热线 400-800-6688</a>
      <div class="my-foot"><b>安颐院内照护</b><br>专业陪护，让家人安心</div>
    </div>`, 'page--tabbar');
  }

  function ordersView(tab = 'all') {
    const tabs = [['all', '全部'], ['pending', '待确认'], ['confirmed', '已预约'], ['serving', '服务中'], ['completed', '已完成'], ['cancelled', '已取消']];
    let list = state.orders;
    if (tab === 'active') list = list.filter((o) => ['pending', 'accepted', 'serving'].includes(o.status));
    if (tab === 'pending') list = list.filter((o) => o.status === 'pending');
    if (tab === 'confirmed') list = list.filter((o) => ['accepted'].includes(o.status));
    if (tab === 'serving') list = list.filter((o) => o.status === 'serving');
    if (tab === 'completed') list = list.filter((o) => o.status === 'completed');
    if (tab === 'cancelled') list = list.filter((o) => o.status === 'cancelled');
    const emptyLabel = tab === 'active' ? '进行中' : (tabs.find((t) => t[0] === tab) || ['', ''])[1];
    return page(`${ph('我的订单', { back: '#/my' })}
      <div class="order-tabs">${tabs.map(([k, l]) => `<button class="order-tab ${tab === k ? 'is-on' : ''}" data-nav="#/orders/${k}">${l}</button>`).join('')}</div>
      <div class="appt-list">${list.length ? list.map(orderCard).join('') : `<div class="appt-empty">${icon('receipt')}<p>暂无${emptyLabel}预约</p><button class="btn btn--primary btn--sm" data-nav="#/book">去预约</button></div>`}</div>`, 'page--tabbar');
  }

  function vouchersView(tab = 'all') {
    const tabs = [['all', '全部'], ['unused', '未使用'], ['used', '已使用']];
    const today = todayISO();
    const orderOf = (v) => state.orders.find((o) => o.id === v.orderId || (o.card && o.card.cardNum === v.cardNum));
    const usedAt = (v) => {
      const o = orderOf(v);
      return (o && o.completedAt) || '';
    };
    const sorted = [...allCards()].sort((a, b) => {
      const au = a.status === 'used';
      const bu = b.status === 'used';
      if (au !== bu) return au ? 1 : -1;
      if (!au) return String(a.endTime || '').localeCompare(String(b.endTime || ''));
      return usedAt(b).localeCompare(usedAt(a));
    });
    const list = sorted.filter((v) => tab === 'all' || (tab === 'unused' ? v.status !== 'used' : v.status === 'used'));
    const near = (v) => {
      if (v.status === 'used' || !v.endTime) return false;
      const days = Math.ceil((new Date(v.endTime + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
      return days >= 0 && days <= 30;
    };
    return page(`${ph('卡券', { back: '#/my' })}
      <div class="order-tabs voucher-tabs">${tabs.map(([k, l]) => `<button class="order-tab ${tab === k ? 'is-on' : ''}" data-nav="#/vouchers/${k}">${l}</button>`).join('')}</div>
      <div class="voucher-list">${list.map((v) => {
        const used = v.status === 'used';
        const order = orderOf(v);
        const label = used ? '已使用' : near(v) ? '未使用 · 即将到期' : '未使用';
        const foot = used ? (order ? (order.completedAt ? `服务完成 ${esc(order.completedAt)}` : `订单 ${esc(order.no)}`) : '已使用') : '可用于院内照护预约';
        return `<article class="voucher-pack-card ${used ? 'is-used' : ''}">
          ${cardStripHtml(v, label)}
          <div class="voucher-pack-card__foot"><span>${foot}</span>${used ? '' : `<button class="voucher-use" data-nav="#/book">去使用${icon('chevR')}</button>`}</div>
        </article>`;
      }).join('') || `<div class="appt-empty">${icon('receipt')}<p>暂无${tab === 'all' ? '' : tabs.find((t) => t[0] === tab)[1]}服务券</p></div>`}</div>
      <div class="voucher-note">${icon('info')} 服务券由后台发放，取消进行中的预约后会自动返还。</div>`);
  }

  function serviceView() {
    const audience = ['术后康复、行动不便的住院患者', '失能、半失能，家属无法全天陪护', '需要协助进食、翻身、如厕、陪检', '夜间需要看护或家属临时替换'];
    const flow = [
      ['提交预约', '填写护理人、住院信息和护理员要求'],
      ['材料审核', '上传住院凭证、病历、检查报告等材料'],
      ['顾问评估', '照护顾问电话确认服务需求与时间'],
      ['安排护理员', '匹配符合要求的持证护理员'],
      ['到院服务', '护理员到院签到，开始院内照护']
    ];
    const materials = [
      ['receipt', '住院申请单', '或其他住院凭证'],
      ['file', '病历资料', '入院记录 / 出院小结'],
      ['clipboard', '检查报告', '化验单 / 影像报告'],
      ['bed', '床头卡 / 手环', '住院信息材料'],
      ['info', '其他材料', '能说明就医情况的材料']
    ];
    const serviceGroups = [
      { title: '基本生活照护', icon: 'bed', tone: 'blue', items: [
        { title: '饮食照护', list: ['营养膳食的获取', '协助进食'] },
        { title: '排泄照护', list: ['如厕照护', '床上排尿、排便（根据服务对象客观需要）', '纸尿裤、尿垫使用（根据服务对象客观需要）'] },
        { title: '生活技能照护', list: ['穿、脱衣服', '上、下床', '床椅移动', '室内走动', '床上更换体位'] },
        { title: '休憩照护', list: ['合理安排休憩/睡眠时间与适合体位', '睡眠期间对服务对象一般情况的观察，特殊情况记录并反馈客户家属及上级主管'] }
      ] },
      { title: '清洁与卫生', icon: 'droplet', tone: 'teal', items: [
        { title: '个人卫生照护', list: ['面部清洁', '口腔清洁', '洗发沐浴', '手、足清洁', '修剪指/趾甲', '会阴部清洗（根据服务对象客观需要）'] },
        { title: '环境卫生照护', list: ['服务对象本人康复必要的床单位整理与清洗', '服务对象本人康复必要的居室清洁与整理'] },
        { title: '物品清洁', list: ['服务对象本人康复必要的生活用品的清洁'] },
        { title: '用具清洁', list: ['行动辅具（轮椅、拐杖、助行器等）的清洁及收纳', '肢体支具的清洁及收纳', '胸带、腹带、加压带等的清洁及收纳'] }
      ] },
      { title: '情况观察', icon: 'eye', tone: 'violet', items: [
        { title: '生命体征观察', list: ['测量体温并记录', '测量呼吸并记录', '测量脉搏并记录'], note: '若发现异常及时告知客户家属并上报主管。' },
        { title: '一般情况观察', list: ['伤口敷料渗血、渗液明显增多', '疼痛突然加剧', '突发不明原因恶心、呕吐等'], note: '若发现异常情况及时告知客户家属并上报主管。' }
      ] },
      { title: '专项照护', icon: 'shield', tone: 'amber', items: [
        { title: '用药照护', list: ['遵医嘱帮助服务对象服药'] },
        { title: '舒适照护', list: ['翻身/拍背、协助排痰'] },
        { title: '安全照护', list: ['保护具的使用', '护送与搬运'] }
      ] },
      { title: '关怀与陪同', icon: 'chat', tone: 'rose', items: [
        { title: '心理关怀', list: ['与服务对象沟通，倾听需求，鼓励表达', '与服务对象交流时保持正向、积极、温暖的态度'] }
      ] }
    ];
    return page(`${titlebar('院内照护服务', '#/book')}
      <div class="service-page">
        <section class="sv-hero">
          <span class="sv-hero__ring sv-hero__ring--a"></span><span class="sv-hero__ring sv-hero__ring--b"></span>
          <div class="sv-hero__top"><span class="sv-hero__eyebrow">院内照护 · 专业陪护</span><span class="sv-hero__badge">服务详情</span></div>
          <h1>让专业护理员<br><em>替您守在病床旁</em></h1>
          <p>针对住院期间的生活照护与陪护需求，提供持证护理员到院服务，减轻家属陪护压力。</p>
          <div class="sv-hero__chips"><span>${icon('shield')}持证护理员</span><span>${icon('hospital')}到院照护</span><span>${icon('clipboard')}全程记录</span></div>
        </section>
        <section class="sv-card">
          <div class="sv-head"><span class="sv-num">01</span><div><h2>适用人群</h2><p>这些住院场景，都可以申请院内照护</p></div></div>
          <div class="sv-tags">${audience.map((x) => `<span>${icon('check')}${x}</span>`).join('')}</div>
          <p class="sv-tip">具体是否适合服务，以照护顾问评估结果为准。</p>
        </section>
        <section class="sv-card">
          <div class="sv-head"><span class="sv-num">02</span><div><h2>申请流程</h2><p>从提交到到院，五步完成</p></div></div>
          <div class="sv-flow">${flow.map(([t, d], i) => `<div class="sv-step ${i === flow.length - 1 ? 'is-last' : ''}"><span class="sv-step__dot">${i + 1}</span><div><b>${t}</b><p>${d}</p></div></div>`).join('')}</div>
        </section>
        <section class="sv-card">
          <div class="sv-head"><span class="sv-num">03</span><div><h2>材料审核</h2><p>提前准备，评估更顺利</p></div></div>
          <div class="sv-materials">${materials.map(([ic, t, d]) => `<div class="sv-material"><span>${icon(ic)}</span><div><b>${t}</b><small>${d}</small></div></div>`).join('')}</div>
          <p class="sv-tip">材料仅用于服务评估与护理安排，请确保真实、清晰、完整。</p>
        </section>
        <section class="sv-card">
          <div class="sv-head"><span class="sv-num">04</span><div><h2>服务内容</h2><p>五大类 14 项，按服务对象实际情况提供</p></div></div>
          <div class="sv-svc-summary"><div><b>5</b><span>大类服务</span></div><i></i><div><b>14</b><span>项具体服务</span></div></div>
          <p class="sv-svc-lead">根据服务对象实际情况，协助并完成实施：</p>
          <div class="sv-cats">${serviceGroups.map((g) => `<details class="sv-cat" open><summary class="sv-cat__head"><span class="sv-cat__icon is-${g.tone}">${icon(g.icon)}</span><span class="sv-cat__title"><b>${g.title}</b><small>${g.items.length} 项服务</small></span>${icon('chevD', 'sv-cat__chev')}</summary><div class="sv-cat__body">${g.items.map((it) => `<div class="sv-service"><div class="sv-service__title"><span class="sv-service__mark">${icon('check')}</span><b>${it.title}</b></div><ul class="sv-service__list">${it.list.map((x) => `<li><span class="sv-service__dot"></span>${x}</li>`).join('')}</ul>${it.note ? `<p class="sv-service__note">${icon('info')}${it.note}</p>` : ''}</div>`).join('')}</div></details>`).join('')}</div>
          <p class="sv-tip">护理员不提供医疗诊疗、用药决策等医疗行为；专项照护以医嘱和评估为准。</p>
        </section>
        <section class="sv-card">
          <div class="sv-head"><span class="sv-num">05</span><div><h2>注意事项</h2><p>请家属提前了解</p></div></div>
          <ul class="sv-notes">
            <li><span>1</span>请如实填写护理人健康状况、住院信息和护理员要求。</li>
            <li><span>2</span>服务时间、护理员安排以照护顾问最终确认为准。</li>
            <li><span>3</span>如需取消或修改预约，请尽早在订单详情操作。</li>
            <li><span>4</span>贵重物品请家属自行保管，护理员不承担财物保管责任。</li>
            <li><span>5</span>如遇病情变化，请第一时间联系医护人员。</li>
          </ul>
        </section>
        <div class="sv-cta"><button class="btn btn--primary btn--block" data-nav="#/book">去预约院内照护</button><span>照护顾问将协助确认服务安排</span></div>
      </div>`);
  }

  function recordsView() {
    const rows = state.orders.flatMap((o) => (o.materials || []).map((m) => ({ m, o })));
    return page(`${titlebar('病历资料', '#/my')}
      <div class="records-page">
        <div class="material-list">${rows.length ? rows.map(({ m, o }) => materialTiles([m], o.id)).join('') : `<div class="appt-empty">${icon('file')}<p>暂无病历资料</p><button class="btn btn--primary btn--sm" data-nav="#/book">去预约并上传</button></div>`}</div>
        <div class="voucher-note">${icon('info')} 材料仅用于院内照护服务评估，请确保真实清晰。</div>
      </div>`);
  }

  function orderDetailView(id) {
    const o = state.orders.find((x) => x.id === id);
    if (!o) return page(`${titlebar('订单详情', '#/my')}<div class="empty"><div class="empty__ic">${icon('info')}</div><h3>订单不存在</h3><p>请返回我的订单查看</p><button class="btn btn--primary" data-nav="#/my">返回我的</button></div>`, 'page--tabbar');
    const st = STATUS[o.status] || STATUS.pending;
    const timelineList = (o.timeline || []).slice().reverse();
    const timeline = timelineList.map((t, i) => `<div class="tl-item ${i === 0 ? 'is-latest' : ''}"><b>${esc(t.title)}</b><p>${esc(t.desc)}</p><time>${esc(t.time)}</time></div>`).join('');
    const foldable = timelineList.length > 2;
    const cg = o.caregiver && ['accepted', 'serving', 'completed'].includes(o.status) ? o.caregiver : null;
    const cgPhone = cg && cg.phone && String(cg.phone) !== '—' ? String(cg.phone) : '';
    const cgFacts = cg ? [
      cg.gender && cg.gender !== '—' ? esc(cg.gender) : '',
      cg.age && String(cg.age) !== '—' ? `${esc(cg.age)}岁` : '',
      cgPhone ? esc(cgPhone) : ''
    ].filter(Boolean) : [];
    const caregiver = cg ? `<section class="dcard">${dhead('users', 'is-blue', '护理员信息')}
      <div class="caregiver"><div class="avatar">${caregiverAvatar(cg.gender)}</div><div class="caregiver__main"><b>${esc(cg.name)}</b><span>${esc(cg.level)}${cg.years ? ` · ${cg.years} 年经验` : ''}</span>${cgFacts.length ? `<div class="caregiver__facts">${cgFacts.map((f) => `<span>${f}</span>`).join('')}</div>` : ''}</div></div>
      ${cgPhone ? `<div class="caregiver-contact"><a class="caregiver-call" href="tel:${esc(cgPhone)}">${icon('phone')}拨打电话</a><button class="caregiver-copy" type="button" data-act="copy-phone" data-phone="${esc(cgPhone)}">${icon('clipboard')}复制手机号</button></div>` : ''}
    </section>` : '';
    return page(`${titlebar('订单详情', '#/my')}
      <div class="order-body detail-body">
        <section class="status-panel">
          <div class="status-panel__top"><span class="status-panel__pill">${st.label}</span></div>
          <h1>${esc(st.title)}</h1>
          <div class="status-timeline ${foldable ? 'is-foldable' : ''}"><div class="timeline timeline--panel">${timeline || '<div class="tiny muted">暂无进度</div>'}</div></div>
          ${foldable ? `<button class="timeline-toggle" type="button" data-act="toggle-timeline">展开全部</button>` : ''}
        </section>
        ${caregiver}
        <section class="dcard">${dhead('user', 'is-blue', '护理人信息')}
          <div class="detail-kv"><span>姓名 / 性别</span><b>${esc(o.patient.name)} · ${esc(o.patient.gender)} · ${o.patient.age}岁</b></div>
          <div class="detail-kv"><span>证件</span><b>${esc(idTypeName(o.patient.idType))} ${maskId(o.patient.idNo)}</b></div>
          <div class="detail-kv"><span>出生日期</span><b>${fmtFull(o.patient.birthday)}</b></div>
        </section>
        <section class="dcard">${dhead('hospital', 'is-teal', '住院信息')}
          <div class="detail-kv"><span>医院</span><b>${esc(o.hospital)}</b></div>
          <div class="detail-kv"><span>服务城市</span><b>${esc(o.city || '')}</b></div>
          <div class="detail-kv"><span>科室 / 病区</span><b>${esc(o.department)}</b></div>
          ${o.hospitalizedTime ? `<div class="detail-kv"><span>住院日期</span><b>${fmtFull(o.hospitalizedTime)}</b></div>` : ''}
          <div class="detail-kv"><span>入院疾病</span><b style="max-width:240px">${esc(o.disease || '—')}</b></div>
        </section>
        <section class="dcard">${dhead('clock', 'is-violet', '期望服务时间')}
          <div class="detail-kv"><span>服务项目</span><b>院内照护</b></div>
          <div class="detail-kv"><span>期望时间</span><b>${fmtDate(o.startDate)} ${esc(o.startTime)}</b></div>
        </section>
        <section class="dcard">${dhead('care', 'is-rose', '护理员要求')}
          <div class="detail-kv"><span>指定性别</span><b>${esc(o.staffGender || '随机分配')}</b></div>
          <div class="detail-kv"><span>补充说明</span><b style="max-width:250px">${esc(o.staffNote || o.note || '无')}</b></div>
        </section>
        <section class="dcard">${dhead('users', 'is-blue', '联系人信息')}
          <div class="detail-kv"><span>姓名</span><b>${esc(o.contact.name)}</b></div>
          <div class="detail-kv"><span>手机号</span><b>${phoneMask(o.contact.mobile || o.contact.phone)}</b></div>
        </section>
        <section class="dcard">${dhead('receipt', 'is-gold', '订单信息')}
          <div class="detail-kv"><span>订单编号</span><b>${esc(o.no)}</b></div>
          <div class="detail-kv"><span>下单时间</span><b>${esc(o.createdAt)}</b></div>
          <div class="detail-kv"><span>额度消耗</span><b>1 次</b></div>
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
      <div class="account-hero"><div class="account-hero__main"><div class="avatar avatar--lg">${avatarNeutral()}</div><div><h1>${esc(state.session.name)}</h1><p>${phoneMask(state.session.phone)} · 院内照护账户</p></div></div></div>
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
      <div class="account-hero"><div class="account-hero__main"><div class="avatar avatar--lg">${avatarNeutral()}</div><div><h1>${esc(p.name)}</h1><p>${esc(c.name)} · ${phoneMask(c.mobile)} · 默认客户档案</p></div></div></div>
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
    root.innerHTML = `<div class="sheet-mask"><div class="sheet" role="dialog" aria-modal="true">${content}</div></div>`;
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
      <div class="sheet__body"><div class="avatar logout-avatar">${avatarNeutral()}</div><b style="font-size:12px">${esc(state.session.name)}</b><div class="tiny muted" style="margin-top:3px">${phoneMask(state.session.phone)}</div></div>
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
    else if (p === 'cards') { location.hash = '#/my'; return; }
    else if (p === 'vouchers') { location.hash = '#/my'; return; }
    else if (p === 'service') html = serviceView();
    else if (p === 'records') html = recordsView();
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
    const staffGender = draft.staffGender || '随机分配';

    let first = null;
    const fail = (input, msg) => { const f = markError(input, msg); if (!first) first = f || input; };
    if (!card) {
      toast('暂无可用额度');
      first = $('#quota-card');
    } else if (!isEditing && card.status === 'used') {
      toast('该使用额度已使用');
      first = $('#quota-card');
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
    if (!['随机分配', '女', '男'].includes(staffGender)) fail($('#note'), '请选择护理员性别');
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
        productName: card.productName, productCode: card.productCode,
        startTime: card.startTime, endTime: card.endTime
      },
      voucherId: card.id,
      patient: {
        name: patientName, gender: patientGender, idType: patientIdType, idNo: patientIdNo,
        birthday: patientBirthday, age: patientAge, mobile: '', province: '', city: '', county: '', address: '', selfCare: ''
      },
      staffGender,
      staffNote: note,
      materials: [...(draft.materials || [])],
      needs: [],
      contact: { name: contactName, mobile: contactPhone, phone: contactPhone },
      emergency: { name: '', phone: '' },
      note,
      status: 'pending',
      syncStatus: 'success',
      syncedAt: now,
      caregiver: null,
      createdAt: now,
      timeline: [{ title: '服务申请已提交', desc: '照护顾问已收到院内照护需求，待评估后安排', time: mdText(now) }]
    };

    if (isEditing) {
      const ex = state.orders.find((x) => x.id === editingOrderId);
      if (ex) {
        const old = { id: ex.id, no: ex.no, createdAt: ex.createdAt, timeline: ex.timeline || [] };
        Object.assign(ex, order, { id: old.id, no: old.no, createdAt: old.createdAt, status: 'pending', caregiver: null });
        ex.timeline = [...old.timeline, { title: '服务申请已修改', desc: '修改后的服务申请等待照护顾问评估确认', time: mdText(now) }];
        save();
        editingOrderId = null;
        draft = null;
        go('/order/' + ex.id);
        toast('服务申请已修改，等待评估确认');
        return;
      }
    }

    card.status = 'used';
    card.orderId = order.id;
    state.orders.unshift(order);
    save();
    draft = null;
    go('/order/' + order.id);
    toast('服务申请已提交，照护顾问将评估安排');
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
    bar.classList.add('is-visible');
  }
  window.addEventListener('scroll', updateRequestBar, { passive: true });
  window.addEventListener('resize', updateRequestBar);

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('sheet-mask')) { closeSheet(); return; }
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
    if (act === 'choose-city') { openCitySheet(); return; }
    if (act === 'choose-hospital') { openHospitalSheet(); return; }
    if (act === 'pick-province') {
      if (!cityPick) return;
      const map = provinceCityMap();
      cityPick.province = el.dataset.value;
      cityPick.city = (map[cityPick.province] || [''])[0];
      paintCityPicker();
      return;
    }
    if (act === 'pick-city') {
      if (!cityPick) return;
      cityPick.city = el.dataset.value;
      paintCityPicker();
      return;
    }
    if (act === 'confirm-city') {
      if (!cityPick) return;
      draft.province = cityPick.province;
      draft.city = cityPick.city;
      draft.hospital = '';
      if ($('#city')) $('#city').value = draft.city;
      if ($('#province')) $('#province').value = draft.province;
      if ($('#city-label')) $('#city-label').textContent = draft.province && draft.province !== draft.city ? `${draft.province} ${draft.city}` : draft.city;
      if ($('#hospital')) $('#hospital').value = '';
      if ($('#hospital-input')) $('#hospital-input').value = '';
      const suggest = $('#hospital-suggest');
      if (suggest) { suggest.hidden = true; suggest.innerHTML = ''; }
      closeSheet();
      return;
    }
    if (act === 'pick-hospital-inline') { selectHospital(el.dataset.value); return; }
    if (act === 'pick-hospital') {
      draft.hospital = el.dataset.value;
      const meta = D.hospitalMeta[draft.hospital] || {};
      if ($('#hospital')) $('#hospital').value = draft.hospital;
      if ($('#hospital-label')) $('#hospital-label').textContent = draft.hospital;
      if (meta.province) { draft.province = meta.province; if ($('#province')) $('#province').value = meta.province; }
      closeSheet();
      toast('已选择医院');
      return;
    }
    if (act === 'go-service') { go('/service'); return; }
    if (act === 'view-orders') { go('/orders/all'); return; }
    if (act === 'toggle-timeline') {
      const box = el.closest('.status-panel')?.querySelector('.status-timeline');
      if (!box) return;
      const open = box.classList.toggle('is-open');
      el.textContent = open ? '收起' : '展开全部';
      return;
    }
    if (act === 'copy-phone') {
      const phone = el.dataset.phone || '';
      const fallback = () => {
        const ta = document.createElement('textarea');
        ta.value = phone;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) { /* ignore */ }
        ta.remove();
        toast('手机号已复制');
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(phone).then(() => toast('手机号已复制')).catch(fallback);
      else fallback();
      return;
    }
    if (act === 'view-material') { openMaterialView(el.dataset.id, el.dataset.order || ''); return; }
    if (act === 'edit-material') { openMaterialSheet(el.dataset.id, el.dataset.order || ''); return; }
    if (act === 'delete-material') { openMaterialDelete(el.dataset.id, el.dataset.order || ''); return; }
    if (act === 'save-material') {
      if (!materialEdit) return;
      const { id, orderId } = materialEdit;
      const name = $('#material-name').value.trim();
      const type = $('#material-type').value;
      if (!name) { toast('请填写材料名称'); return; }
      const { m, o } = findMaterial(id, orderId);
      if (m) { m.name = name; m.type = type; }
      if (o) { save(); closeSheet(); render(); } else { renderMaterials(); closeSheet(); }
      toast('材料已更新');
      return;
    }
    if (act === 'confirm-delete-material') {
      if (!materialEdit) return;
      const { id, orderId } = materialEdit;
      if (orderId) {
        const o = state.orders.find((x) => x.id === orderId);
        if (o) o.materials = (o.materials || []).filter((x) => x.id !== id);
        save(); closeSheet(); render();
      } else if (draft) {
        draft.materials = (draft.materials || []).filter((x) => x.id !== id);
        renderMaterials(); closeSheet();
      }
      toast('材料已删除');
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
    if (act === 'staff-gender') {
      draft.staffGender = el.dataset.value;
      $$('[data-act="staff-gender"]').forEach((b) => b.classList.toggle('is-on', b.dataset.value === draft.staffGender));
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
        o.timeline.push({ title: '服务申请已取消', desc: '家属取消本次院内照护服务申请', time: mdText(nowText()) });
        const v = state.vouchers.find((x) => x.id === o.voucherId) || state.vouchers.find((x) => x.cardNum === o.card.cardNum);
        if (v) { v.status = 'unused'; v.orderId = null; }
        save();
      }
      closeSheet();
      render();
      toast('预约已取消，使用额度已返还');
      return;
    }
    if (act === 'edit-name') { editNameSheet(); return; }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'material-input') {
      const files = Array.from(e.target.files || []);
      e.target.value = '';
      if (!draft) return;
      files.forEach((file) => {
        if (file.size > 5 * 1024 * 1024) { toast(`${file.name} 超过 5MB，未上传`); return; }
        const reader = new FileReader();
        reader.onload = () => {
          draft.materials = [...(draft.materials || []), {
            id: 'm-' + Date.now() + '-' + Math.random().toString(16).slice(2),
            name: file.name,
            type: guessMaterialType(file.name),
            size: file.size,
            mime: file.type || '',
            dataUrl: reader.result,
            uploadedAt: nowText()
          }];
          renderMaterials();
          toast('材料已添加');
        };
        reader.readAsDataURL(file);
      });
      return;
    }
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
    if (e.target.id === 'hospital-input') {
      const q = e.target.value.trim();
      const exact = D.hospitals.find((h) => (D.hospitalMeta[h] || {}).city === draft.city && h === q);
      if (exact) { selectHospital(exact); return; }
      draft.hospital = '';
      if ($('#hospital')) $('#hospital').value = '';
      paintHospitalSuggest(q);
      return;
    }
    if (e.target.id === 'hospital-search') { paintHospitalResults(e.target.value); return; }
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

  document.addEventListener('focusin', (e) => {
    if (e.target.id === 'hospital-input') paintHospitalSuggest(e.target.value);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest?.('.hospital-input-wrap') && !e.target.closest?.('#hospital-suggest')) {
      const box = $('#hospital-suggest');
      if (box) box.hidden = true;
    }
  });

  window.addEventListener('hashchange', render);
  render();
  window.__HOSPITAL__ = { state, save, render, go };
})();
