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
      id: 'v1', cardNum: 'YDK2026000186', cardType: '120', cardTypeName: '单次服务券',
      productName: '院内照护服务券', productCode: 'FS2021036', status: 'used', orderId: 'seed-h1',
      startTime: '2026-01-01', endTime: '2026-10-31',
      mainInsurerName: '李桂芳', idType: '1', idNo: '310104194803120024'
    },
    {
      id: 'v2', cardNum: 'YDK2026000187', cardType: '120', cardTypeName: '单次服务券',
      productName: '院内照护服务券', productCode: 'FS2021036', status: 'unused', orderId: null,
      startTime: '2026-01-01', endTime: '2027-06-30',
      mainInsurerName: '李桂芳', idType: '1', idNo: '310104194803120024', isDefault: true
    },
    {
      id: 'v3', cardNum: 'YDK2026000188', cardType: '120', cardTypeName: '单次服务券',
      productName: '院内照护服务券', productCode: 'FS2021036', status: 'unused', orderId: null,
      startTime: '2026-03-01', endTime: '2026-12-03',
      mainInsurerName: '李桂芳', idType: '1', idNo: '310104194803120024'
    },
    {
      id: 'v4', cardNum: 'YDK2026000189', cardType: '120', cardTypeName: '单次服务券',
      productName: '院内照护服务券', productCode: 'FS2021036', status: 'unused', orderId: null,
      startTime: '2026-06-01', endTime: '2027-12-31',
      mainInsurerName: '张女士', idType: '1', idNo: '310104197506180028'
    },
    {
      id: 'v5', cardNum: 'YDK2026000190', cardType: '120', cardTypeName: '单次服务券',
      productName: '院内照护服务券', productCode: 'FS2021036', status: 'used', orderId: 'seed-h2',
      startTime: '2026-01-01', endTime: '2026-12-31',
      mainInsurerName: '李桂芳', idType: '1', idNo: '310104194803120024'
    }
  ],
  hospitalMeta: {
    '北京大学国际医院': { code: 'PKUIH001', province: '北京市', city: '北京市', county: '昌平区' },
    '北大医疗鲁中医院': { code: 'LZ001', province: '山东省', city: '淄博市', county: '临淄区' },
    '北大医疗淄博医院': { code: 'ZB001', province: '山东省', city: '淄博市', county: '张店区' },
    '北大医疗海洋石油医院': { code: 'OCEAN001', province: '天津市', city: '天津市', county: '滨海新区' },
    '北京北大医疗康复医院': { code: 'PKUR001', province: '北京市', city: '北京市', county: '昌平区' },
    '河北中石油中心医院': { code: 'HBLF001', province: '河北省', city: '廊坊市', county: '广阳区' },
    '北大医疗潞安医院': { code: 'LA001', province: '山西省', city: '长治市', county: '潞州区' }
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
    '河北中石油中心医院',
    '北大医疗潞安医院'
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
  materialTypes: ['住院申请单 / 住院凭证', '病历资料', '检查报告', '床头卡', '手环', '其他就医材料'],
  careNeeds: [
    '术后照护', '翻身叩背', '助餐喂食', '如厕助洁', '夜间看护',
    '陪检陪护', '康复协助', '压疮护理', '管路护理', '失智照护'
  ],
  selfCare: ['自理', '半自理', '不能自理', '术后卧床'],
  seedOrders: [
    {
      id: 'seed-h2',
      no: 'AYH20261116010',
      hospital: '北京大学国际医院',
      hospitalCode: 'PKUIH001',
      city: '北京市',
      department: '神经内科',
      bed: '',
      hospitalNo: '',
      hospitalizedTime: '2026-11-12',
      disease: '脑梗死后康复期',
      serviceType: '院内照护',
      serviceId: 'hospital',
      startDate: '2026-11-16',
      startTime: '08:00',
      card: {
        cardNum: 'YDK2026000190', cardType: '120', cardTypeName: '单次服务券',
        productName: '院内照护服务券', productCode: 'FS2021036',
        startTime: '2026-01-01', endTime: '2026-12-31'
      },
      voucherId: 'v5',
      patient: {
        name: '李桂芳', gender: '女', idType: '1', idNo: '310104194803120024', birthday: '1948-03-12',
        age: 78, mobile: '', province: '', city: '', county: '', address: '', selfCare: ''
      },
      needs: ['翻身叩背', '助餐喂食', '康复协助'],
      staffGender: '女',
      staffNote: '希望护理员有神经内科照护经验，动作轻柔，能协助康复训练。',
      contact: { name: '张女士', mobile: '13800006721', phone: '13800006721' },
      emergency: { name: '', phone: '' },
      note: '脑梗后右侧肢体活动不便，进食需要协助，康复训练时请在旁陪护。',
      status: 'serving',
      completedAt: null,
      syncStatus: 'success',
      syncedAt: '2026-11-14 09:13:00',
      caregiver: { name: '陈晓梅', gender: '女', age: 46, phone: '13900001234', level: '中级养老护理员', years: 5, rating: 4.8 },
      createdAt: '2026-11-14 09:12:30',
      timeline: [
        { title: '服务申请已提交', desc: '照护顾问已收到院内照护需求，待评估后安排', time: '11-14 09:12:30' },
        { title: '服务评估完成，已安排护理员', desc: '陈晓梅 · 中级养老护理员', time: '11-14 10:05:00' },
        { title: '服务开始', desc: '护理员已到院签到，照护开始', time: '11-16 08:05:00' }
      ]
    },
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
      serviceType: '院内照护',
      serviceId: 'hospital',
      startDate: '2026-10-18',
      startTime: '08:00',
      days: 7,
      card: {
        cardNum: 'YDK2026000186', cardType: '120', cardTypeName: '单次服务券',
        productName: '院内照护服务券', productCode: 'FS2021036',
        startTime: '2026-01-01', endTime: '2026-10-31'
      },
      voucherId: 'v1',
      patient: {
        name: '李桂芳', gender: '女', idType: '1', idNo: '310104194803120024', birthday: '1948-03-12',
        age: 78, mobile: '13800006721', province: '上海市', city: '上海市', county: '徐汇区',
        address: '田林路 128 弄 12 号 502 室', selfCare: '半自理'
      },
      needs: ['术后照护', '翻身叩背', '助餐喂食', '夜间看护'],
      staffGender: '女',
      staffNote: '希望护理员有骨科术后照护经验，夜间起夜需要协助。',
      contact: { name: '张女士', idType: '1', idNo: '310104197506180028', mobile: '13800006721', phone: '13800006721' },
      emergency: { name: '张先生', phone: '13900005678' },
      note: '母亲膝关节置换术后，夜间起夜需要协助，引流管请多留意。',
      status: 'completed',
      completedAt: '2026-10-25 08:10:00',
      syncStatus: 'success',
      syncedAt: '2026-10-15 16:30:00',
      caregiver: { name: '王建国', gender: '男', age: 52, phone: '13900005678', level: '高级养老护理员', years: 8, rating: 4.9 },
      createdAt: '2026-10-15 16:28:00',
      timeline: [
        { title: '服务申请已提交', desc: '照护顾问已收到院内照护需求，待评估后安排', time: '10-15 16:28:00' },
        { title: '服务评估完成，已安排护理员', desc: '王建国 · 高级养老护理员', time: '10-15 17:05:00' },
        { title: '服务开始', desc: '护理员已到院签到，照护开始', time: '10-18 08:02:00' },
        { title: '服务完成', desc: '照护结束，服务完成', time: '10-25 08:10:00' }
      ]
    },
    {
      id: 'seed-h3', no: 'AYH20261118006', status: 'cancelled', auditStatus: 'rejected',
      hospital: '复旦大学附属华东医院', hospitalCode: 'FDUH003', city: '上海市',
      department: '消化科', bed: '8 床', hospitalNo: 'ZY2026111608', hospitalizedTime: '2026-11-16',
      disease: '消化道出血恢复期', serviceType: '院内照护', serviceId: 'hospital',
      startDate: '2026-11-19', startTime: '09:00', days: 3,
      card: {
        cardNum: 'YDK2026000199', cardType: '120', cardTypeName: '单次服务券',
        productName: '院内照护服务券', productCode: 'FS2021036',
        startTime: '2026-01-01', endTime: '2026-12-31'
      },
      voucherId: null,
      patient: {
        name: '徐兰英', gender: '女', idType: '1', idNo: '310107194905230021', birthday: '1949-05-23',
        age: 77, mobile: '13600006611', province: '上海市', city: '上海市', county: '静安区',
        address: '延安西路 188 号 5 楼', selfCare: '半自理'
      },
      needs: [],
      staffGender: '随机分配',
      staffNote: '材料不完整，审核未通过。',
      contact: { name: '徐先生', idType: '1', idNo: '', mobile: '13600006611', phone: '13600006611' },
      emergency: { name: '', phone: '' },
      note: '上传的检查报告不完整，请补充材料后重新预约。',
      caregiver: null,
      completedAt: null,
      syncStatus: 'success',
      syncedAt: '2026-11-18 13:20:00',
      createdAt: '2026-11-18 13:20:00',
      timeline: [
        { title: '服务申请已提交', desc: '照护顾问已收到院内照护需求，待评估后安排', time: '11-18 13:20:00' },
        { title: '审核不通过', desc: '材料不完整，请补充检查报告后重新预约', time: '11-18 15:35:00' }
      ]
    }
  ]
};
