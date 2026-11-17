window.HOSPITAL_DATA = {
  account: {
    name: '张女士',
    phone: '13800006721',
    memberNo: 'AYH-2026-0086',
    joinedAt: '2025-06-18',
    level: '院内照护会员',
    profile: {
      patient: {
        name: '李桂芳', gender: '女', idType: '1', idNo: '310104194803120024',
        birthday: '1948-03-12', mobile: '13800006721',
        province: '上海市', city: '上海市', county: '徐汇区', address: '田林路 128 弄 12 号 502 室'
      },
      contact: { name: '张女士', idType: '1', idNo: '310104197506180028', mobile: '13800006721' }
    }
  },
  cards: [
    {
      id: 'card-1', cardNum: 'YDK2026000186', cardType: '121', cardTypeName: '多次服务券',
      productName: '院内照护服务券', productCode: 'FS2021036', dueline: '3 年',
      startTime: '2026-01-01', endTime: '2028-12-31', status: '0', activationCode: '888888',
      mainInsurerName: '李桂芳', age: '78', idType: '1', idNo: '310104194803120024',
      phone: '13800006721', address: '上海市徐汇区田林路 128 弄 12 号 502 室', isDefault: true
    },
    {
      id: 'card-2', cardNum: 'YDK2025000921', cardType: '122', cardTypeName: '家庭服务券',
      productName: '家庭照护服务券', productCode: 'FS2021037', dueline: '1 年',
      startTime: '2025-10-01', endTime: '2026-09-30', status: '0', activationCode: '666888',
      mainInsurerName: '张女士', age: '50', idType: '1', idNo: '310104197506180028',
      phone: '13800006721', address: '上海市徐汇区田林路 128 弄 12 号 502 室', isDefault: false
    }
  ],
  hospitalMeta: {
    '北京大学国际医院': { code: 'PKUIH001', province: '北京市', city: '北京市', county: '昌平区' },
    '北大医疗鲁中医院': { code: 'LZ001', province: '山东省', city: '淄博市', county: '临淄区' },
    '北大医疗淄博医院': { code: 'ZB001', province: '山东省', city: '淄博市', county: '张店区' },
    '北大医疗海洋石油医院': { code: 'OCEAN001', province: '天津市', city: '天津市', county: '滨海新区' },
    '北京北大医疗康复医院': { code: 'PKUR001', province: '北京市', city: '北京市', county: '昌平区' },
    '其他医院': { code: '', province: '', city: '', county: '' }
  },
  idTypes: [
    ['1', '身份证'], ['2', '护照'], ['3', '户口簿'], ['4', '军官证'], ['5', '士兵证'],
    ['6', '港澳居民来往内地通行证'], ['7', '台湾居民来往大陆通行证'], ['8', '临时身份证'],
    ['9', '外国人居留证'], ['10', '警官证'], ['11', '文职干部证'], ['12', '驾驶执照'],
    ['13', '出生医学证明'], ['14', '出生证'], ['15', '其他']
  ],
  cardTypes: { '120': '单次卡', '121': '钻石卡 / 不限次卡', '122': '家庭卡 A', '123': '家庭卡 B' },
  hospitals: [
    '北京大学国际医院',
    '北大医疗鲁中医院',
    '北大医疗淄博医院',
    '北大医疗海洋石油医院',
    '北京北大医疗康复医院',
    '其他医院'
  ],
  departments: [
    '骨科病区', '神经内科', '心血管内科', '康复医学科', '普外科', '肿瘤内科', 'ICU / 重症监护', '其他科室'
  ],
  serviceTypes: [
    { id: '24h', name: '24 小时陪护', short: '全天在院', hours: '全天', desc: '适合术后、失能、重症或需要持续看护的长辈' },
    { id: 'day', name: '12 小时白班', short: '08:00–20:00', hours: '12 小时', desc: '白天陪护，协助治疗、进食、活动和日常照料' },
    { id: 'night', name: '12 小时夜班', short: '20:00–08:00', hours: '12 小时', desc: '夜间看护，协助起夜、翻身和突发情况照应' },
    { id: 'visit', name: '按次陪护', short: '陪检 / 临时', hours: '按次', desc: '陪检、临时看护、家属临时替换等短时需求' }
  ],
  careNeeds: [
    '术后照护', '翻身叩背', '助餐喂食', '如厕助洁', '夜间看护',
    '陪检陪护', '康复协助', '压疮护理', '管路护理', '失智照护'
  ],
  selfCare: ['自理', '半自理', '不能自理', '术后卧床'],
  seedOrders: [
    {
      id: 'seed-h1',
      no: 'AYH20261018008',
      hospital: '北京大学国际医院',
      hospitalCode: 'PKUIH001',
      city: '北京市',
      department: '骨科病区',
      bed: '12 床',
      hospitalNo: 'ZY2026101208',
      hospitalizedTime: '2026-10-12',
      disease: '膝关节骨性关节炎（术后）',
      serviceType: '24 小时陪护',
      serviceId: '24h',
      startDate: '2026-10-18',
      startTime: '08:00',
      days: 7,
      card: {
        cardNum: 'YDK2026000186', cardType: '121', cardTypeName: '多次服务券',
        productName: '院内照护服务券', productCode: 'FS2021036',
        startTime: '2026-01-01', endTime: '2028-12-31'
      },
      patient: {
        name: '李桂芳', gender: '女', idType: '1', idNo: '310104194803120024', birthday: '1948-03-12',
        age: 78, mobile: '13800006721', province: '上海市', city: '上海市', county: '徐汇区',
        address: '田林路 128 弄 12 号 502 室', selfCare: '半自理'
      },
      needs: ['术后照护', '翻身叩背', '助餐喂食', '夜间看护'],
      contact: { name: '张女士', idType: '1', idNo: '310104197506180028', mobile: '13800006721', phone: '13800006721' },
      emergency: { name: '张先生', phone: '13900005678' },
      note: '母亲膝关节置换术后，夜间起夜需要协助，引流管请多留意。',
      status: 'completed',
      syncStatus: 'success',
      syncedAt: '2026-10-15 16:30',
      caregiver: { name: '王秀兰', level: '高级养老护理员', years: 8, rating: 4.9 },
      createdAt: '2026-10-15 16:28',
      timeline: [
        { title: '需求已提交', desc: '照护顾问已收到院内照护需求', time: '10-15 16:28' },
        { title: '护理员已接单', desc: '王秀兰 · 高级养老护理员', time: '10-15 17:05' },
        { title: '服务开始', desc: '护理员到院签到，与家属完成交接', time: '10-18 08:02' },
        { title: '服务完成', desc: '7 天陪护结束，家属确认服务完成', time: '10-25 08:10' }
      ]
    }
  ]
};
