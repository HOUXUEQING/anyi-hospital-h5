window.HOSPITAL_DATA = {
  account: {
    name: '张女士',
    phone: '13800006721',
    memberNo: 'AYH-2026-0086',
    joinedAt: '2025-06-18',
    level: '院内照护会员'
  },
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
      department: '骨科病区',
      bed: '12 床',
      hospitalNo: 'ZY2026101208',
      serviceType: '24 小时陪护',
      serviceId: '24h',
      startDate: '2026-10-18',
      startTime: '08:00',
      days: 7,
      patient: { name: '李桂芳', gender: '女', age: 78, selfCare: '半自理' },
      needs: ['术后照护', '翻身叩背', '助餐喂食', '夜间看护'],
      contact: { name: '张女士', phone: '13800006721' },
      emergency: { name: '张先生', phone: '13900005678' },
      note: '母亲膝关节置换术后，夜间起夜需要协助，引流管请多留意。',
      status: 'completed',
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
