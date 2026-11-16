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
    if (!s.defaultCardId) s.defaultCardId = (D.cards.find((c) => c.isDefault) || D.cards[0]).id;
    s.orders.forEach((o) => {
      if (!o.card) {
        const c = D.cards[0];
        o.card = { cardNum: c.cardNum, cardType: c.cardType, cardTypeName: c.cardTypeName, productName: c.productName, productCode: c.productCode, startTime: c.startTime, endTime: c.endTime };
      }
      if (!o.city) o.city = (D.hospitalMeta[o.hospital] || {}).city || '';
      if (!o.hospitalCode) o.hospitalCode = (D.hospitalMeta[o.hospital] || {}).code || '';
      if (!o.disease) o.disease = '—';
      if (!o.patient.idType) o.patient = { ...s.profile.patient, ...o.patient };
      if (!o.contact.idType) o.contact = { ...s.profile.contact, ...o.contact };
      if (!o.syncStatus) o.syncStatus = 'success';
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
        profile: clone(D.account.profile),
        defaultCardId: (D.cards.find((c) => c.isDefault) || D.cards[0]).id,
        seq: 9,
        loginAgree: true,
        created: Date.now()
      };
    }
  }
  let state = loadState();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  const allCards = () => D.cards;
  const getCard = (id) => allCards().find((c) => c.id === id);
  const defaultCard = () => getCard(state.defaultCardId) || allCards()[0];
  function cardState(card) {
    if (!card) return { key: 'none', label: '未绑定', tone: 'gray', valid: false };
    if (card.status === '1') return { key: 'deleted', label: '已停用', tone: 'gray', valid: false };
    const today = todayISO();
    if (card.endTime && card.endTime < today) return { key: 'expired', label: '已过期', tone: 'gray', valid: false };
    if (card.startTime && card.startTime > today) return { key: 'notstart', label: '未生效', tone: 'amber', valid: false };
    return { key: 'valid', label: '权益可用', tone: 'green', valid: true };
  }
  const maskCard = (n) => String(n || '').replace(/^(.{4}).*(.{4})$/, '$1 **** **** $2');

  const STATUS = {
    pending: { label: '待接单', tone: 'amber', title: '正在匹配护理员', desc: '照护顾问将在 30 分钟内致电，确认住院信息与照护需求' },
    accepted: { label: '已接单', tone: 'blue', title: '护理员已接单', desc: '护理员将在约定时间到院，请保持电话畅通' },
    serving: { label: '服务中', tone: 'blue', title: '院内陪护进行中', desc: '护理员正在院内照护，服务记录会持续更新' },
    completed: { label: '已完成', tone: 'green', title: '本次陪护已完成', desc: '感谢您的信任，期待再次为您服务' },
    cancelled: { label: '已取消', tone: 'gray', title: '订单已取消', desc: '如仍需院内陪护，可重新提交需求' }
  };
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
    return page(`<div class="login">
      <div class="login__brand">
        <span class="login__mark"><svg viewBox="0 0 24 24"><path d="M12 21s-8-4.8-8-10.4A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 3.6C20 16.2 12 21 12 21z"/></svg></span>
        <div><b>安颐院内照护</b><span>PKU CARE · HOSPITAL CARE</span></div>
      </div>
      <form class="login__card" data-form="login" novalidate>
        <div class="login__card-head">
          <span class="login__card-icon">${icon('hospital')}</span>
          <div><h2>登录</h2><p>手机号验证码登录，首次登录自动创建院内照护账户</p></div>
        </div>
        <div class="field">
          <label class="field__label" for="login-phone">手机号</label>
          <div class="input-wrap">${icon('phone')}<input id="login-phone" type="tel" inputmode="numeric" maxlength="11" placeholder="请输入手机号" autocomplete="tel"></div>
        </div>
        <div class="field">
          <label class="field__label" for="login-code">验证码</label>
          <div class="input-wrap">${icon('shield')}<input id="login-code" type="tel" inputmode="numeric" maxlength="6" placeholder="请输入 6 位验证码" autocomplete="one-time-code"><button type="button" class="code-btn" id="send-code" data-act="send-code">获取验证码</button></div>
        </div>
        <div class="login__extra"><span>未注册手机号验证后自动创建账户</span><button type="button" data-act="fill-demo">填入演示账号</button></div>
        <button class="btn btn--primary btn--block login__submit" type="submit">登录并填写需求</button>
        <div class="login__agree ${state.loginAgree !== false ? 'is-on' : ''}" data-act="toggle-login-agree">
          <span class="agree-box">${icon('check')}</span>
          <span>我已阅读并同意<em>《服务协议》</em>与<a data-act="open-privacy">《隐私政策》</a>，授权平台使用服务所需信息</span>
        </div>
        <p class="login__hint">演示环境：手机号 <b>13800006721</b>，验证码 <b>123456</b></p>
      </form>
      <div class="login__trust">
        <div>${icon('shield')}<b>持证护理员</b><span>实名认证</span></div>
        <div>${icon('hospital')}<b>到院签到</b><span>服务交接</span></div>
        <div>${icon('file')}<b>全程记录</b><span>可追溯</span></div>
      </div>
      <div class="login__foot">安颐照护 · 院内陪护服务由持证护理员提供</div>
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
      serviceId: '24h',
      startDate: todayISO(),
      startTime: '08:00',
      days: 3,
      patient: { ...p, age: calcAge(p.birthday) || '78', selfCare: '半自理' },
      needs: ['术后照护', '夜间看护'],
      contact: { name: c.name, idType: c.idType, idNo: c.idNo, mobile: c.mobile || (state.session ? state.session.phone : D.account.phone), phone: c.mobile || (state.session ? state.session.phone : D.account.phone) },
      emergency: { name: '', phone: '' },
      note: '',
      agree: false
    };
  }
  let draft = null;

  function cardStripHtml(card) {
    const st = cardState(card);
    if (!card) return `<div class="benefit-empty">${icon('receipt')}暂无可用服务卡<button class="link" data-act="choose-card">激活/选择服务卡</button></div>`;
    return `<div class="benefit-card">
      <div class="benefit-card__top"><span class="benefit-card__product">${esc(card.productName)}</span><span class="benefit-card__state ${st.valid ? 'is-ok' : ''}">${st.label}</span></div>
      <div class="benefit-card__type">${esc(card.cardTypeName)} · ${esc(card.productCode)}</div>
      <div class="benefit-card__num">${maskCard(card.cardNum)}</div>
      <div class="benefit-card__foot"><span>服务期 ${fmtFull(card.startTime)} – ${fmtFull(card.endTime)}</span><span>持卡人 ${esc(card.mainInsurerName)}</span></div>
    </div>`;
  }

  function requestView() {
    if (!draft) draft = createDraft();
    const today = todayISO();
    const card = getCard(draft.cardId) || defaultCard();
    const services = D.serviceTypes.map((s) => `<button type="button" class="service-opt ${draft.serviceId === s.id ? 'is-on' : ''}" data-act="service" data-id="${s.id}">
      <span class="service-opt__top"><b>${esc(s.name)}</b><span class="service-opt__tick">${icon('check')}</span></span>
      <small>${esc(s.short)} · ${esc(s.hours)}</small><p>${esc(s.desc)}</p>
    </button>`).join('');
    const needs = D.careNeeds.map((n) => `<button type="button" class="need-opt ${draft.needs.includes(n) ? 'is-on' : ''}" data-act="need" data-value="${esc(n)}">
      <span class="need-opt__check">${draft.needs.includes(n) ? icon('check') : ''}</span><span class="need-opt__label">${esc(n)}</span>
    </button>`).join('');
    return page(`<header class="req-head">
      <div class="req-head__row">
        <div>
          <span class="req-head__badge">${icon('hospital')} 院内照护 · 独立版</span>
          <h1>填写院内照护需求</h1>
          <p>提交后照护顾问 30 分钟内致电，确认住院信息与照护安排。</p>
        </div>
        <button class="req-head__avatar" data-nav="#/my" aria-label="我的">${esc((state.session && state.session.name || '张').slice(0, 1))}</button>
      </div>
      <div class="req-progress">
        <span class="is-on"><i>1</i>填写需求</span><span class="req-progress__line"></span>
        <span><i>2</i>顾问确认</span><span class="req-progress__line"></span>
        <span><i>3</i>护理员到院</span>
      </div>
    </header>
    <form id="request-form" class="req-body" novalidate>
      <section class="form-card">
        <div class="form-card__head"><span class="form-card__num">卡</span><span class="form-card__title">服务权益</span><span class="form-card__aside"><button class="link" data-act="choose-card">切换服务卡${icon('chevR')}</button></span></div>
        <div id="card-strip">${cardStripHtml(card)}</div>
        <p class="form-note">服务权益由易得康服务卡提供，提交后将同步本次服务申请。</p>
      </section>

      <section class="form-card">
        <div class="form-card__head"><span class="form-card__num">01</span><span class="form-card__title">住院信息</span><span class="form-card__aside">用于匹配院内护理员</span></div>
        <div class="form-grid">
          <div class="field field--full"><label class="field__label" for="hospital">就诊医院<em>*</em></label><select class="field__box" id="hospital">${D.hospitals.map((h) => `<option ${draft.hospital === h ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select><div class="field__hint" id="hospital-code-hint">医院编码 ${esc((D.hospitalMeta[draft.hospital] || {}).code || '待匹配')} · 城市 ${esc((D.hospitalMeta[draft.hospital] || {}).city || '待补充')}</div><span class="field__err">请选择医院</span></div>
          <div class="field"><label class="field__label" for="city">服务城市<em>*</em></label><input class="field__box field__box--readonly" id="city" value="${esc(draft.city || (D.hospitalMeta[draft.hospital] || {}).city || '')}" readonly><span class="field__err">该医院暂未配置城市</span></div>
          <div class="field"><label class="field__label" for="department">科室 / 病区<em>*</em></label><select class="field__box" id="department">${D.departments.map((d) => `<option ${draft.department === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select><span class="field__err">请选择科室</span></div>
          <div class="field"><label class="field__label" for="bed">床号<em>*</em></label><input class="field__box" id="bed" value="${esc(draft.bed)}" placeholder="如 12 床"><span class="field__err">请填写床号</span></div>
          <div class="field"><label class="field__label" for="hospitalizedTime">住院日期 <span class="tiny muted">选填</span></label><input class="field__box" id="hospitalizedTime" type="date" max="${today}" value="${esc(draft.hospitalizedTime)}"><span class="field__err"></span></div>
          <div class="field field--full"><label class="field__label" for="disease">入院疾病 / 诊断<em>*</em></label><input class="field__box" id="disease" value="${esc(draft.disease)}" placeholder="如：膝关节骨性关节炎（术后）"><span class="field__err">请填写入院疾病或诊断</span></div>
          <div class="field field--full"><label class="field__label" for="hospitalNo">住院号 <span class="tiny muted">选填</span></label><input class="field__box" id="hospitalNo" value="${esc(draft.hospitalNo)}" placeholder="便于护理员到院核对"><span class="field__err"></span></div>
        </div>
      </section>

      <section class="form-card">
        <div class="form-card__head"><span class="form-card__num">02</span><span class="form-card__title">服务安排</span><span class="form-card__aside">到院时间可调整</span></div>
        <div class="service-grid">${services}</div>
        <span class="field__err" id="service-err" style="display:none">请选择服务类型</span>
        <div class="form-grid" style="margin-top:11px">
          <div class="field"><label class="field__label" for="startDate">开始日期<em>*</em></label><input class="field__box" id="startDate" type="date" min="${today}" value="${esc(draft.startDate)}"><span class="field__err">请选择开始日期</span></div>
          <div class="field"><label class="field__label" for="startTime">到院时间<em>*</em></label><select class="field__box" id="startTime">${['06:00', '08:00', '09:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'].map((t) => `<option ${draft.startTime === t ? 'selected' : ''}>${t}</option>`).join('')}</select><span class="field__err"></span></div>
          <div class="field field--full"><label class="field__label">服务时长</label><div class="qty-row"><span>预计陪护天数</span><div class="qty"><button type="button" data-act="days" data-step="-1" ${draft.days <= 1 ? 'disabled' : ''}>${icon('minus')}</button><b id="days-value">${draft.days} 天</b><button type="button" data-act="days" data-step="1" ${draft.days >= 30 ? 'disabled' : ''}>${icon('plus')}</button></div></div></div>
        </div>
        <p class="form-note">如需延长或缩短服务，可随时联系照护顾问调整。</p>
      </section>

      <section class="form-card">
        <div class="form-card__head"><span class="form-card__num">03</span><span class="form-card__title">照护对象</span><span class="form-card__aside">用于易得康实名与服务匹配</span></div>
        <div class="form-grid">
          <div class="field field--full"><label class="field__label" for="patientName">姓名<em>*</em></label><input class="field__box" id="patientName" value="${esc(draft.patient.name)}" placeholder="请输入长辈姓名"><span class="field__err">请填写照护对象姓名</span></div>
          <div class="field"><label class="field__label">性别<em>*</em></label><div class="seg"><button type="button" class="seg__btn ${draft.patient.gender === '女' ? 'is-on' : ''}" data-act="gender" data-value="女">女</button><button type="button" class="seg__btn ${draft.patient.gender === '男' ? 'is-on' : ''}" data-act="gender" data-value="男">男</button><button type="button" class="seg__btn ${draft.patient.gender === '不详' ? 'is-on' : ''}" data-act="gender" data-value="不详">不详</button></div></div>
          <div class="field"><label class="field__label" for="birthday">出生日期<em>*</em> <span class="field__tag" id="age-hint">${draft.patient.age ? draft.patient.age + ' 岁' : ''}</span></label><input class="field__box" id="birthday" type="date" value="${esc(draft.patient.birthday)}"><span class="field__err">请填写出生日期</span></div>
          <div class="field field--full"><label class="field__label" for="patientIdType">证件类型<em>*</em></label><select class="field__box" id="patientIdType">${D.idTypes.map(([v, n]) => `<option value="${v}" ${String(draft.patient.idType) === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><span class="field__err"></span></div>
          <div class="field field--full"><label class="field__label" for="patientIdNo">证件号<em>*</em></label><input class="field__box" id="patientIdNo" value="${esc(draft.patient.idNo)}" placeholder="请输入证件号码"><span class="field__err">请填写证件号码</span></div>
          <div class="field field--full"><label class="field__label" for="patientMobile">护理对象手机号 <span class="tiny muted">选填</span></label><input class="field__box" id="patientMobile" type="tel" inputmode="numeric" maxlength="11" value="${esc(draft.patient.mobile)}" placeholder="用于接收服务通知"><span class="field__err"></span></div>
          <div class="field"><label class="field__label" for="patientProvince">省</label><input class="field__box" id="patientProvince" value="${esc(draft.patient.province)}" placeholder="省 / 直辖市"><span class="field__err"></span></div>
          <div class="field"><label class="field__label" for="patientCity">市<em>*</em></label><input class="field__box" id="patientCity" value="${esc(draft.patient.city)}" placeholder="城市"><span class="field__err">请填写城市</span></div>
          <div class="field"><label class="field__label" for="patientCounty">区 / 县</label><input class="field__box" id="patientCounty" value="${esc(draft.patient.county)}" placeholder="区 / 县"><span class="field__err"></span></div>
          <div class="field"><label class="field__label" for="patientAddress">详细地址</label><input class="field__box" id="patientAddress" value="${esc(draft.patient.address)}" placeholder="街道、门牌"><span class="field__err"></span></div>
          <div class="field field--full"><label class="field__label" for="selfCare">自理能力</label><select class="field__box" id="selfCare">${D.selfCare.map((s) => `<option ${draft.patient.selfCare === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select><span class="field__err"></span></div>
        </div>
      </section>

      <section class="form-card">
        <div class="form-card__head"><span class="form-card__num">04</span><span class="form-card__title">照护需求</span><span class="form-card__aside" id="needs-count">已选 ${draft.needs.length} 项</span></div>
        <div class="need-grid" id="needs">${needs}</div>
        <span class="field__err" id="needs-err" style="display:none;margin-top:4px">请至少选择一项照护需求</span>
        <div class="field" style="margin-top:12px"><label class="field__label" for="note">补充说明 <span class="tiny muted">选填</span></label><textarea class="field__box" id="note" placeholder="例如：术后不能下床、夜间需要协助起夜、饮食禁忌等">${esc(draft.note)}</textarea></div>
      </section>

      <section class="form-card">
        <div class="form-card__head"><span class="form-card__num">05</span><span class="form-card__title">联系人</span><span class="form-card__aside">用于顾问确认</span></div>
        <div class="form-grid">
          <div class="field"><label class="field__label" for="contactName">联系人<em>*</em></label><input class="field__box" id="contactName" value="${esc(draft.contact.name)}" placeholder="姓名"><span class="field__err">请填写联系人</span></div>
          <div class="field"><label class="field__label" for="contactPhone">手机号<em>*</em></label><input class="field__box" id="contactPhone" type="tel" inputmode="numeric" maxlength="11" value="${esc(draft.contact.mobile || draft.contact.phone)}" placeholder="11 位手机号"><span class="field__err">请填写正确手机号</span></div>
          <div class="field"><label class="field__label" for="contactIdType">证件类型 <span class="tiny muted">选填</span></label><select class="field__box" id="contactIdType">${D.idTypes.map(([v, n]) => `<option value="${v}" ${String(draft.contact.idType) === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select><span class="field__err"></span></div>
          <div class="field"><label class="field__label" for="contactIdNo">证件号 <span class="tiny muted">选填</span></label><input class="field__box" id="contactIdNo" value="${esc(draft.contact.idNo)}" placeholder="证件号码"><span class="field__err"></span></div>
          <div class="field"><label class="field__label" for="emergencyName">紧急联系人 <span class="tiny muted">选填</span></label><input class="field__box" id="emergencyName" value="${esc(draft.emergency.name)}" placeholder="姓名"><span class="field__err"></span></div>
          <div class="field"><label class="field__label" for="emergencyPhone">紧急联系电话 <span class="tiny muted">选填</span></label><input class="field__box" id="emergencyPhone" type="tel" inputmode="numeric" maxlength="11" value="${esc(draft.emergency.phone)}" placeholder="手机号"><span class="field__err"></span></div>
        </div>
        <div class="agree ${draft.agree ? 'is-on' : ''}" id="agree-row" data-act="toggle-agree" style="margin-top:10px">
          <span class="agree__box">${icon('check')}</span>
          <span>我已阅读并同意<em>《院内照护服务协议》</em>与<em>《隐私政策》</em>，确认住院信息与照护需求真实有效</span>
        </div>
        <div class="form-foot-note">${icon('shield')} 服务由持证护理员提供，到院签到、护理记录全程可追溯</div>
      </section>

      <div class="actionbar request-actionbar">
        <div class="actionbar__note"><b>提交后 30 分钟内联系</b>照护顾问将致电确认服务安排</div>
        <button class="btn btn--primary" type="submit">提交需求</button>
      </div>
    </form>`, 'page--actionbar');
  }

  function orderCard(o) {
    const st = STATUS[o.status] || STATUS.pending;
    return `<article class="ocard" data-nav="#/order/${o.id}">
      <div class="ocard__top"><span class="ocard__no">订单 ${esc(o.no)}</span>${statusPill(o.status)}</div>
      <div class="ocard__body">
        <div class="ocard__title">${esc(o.hospital)}<span class="tag tag--blue">${esc(o.serviceType)}</span></div>
        <div class="ocard__meta">${icon('pin')}<span>${esc(o.department)} · ${esc(o.bed)}</span></div>
        <div class="ocard__meta">${icon('calendar')}<span>${fmtFull(o.startDate)} ${esc(o.startTime)} 开始 · ${o.days} 天</span></div>
        <div class="ocard__service"><span class="muted">照护对象</span><b>${esc(o.patient.name)}</b><span class="muted">${esc(o.patient.gender)} · ${o.patient.age}岁</span><span style="margin-left:auto" class="tag tag--outline">${esc(o.patient.selfCare)}</span></div>
      </div>
      <div class="ocard__foot"><span class="ocard__status">${esc(st.desc)}</span><div class="ocard__actions"><span class="btn btn--ghost btn--sm">查看详情${icon('chevR')}</span></div></div>
    </article>`;
  }

  function myView() {
    const orders = state.orders;
    const serving = orders.filter((o) => ['pending', 'accepted', 'serving'].includes(o.status)).length;
    const completed = orders.filter((o) => o.status === 'completed').length;
    const recent = orders.slice(0, 2).map((o) => {
      const d = o.createdAt.slice(0, 10);
      return `<div class="my-order" data-nav="#/order/${o.id}">
        <div class="my-order__date"><b>${Number(d.slice(8))}</b><span>${Number(d.slice(5, 7))}月</span></div>
        <div class="my-order__main"><b>${esc(o.hospital)} · ${esc(o.serviceType)}</b><span>${esc(o.department)} ${esc(o.bed)} · ${o.days} 天</span></div>
        <div class="my-order__right">${statusPill(o.status)}<div class="tiny muted" style="margin-top:4px">${icon('chevR')}</div></div>
      </div>`;
    }).join('');
    return page(`<header class="my-hero">
      <div class="my-hero__top">
        <div class="avatar avatar--lg">${esc((state.session.name || '张').slice(0, 1))}</div>
        <div><div class="my-hero__name">${esc(state.session.name)}<span class="my-hero__tag">院内照护会员</span></div><div class="my-hero__phone">${phoneMask(state.session.phone)}</div></div>
        <button class="my-hero__set" data-nav="#/account" aria-label="账户信息">${icon('settings')}</button>
      </div>
      <div class="my-stats">
        <div class="my-stat"><b>${orders.length}</b><span>全部订单</span></div>
        <div class="my-stat"><b>${serving}</b><span>进行中</span></div>
        <div class="my-stat"><b>${completed}</b><span>已完成</span></div>
      </div>
    </header>
    <div class="my-body">
      <section class="my-card">
        <div class="my-card__head"><div class="my-card__title">${icon('receipt')}我的订单</div><button class="my-card__more" data-nav="#/orders">全部订单${icon('chevR')}</button></div>
        <div class="my-orders">${recent || `<div class="my-empty">${icon('receipt')}<p>还没有院内照护订单</p><button class="btn btn--soft btn--sm" data-nav="#/request">填写需求</button></div>`}</div>
      </section>
      <div class="menu">
        <button class="menu__item" data-nav="#/cards"><span class="menu__ic">${icon('shield')}</span>服务卡与权益<span class="menu__arrow">${icon('chevR')}</span></button>
        <button class="menu__item" data-nav="#/customer"><span class="menu__ic">${icon('user')}</span>客户信息<span class="menu__arrow">${icon('chevR')}</span></button>
        <button class="menu__item" data-nav="#/account"><span class="menu__ic">${icon('settings')}</span>账户信息<span class="menu__arrow">${icon('chevR')}</span></button>
        <button class="menu__item" data-nav="#/privacy"><span class="menu__ic">${icon('shield')}</span>隐私政策<span class="menu__arrow">${icon('chevR')}</span></button>
        <a class="menu__item" href="tel:4008006688"><span class="menu__ic">${icon('headset')}</span>服务热线<span class="menu__arrow">400-800-6688 ${icon('chevR')}</span></a>
        <button class="menu__item menu__item--danger" data-act="logout"><span class="menu__ic">${icon('logout')}</span>退出登录<span class="menu__arrow">${icon('chevR')}</span></button>
      </div>
      <div class="my-foot"><b>安颐院内照护</b><br>专业陪护，让家人安心 · v1.0</div>
      <button class="btn btn--primary btn--block" data-nav="#/request" style="margin-top:2px">${icon('plus')}填写新的院内照护需求</button>
    </div>`);
  }

  function successView(id) {
    const o = state.orders.find((x) => x.id === id);
    if (!o) return page(`<div class="empty"><div class="empty__ic">${icon('info')}</div><h3>订单不存在</h3><p>请回到我的订单查看</p><button class="btn btn--primary" data-nav="#/my">返回我的</button></div>`);
    return page(`<div class="success">
      <button class="success__close" data-nav="#/my" aria-label="关闭">${icon('close')}</button>
      <div class="success__badge">${icon('check')}</div>
      <h2>需求已提交</h2>
      <p class="success__sub">照护顾问将在 30 分钟内致电，确认住院信息、服务时间与照护安排</p>
      <div class="success__card">
        <div class="success__no"><span>订单编号</span><b>${esc(o.no)}</b></div>
        <div class="success__rows">
          <div class="kv"><span class="kv__k">服务权益</span><span class="kv__v">${esc(o.card.productName)}<br>${esc(o.card.cardTypeName)} · ${maskCard(o.card.cardNum)}</span></div>
          <div class="kv"><span class="kv__k">就诊医院</span><span class="kv__v">${esc(o.hospital)}<br>${esc(o.department)} · ${esc(o.bed)}</span></div>
          <div class="kv"><span class="kv__k">入院疾病</span><span class="kv__v">${esc(o.disease)}</span></div>
          <div class="kv"><span class="kv__k">服务类型</span><span class="kv__v">${esc(o.serviceType)} · ${o.days} 天</span></div>
          <div class="kv"><span class="kv__k">开始时间</span><span class="kv__v">${fmtDate(o.startDate)} ${esc(o.startTime)}</span></div>
          <div class="kv"><span class="kv__k">照护对象</span><span class="kv__v">${esc(o.patient.name)} ${esc(o.patient.gender)} · ${o.patient.age}岁</span></div>
          <div class="kv"><span class="kv__k">联系人</span><span class="kv__v">${esc(o.contact.name)} ${esc(o.contact.mobile || o.contact.phone)}</span></div>
        </div>
      </div>
      <div class="success__actions">
        <button class="btn btn--primary btn--block" data-nav="#/order/${o.id}">查看订单详情</button>
        <button class="btn btn--ghost btn--block" data-nav="#/my">回到我的</button>
      </div>
      <div class="success__note">温馨提示：护理员到院后会与家属、护士站完成交接；如需修改住院信息或服务时间，可在订单详情联系照护顾问。</div>
    </div>`);
  }

  function ordersView(tab = 'all') {
    const tabs = [['all', '全部'], ['serving', '进行中'], ['completed', '已完成']];
    let list = state.orders;
    if (tab === 'serving') list = list.filter((o) => ['pending', 'accepted', 'serving'].includes(o.status));
    if (tab === 'completed') list = list.filter((o) => o.status === 'completed');
    return page(`${ph('我的订单', { back: '#/my', right: `<button class="ph__link" data-nav="#/request">新需求</button>` })}
      <div class="otabs">${tabs.map(([k, l]) => `<button class="otab ${tab === k ? 'is-on' : ''}" data-nav="#/orders${k === 'all' ? '' : '/' + k}">${l}${k === 'serving' ? ` · ${state.orders.filter((o) => ['pending', 'accepted', 'serving'].includes(o.status)).length}` : ''}</button>`).join('')}</div>
      <div class="order-list">${list.length ? list.map(orderCard).join('') : `<div class="empty"><div class="empty__ic">${icon('receipt')}</div><h3>暂无相关订单</h3><p>提交院内照护需求后，可在这里查看服务进度。</p><button class="btn btn--primary" data-nav="#/request">填写需求</button></div>`}</div>`);
  }

  function orderDetailView(id) {
    const o = state.orders.find((x) => x.id === id);
    if (!o) return page(`${ph('订单详情', { back: '#/orders' })}<div class="empty"><div class="empty__ic">${icon('info')}</div><h3>订单不存在</h3><p>请返回订单列表查看</p><button class="btn btn--primary" data-nav="#/orders">返回订单</button></div>`);
    const st = STATUS[o.status] || STATUS.pending;
    const timeline = (o.timeline || []).slice().reverse().map((t, i) => `<div class="tl-item ${i === 0 ? 'is-latest' : ''}"><b>${esc(t.title)}</b><p>${esc(t.desc)}</p><time>${esc(t.time)}</time></div>`).join('');
    const caregiver = o.caregiver ? `<section class="dcard"><div class="dcard__head"><div class="dcard__title">${icon('users')}服务护理员</div><span class="dcard__aside">已接单</span></div><div class="caregiver"><div class="avatar">${esc(o.caregiver.name.slice(0, 1))}</div><div class="caregiver__main"><b>${esc(o.caregiver.name)}</b><span>${esc(o.caregiver.level)} · ${o.caregiver.years} 年经验</span></div><div class="caregiver__right"><b>${o.caregiver.rating}</b><span>服务评分</span></div></div></section>` : '';
    return page(`<div class="order-hero">
      <div class="order-hero__nav"><button class="ph__btn" data-nav="#/orders" aria-label="返回">${icon('chevL')}</button><button class="ph__btn" data-act="contact" aria-label="联系顾问">${icon('headset')}</button></div>
      <span class="order-hero__pill">${st.label}</span>
      <h1>${esc(st.title)}</h1>
      <p>${esc(st.desc)}</p>
      <div class="order-hero__meta">${icon('calendar')}${fmtFull(o.startDate)} ${esc(o.startTime)} · ${o.days} 天${icon('pin')}<span style="margin-left:4px">${esc(o.bed)}</span></div>
    </div>
    <div class="order-body">
      ${o.status === 'pending' ? `<div class="dcard" style="background:linear-gradient(135deg,#FFF9EC,#FFFDF8);border-color:#F6E8C8"><div style="display:flex;gap:7px;font-size:9.5px;color:#8B6A27;line-height:1.7">${icon('clock')}<span>需求已收到，照护顾问将在 30 分钟内致电。请保持电话畅通，无需重复提交。</span></div></div>` : ''}
      <section class="dcard"><div class="dcard__head"><div class="dcard__title">${icon('shield')}服务权益</div><span class="dcard__aside">${esc(o.card.cardTypeName)}</span></div>
        <div class="benefit-mini"><div><b>${esc(o.card.productName)}</b><span>${esc(o.card.productCode)} · ${maskCard(o.card.cardNum)}</span></div><div class="benefit-mini__period">服务期<br>${fmtFull(o.card.startTime)} – ${fmtFull(o.card.endTime)}</div></div>
      </section>
      <section class="dcard"><div class="dcard__head"><div class="dcard__title">${icon('hospital')}住院信息</div></div>
        <div class="detail-kv"><span>医院</span><b>${esc(o.hospital)}</b></div>
        <div class="detail-kv"><span>服务城市</span><b>${esc(o.city || '')}</b></div>
        <div class="detail-kv"><span>科室 / 床号</span><b>${esc(o.department)} · ${esc(o.bed)}</b></div>
        ${o.hospitalizedTime ? `<div class="detail-kv"><span>住院日期</span><b>${fmtFull(o.hospitalizedTime)}</b></div>` : ''}
        <div class="detail-kv"><span>入院疾病</span><b style="max-width:220px">${esc(o.disease || '—')}</b></div>
        ${o.hospitalNo ? `<div class="detail-kv"><span>住院号</span><b>${esc(o.hospitalNo)}</b></div>` : ''}
      </section>
      <section class="dcard"><div class="dcard__head"><div class="dcard__title">${icon('user')}护理对象</div></div>
        <div class="detail-kv"><span>姓名 / 性别</span><b>${esc(o.patient.name)} · ${esc(o.patient.gender)} · ${o.patient.age}岁</b></div>
        <div class="detail-kv"><span>证件</span><b>${esc(idTypeName(o.patient.idType))} ${maskId(o.patient.idNo)}</b></div>
        <div class="detail-kv"><span>出生日期</span><b>${fmtFull(o.patient.birthday)}</b></div>
        <div class="detail-kv"><span>手机号</span><b>${phoneMask(o.patient.mobile) || '未填写'}</b></div>
        <div class="detail-kv"><span>地址</span><b style="max-width:220px">${esc([o.patient.province, o.patient.city, o.patient.county, o.patient.address].filter(Boolean).join(' ')) || '未填写'}</b></div>
        <div class="detail-kv"><span>自理能力</span><b>${esc(o.patient.selfCare)}</b></div>
      </section>
      <section class="dcard"><div class="dcard__head"><div class="dcard__title">${icon('clipboard')}服务安排</div></div>
        <div class="detail-kv"><span>服务类型</span><b>${esc(o.serviceType)}</b></div>
        <div class="detail-kv"><span>开始时间</span><b>${fmtDate(o.startDate)} ${esc(o.startTime)}</b></div>
        <div class="detail-kv"><span>服务时长</span><b>${o.days} 天</b></div>
        <div class="detail-kv"><span>照护需求</span><b style="max-width:220px">${o.needs.map((n) => `<span class="tag tag--blue" style="margin:0 0 4px 4px">${esc(n)}</span>`).join('')}</b></div>
        ${o.note ? `<div class="detail-kv"><span>补充说明</span><b style="max-width:220px">${esc(o.note)}</b></div>` : ''}
      </section>
      ${caregiver}
      <section class="dcard"><div class="dcard__head"><div class="dcard__title">${icon('users')}联系人</div></div>
        <div class="detail-kv"><span>联系人</span><b>${esc(o.contact.name)} · ${phoneMask(o.contact.mobile || o.contact.phone)}</b></div>
        ${o.contact.idNo ? `<div class="detail-kv"><span>证件</span><b>${esc(idTypeName(o.contact.idType))} ${maskId(o.contact.idNo)}</b></div>` : ''}
        ${o.emergency && o.emergency.name ? `<div class="detail-kv"><span>紧急联系人</span><b>${esc(o.emergency.name)} · ${esc(o.emergency.phone)}</b></div>` : ''}
      </section>
      <section class="dcard"><div class="dcard__head"><div class="dcard__title">${icon('clock')}订单进度</div><span class="dcard__aside">更新于 ${esc((o.timeline && o.timeline[o.timeline.length - 1].time) || '')}</span></div><div class="timeline">${timeline || '<div class="tiny muted">暂无进度</div>'}</div></section>
      <section class="dcard"><div class="dcard__head"><div class="dcard__title">${icon('receipt')}订单信息</div></div>
        <div class="detail-kv"><span>订单编号</span><b>${esc(o.no)}</b></div>
        <div class="detail-kv"><span>提交时间</span><b>${esc(o.createdAt)}</b></div>
        <div class="detail-kv"><span>易得康同步</span><b class="sync-ok">${o.syncStatus === 'success' ? '已同步' : '待同步'}${o.syncedAt ? ` · ${esc(o.syncedAt)}` : ''}</b></div>
      </section>
      <div class="detail-actions">
        ${o.status === 'pending' ? `<button class="btn btn--ghost" data-act="cancel" data-id="${o.id}">取消需求</button>` : ''}
        <button class="btn btn--primary" data-act="contact">${icon('headset')}联系照护顾问</button>
      </div>
    </div>`);
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
        <ul><li>登录信息：手机号、姓名、短信验证码校验记录。</li><li>服务信息：医院、科室、床号、住院号、服务时间与照护需求。</li><li>照护对象信息：姓名、性别、年龄、自理能力、照护注意事项。</li><li>联系人信息：联系人姓名、手机号、紧急联系人。</li><li>订单与服务记录：订单状态、护理员接单、到院签到与服务完成记录。</li></ul>
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
          <div class="account-tip">${icon('checkC')} 当前档案已用于 ${activeOrders.length} 个进行中订单；修改后将同步至进行中订单（演示）。</div>
          <button class="menu__item" style="padding-left:0;padding-right:0;border-bottom:0" data-nav="#/cards"><span class="menu__ic">${icon('shield')}</span>服务卡与权益<span class="menu__arrow">${icon('chevR')}</span></button>
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
    openSheet(`<div class="sheet__handle"></div><div class="sheet__head"><div><h2>取消院内照护需求</h2><p>取消后如需服务，需要重新提交需求。</p></div><button class="sheet__close" data-act="close-sheet">${icon('close')}</button></div>
      <div class="sheet__body"><p>照护顾问可能已经与您联系，取消前请确认不再需要本次陪护服务。</p></div>
      <div class="sheet__foot"><button class="btn btn--ghost" data-act="close-sheet">保留订单</button><button class="btn btn--primary" style="background:linear-gradient(120deg,#DE5B70,#EC8292);box-shadow:none" data-act="confirm-cancel" data-id="${id}">确认取消</button></div>`);
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
    if (location.hash === hash) render();
    else location.hash = hash;
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
    if (state.session && p === 'login') { location.hash = '#/request'; return; }

    let html;
    if (p === 'login') html = loginView();
    else if (p === 'request' || !p) html = requestView();
    else if (p === 'my') html = myView();
    else if (p === 'orders') html = ordersView(parts[1] || 'all');
    else if (p === 'order') html = orderDetailView(parts[1]);
    else if (p === 'success') html = successView(parts[1]);
    else if (p === 'account') html = accountView();
    else if (p === 'cards') html = cardsView();
    else if (p === 'customer') html = customerView();
    else if (p === 'privacy') html = privacyView();
    else html = requestView();

    $('#view').innerHTML = html;
    const tabbar = $('#tabbar');
    tabbar.hidden = true;
    tabbar.innerHTML = '';
    document.title = p === 'login' ? '登录 · 安颐院内照护' : p === 'my' ? '我的 · 安颐院内照护' : '院内照护 · 安颐照护';
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
    const card = getCard(draft.cardId) || defaultCard();
    const hospital = $('#hospital').value;
    const city = $('#city').value.trim() || (D.hospitalMeta[hospital] || {}).city || '';
    const department = $('#department').value;
    const bed = $('#bed').value.trim();
    const hospitalNo = $('#hospitalNo').value.trim();
    const hospitalizedTime = $('#hospitalizedTime').value;
    const disease = $('#disease').value.trim();
    const startDate = $('#startDate').value;
    const startTime = $('#startTime').value;
    const patientName = $('#patientName').value.trim();
    const patientBirthday = $('#birthday').value;
    const patientAge = calcAge(patientBirthday);
    const patientGender = draft.patient.gender;
    const patientIdType = $('#patientIdType').value;
    const patientIdNo = $('#patientIdNo').value.trim();
    const patientMobile = $('#patientMobile').value.trim();
    const patientProvince = $('#patientProvince').value.trim();
    const patientCity = $('#patientCity').value.trim();
    const patientCounty = $('#patientCounty').value.trim();
    const patientAddress = $('#patientAddress').value.trim();
    const selfCare = $('#selfCare').value;
    const contactName = $('#contactName').value.trim();
    const contactPhone = $('#contactPhone').value.trim();
    const contactIdType = $('#contactIdType').value;
    const contactIdNo = $('#contactIdNo').value.trim();
    const emergencyName = $('#emergencyName').value.trim();
    const emergencyPhone = $('#emergencyPhone').value.trim();
    const note = $('#note').value.trim();

    let first = null;
    const fail = (input, msg) => { const f = markError(input, msg); if (!first) first = f || input; };
    if (!card || !cardState(card).valid) {
      toast('请选择一张在有效期内的服务卡');
      first = $('#card-strip');
    }
    if (!(D.hospitalMeta[hospital] || {}).code) fail($('#hospital'), '该医院暂未配置服务编码，请选择其他医院');
    if (!city) fail($('#city'), '该医院暂未配置城市');
    if (!department) fail($('#department'), '请选择科室');
    if (!bed) fail($('#bed'), '请填写床号');
    if (!disease) fail($('#disease'), '请填写入院疾病或诊断');
    if (!startDate || startDate < todayISO()) fail($('#startDate'), '请选择今天或之后的日期');
    if (!patientName) fail($('#patientName'), '请填写照护对象姓名');
    if (!patientBirthday) fail($('#birthday'), '请填写出生日期');
    if (!patientIdNo) fail($('#patientIdNo'), '请填写证件号码');
    if (patientIdType === '1' && patientIdNo && !/^\d{17}[\dXx]$/.test(patientIdNo)) fail($('#patientIdNo'), '身份证号格式不正确');
    if (!patientCity) fail($('#patientCity'), '请填写护理对象所在城市');
    if (patientMobile && !/^1[3-9]\d{9}$/.test(patientMobile)) fail($('#patientMobile'), '护理对象手机号格式不正确');
    if (!contactName) fail($('#contactName'), '请填写联系人');
    if (!/^1[3-9]\d{9}$/.test(contactPhone)) fail($('#contactPhone'), '请填写正确的 11 位手机号');
    if (contactIdNo && contactIdType === '1' && !/^\d{17}[\dXx]$/.test(contactIdNo)) fail($('#contactIdNo'), '联系人身份证号格式不正确');
    if (emergencyPhone && !/^1[3-9]\d{9}$/.test(emergencyPhone)) fail($('#emergencyPhone'), '手机号格式不正确');
    if (!draft.needs.length) { $('#needs-err').style.display = 'block'; if (!first) first = $('#needs'); }
    if (!draft.agree) { $('#agree-row').classList.add('agree--error'); if (!first) first = $('#agree-row'); }
    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast('请补充带 * 的必填信息');
      return;
    }

    const service = D.serviceTypes.find((s) => s.id === draft.serviceId) || D.serviceTypes[0];
    const meta = D.hospitalMeta[hospital] || {};
    const seq = state.seq++;
    const now = nowText();
    const order = {
      id: 'h-' + Date.now(),
      no: 'AYH' + todayISO().replace(/-/g, '') + String(seq).padStart(3, '0'),
      hospital, hospitalCode: meta.code, city,
      department, bed, hospitalNo, hospitalizedTime, disease,
      serviceType: service.name,
      serviceId: service.id,
      startDate, startTime, days: draft.days,
      card: {
        cardNum: card.cardNum, cardType: card.cardType, cardTypeName: card.cardTypeName,
        productName: card.productName, productCode: card.productCode,
        startTime: card.startTime, endTime: card.endTime
      },
      patient: {
        name: patientName, gender: patientGender, idType: patientIdType, idNo: patientIdNo,
        birthday: patientBirthday, age: patientAge, mobile: patientMobile,
        province: patientProvince, city: patientCity, county: patientCounty, address: patientAddress,
        selfCare
      },
      needs: [...draft.needs],
      contact: { name: contactName, idType: contactIdType, idNo: contactIdNo, mobile: contactPhone, phone: contactPhone },
      emergency: { name: emergencyName, phone: emergencyPhone },
      note,
      status: 'pending',
      syncStatus: 'success',
      syncedAt: now,
      caregiver: null,
      createdAt: now,
      timeline: [{ title: '需求已提交', desc: '照护顾问将在 30 分钟内致电确认', time: mdText(now) }]
    };
    state.orders.unshift(order);
    save();
    draft = null;
    go('/success/' + order.id);
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
      if (!/^1[3-9]\d{9}$/.test(phone)) { toast('请先输入正确的 11 位手机号'); $('#login-phone').focus(); return; }
      startCodeCountdown();
      toast('验证码已发送，演示验证码为 123456');
      return;
    }
    if (act === 'fill-demo') {
      $('#login-phone').value = '13800006721';
      $('#login-code').value = '123456';
      toast('已填入演示账号');
      return;
    }
    if (act === 'toggle-login-agree') {
      state.loginAgree = !(state.loginAgree !== false);
      save();
      el.classList.toggle('is-on', state.loginAgree);
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
        o.timeline.push({ title: '需求已取消', desc: '家属取消本次院内照护需求', time: mdText(nowText()) });
        save();
      }
      closeSheet();
      render();
      toast('订单已取消');
      return;
    }
    if (act === 'edit-name') { editNameSheet(); return; }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'hospital') {
      const meta = D.hospitalMeta[e.target.value] || {};
      const city = $('#city');
      const hint = $('#hospital-code-hint');
      if (city) city.value = meta.city || '';
      if (hint) hint.textContent = `医院编码 ${meta.code || '待匹配'} · 城市 ${meta.city || '待补充'}`;
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
      if (!/^1[3-9]\d{9}$/.test(phone)) { toast('请输入正确的 11 位手机号'); $('#login-phone').focus(); return; }
      if (!/^\d{6}$/.test(code)) { toast('请输入 6 位短信验证码'); $('#login-code').focus(); return; }
      if (code !== '123456') { toast('验证码错误，演示验证码为 123456'); $('#login-code').focus(); return; }
      if (state.loginAgree === false) { toast('请先阅读并同意服务协议与隐私政策'); return; }
      const name = phone === D.account.phone ? D.account.name : '家属用户';
      state.session = { phone, name, loginAt: Date.now() };
      save();
      draft = null;
      clearInterval(codeTimer);
      go('/request');
      toast('登录成功');
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
