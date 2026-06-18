import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.provider.count()
  if (existing > 0) {
    console.log('数据库已有业务数据，跳过 seed，避免覆盖生产数据。')
    return
  }

  // Providers
  const provider1 = await prisma.provider.create({
    data: {
      name: 'CloudVPS Pro',
      type: 'VPS_PROVIDER',
      website: 'https://cloudvpspro.example.com',
      contactName: 'John Smith',
      contactMethod: 'Telegram: @cloudvpspro',
      billingUrl: 'https://billing.cloudvpspro.example.com',
      notes: '主要 VPS 供应商，机房在美国和欧洲',
    },
  })

  const provider2 = await prisma.provider.create({
    data: {
      name: 'SocksWorld',
      type: 'SOCKS5_PROVIDER',
      website: 'https://socksworld.example.com',
      contactName: 'Alex',
      contactMethod: 'WhatsApp: +1234567890',
      notes: 'SOCKS5 代理供应商，提供住宅 IP',
    },
  })

  const provider3 = await prisma.provider.create({
    data: {
      name: 'NetAll Solutions',
      type: 'MIXED',
      website: 'https://netall.example.com',
      contactName: 'David Chen',
      contactMethod: 'Email: david@netall.example.com',
      billingUrl: 'https://billing.netall.example.com',
      notes: '综合供应商，同时提供 VPS 和代理服务',
    },
  })

  // Customers
  const customer1 = await prisma.customer.create({
    data: { name: '客户 A - 电商运营', contact: 'Telegram: @customerA', platform: 'Telegram', status: 'ACTIVE', notes: '主要做跨境电商' },
  })
  const customer2 = await prisma.customer.create({
    data: { name: '客户 B - 数据采集', contact: 'WeChat: customerB', platform: 'WeChat', status: 'ACTIVE', notes: '数据采集用途' },
  })
  const customer3 = await prisma.customer.create({
    data: { name: '客户 C - 测试', contact: 'Email: test@example.com', platform: 'Email', status: 'INACTIVE', notes: '测试客户，暂停使用' },
  })

  // VPS Assets
  const now = new Date()
  const vps1 = await prisma.vpsAsset.create({
    data: {
      name: 'US-East-01',
      ip: '203.0.113.10',
      hostname: 'us-east-01.example.com',
      sshPort: 22,
      sshUsername: 'root',
      providerId: provider1.id,
      country: 'US',
      city: 'New York',
      asn: 'AS14618',
      asOrganization: 'Amazon.com, Inc.',
      isp: 'AWS',
      status: 'ONLINE',
      purchaseDate: new Date('2025-01-15'),
      expireDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      costAmount: 10.00,
      costCurrency: 'USD',
      hasThreeXui: true,
      threeXuiUrl: 'http://203.0.113.10:2053',
      assignedCustomerId: customer1.id,
      tags: 'production,us-east',
      notes: '主力 VPS，运行 3x-ui 面板',
    },
  })

  const vps2 = await prisma.vpsAsset.create({
    data: {
      name: 'EU-West-01',
      ip: '203.0.113.20',
      hostname: 'eu-west-01.example.com',
      sshPort: 2222,
      sshUsername: 'admin',
      providerId: provider1.id,
      country: 'DE',
      city: 'Frankfurt',
      asn: 'AS16509',
      asOrganization: 'Amazon.com, Inc.',
      isp: 'AWS EU',
      status: 'OFFLINE',
      purchaseDate: new Date('2025-03-01'),
      expireDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      costAmount: 15.00,
      costCurrency: 'USD',
      hasThreeXui: false,
      tags: 'europe,backup',
      notes: '欧洲节点，当前离线待排查',
    },
  })

  const vps3 = await prisma.vpsAsset.create({
    data: {
      name: 'APAC-01 即将到期',
      ip: '203.0.113.30',
      sshPort: 22,
      sshUsername: 'root',
      providerId: provider3.id,
      country: 'SG',
      city: 'Singapore',
      asn: 'AS16509',
      asOrganization: 'Amazon.com, Inc.',
      status: 'ONLINE',
      purchaseDate: new Date('2025-06-01'),
      expireDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      costAmount: 8.00,
      costCurrency: 'USD',
      hasThreeXui: true,
      threeXuiUrl: 'http://203.0.113.30:2053',
      tags: 'apac,expiring',
      notes: '5 天后到期，需要续费',
    },
  })

  // SOCKS5 Assets
  const s1 = await prisma.socks5Asset.create({
    data: {
      name: 'US-Residential-01',
      host: 'proxy1.example.com',
      port: 1080,
      username: 'user1',
      providerId: provider2.id,
      country: 'US',
      city: 'Los Angeles',
      asn: 'AS7922',
      asOrganization: 'Comcast Cable',
      isp: 'Comcast',
      status: 'ONLINE',
      purchaseDate: new Date('2025-02-01'),
      expireDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
      costAmount: 5.00,
      costCurrency: 'USD',
      supportsUdp: true,
      assignedCustomerId: customer1.id,
      tags: 'residential,us',
      notes: '住宅 IP，支持 UDP',
    },
  })

  const s2 = await prisma.socks5Asset.create({
    data: {
      name: 'UK-Datacenter-01',
      host: 'proxy2.example.com',
      port: 1080,
      username: 'user2',
      providerId: provider2.id,
      country: 'GB',
      city: 'London',
      asn: 'AS13335',
      asOrganization: 'Cloudflare, Inc.',
      isp: 'Cloudflare',
      status: 'ONLINE',
      purchaseDate: new Date('2025-04-01'),
      expireDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000),
      costAmount: 3.00,
      costCurrency: 'USD',
      supportsUdp: false,
      assignedCustomerId: customer2.id,
      tags: 'datacenter,uk',
    },
  })

  const s3 = await prisma.socks5Asset.create({
    data: {
      name: 'JP-Residential-01',
      host: 'proxy3.example.com',
      port: 1080,
      username: 'user3',
      providerId: provider3.id,
      country: 'JP',
      city: 'Tokyo',
      asn: 'AS2516',
      asOrganization: 'KDDI CORPORATION',
      isp: 'KDDI',
      status: 'OFFLINE',
      purchaseDate: new Date('2025-05-01'),
      expireDate: new Date(now.getTime() + 80 * 24 * 60 * 60 * 1000),
      costAmount: 7.00,
      costCurrency: 'USD',
      supportsUdp: false,
      tags: 'japan,residential',
      notes: '日本住宅 IP，当前离线',
    },
  })

  const s4 = await prisma.socks5Asset.create({
    data: {
      name: 'DE-ISP-01',
      host: 'proxy4.example.com',
      port: 1080,
      username: 'user4',
      providerId: provider3.id,
      country: 'DE',
      city: 'Berlin',
      asn: 'AS3320',
      asOrganization: 'Deutsche Telekom AG',
      isp: 'Deutsche Telekom',
      status: 'IDLE',
      purchaseDate: new Date('2025-07-01'),
      expireDate: new Date(now.getTime() + 200 * 24 * 60 * 60 * 1000),
      costAmount: 4.50,
      costCurrency: 'EUR',
      supportsUdp: true,
      relayVpsId: vps2.id,
      tags: 'germany,idle',
      notes: '空闲状态，可分配给客户',
    },
  })

  const s5 = await prisma.socks5Asset.create({
    data: {
      name: 'FR-Residential 即将到期',
      host: 'proxy5.example.com',
      port: 1080,
      username: 'user5',
      providerId: provider2.id,
      country: 'FR',
      city: 'Paris',
      asn: 'AS3215',
      asOrganization: 'Orange S.A.',
      isp: 'Orange',
      status: 'ONLINE',
      purchaseDate: new Date('2025-08-01'),
      expireDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      costAmount: 6.00,
      costCurrency: 'EUR',
      supportsUdp: false,
      tags: 'france,expiring',
      notes: '3 天后到期',
    },
  })

  // Assignments
  await prisma.assignment.create({
    data: {
      customerId: customer1.id,
      assetType: 'VPS',
      vpsAssetId: vps1.id,
      usageStartDate: new Date('2025-01-20'),
      customerExpireDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      notes: '客户 A 使用 US-East VPS',
    },
  })

  await prisma.assignment.create({
    data: {
      customerId: customer1.id,
      assetType: 'SOCKS5',
      socks5AssetId: s1.id,
      usageStartDate: new Date('2025-02-10'),
      customerExpireDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      notes: '客户 A 使用 US 住宅代理',
    },
  })

  await prisma.assignment.create({
    data: {
      customerId: customer2.id,
      assetType: 'SOCKS5',
      socks5AssetId: s2.id,
      usageStartDate: new Date('2025-04-10'),
      customerExpireDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      notes: '客户 B 使用 UK 机房代理',
    },
  })

  // Health Check Logs
  const checkTypes = ['TCP', 'SOCKS5_AUTH', 'HTTP_OUTBOUND', 'SSH', 'PING', 'DNS', 'THREE_X_UI', 'UDP', 'TCP', 'PING'] as const
  const checkStatuses = ['SUCCESS', 'SUCCESS', 'FAILED', 'SUCCESS', 'SUCCESS', 'SUCCESS', 'FAILED', 'SUCCESS', 'SUCCESS', 'TIMEOUT'] as const
  const latencies = [120, 85, null, 200, 45, 30, null, 150, 90, null] as const

  for (let i = 0; i < 10; i++) {
    await prisma.healthCheckLog.create({
      data: {
        assetType: i < 5 ? 'VPS' : 'SOCKS5',
        vpsAssetId: i < 5 ? [vps1.id, vps2.id, vps3.id, vps1.id, vps3.id][i] : null,
        socks5AssetId: i >= 5 ? [s1.id, s2.id, s3.id, s4.id, s5.id][i - 5] : null,
        checkType: checkTypes[i],
        status: checkStatuses[i],
        latencyMs: latencies[i] as number | null,
        message: checkStatuses[i] === 'FAILED' ? 'Connection refused' : checkStatuses[i] === 'TIMEOUT' ? 'Request timed out' : 'OK',
        checkedAt: new Date(now.getTime() - (10 - i) * 3600000),
      },
    })
  }

  // IP Intelligence
  const ips = [
    { ip: '203.0.113.10', country: 'US', city: 'New York', asn: 'AS14618', org: 'Amazon.com, Inc.', isp: 'AWS', net: 'DATACENTER', dc: true, res: false, mob: false, proxy: false, vpn: false, score: 25, risk: 'LOW' },
    { ip: '203.0.113.20', country: 'DE', city: 'Frankfurt', asn: 'AS16509', org: 'Amazon.com, Inc.', isp: 'AWS EU', net: 'DATACENTER', dc: true, res: false, mob: false, proxy: false, vpn: false, score: 30, risk: 'LOW' },
    { ip: '203.0.113.30', country: 'SG', city: 'Singapore', asn: 'AS16509', org: 'Amazon.com, Inc.', isp: 'AWS APAC', net: 'DATACENTER', dc: true, res: false, mob: false, proxy: false, vpn: false, score: 20, risk: 'LOW' },
    { ip: '198.51.100.10', country: 'US', city: 'Los Angeles', asn: 'AS7922', org: 'Comcast Cable', isp: 'Comcast', net: 'RESIDENTIAL', dc: false, res: true, mob: false, proxy: false, vpn: false, score: 10, risk: 'LOW' },
    { ip: '198.51.100.20', country: 'GB', city: 'London', asn: 'AS13335', org: 'Cloudflare, Inc.', isp: 'Cloudflare', net: 'DATACENTER', dc: true, res: false, mob: false, proxy: true, vpn: false, score: 55, risk: 'MEDIUM' },
    { ip: '198.51.100.30', country: 'JP', city: 'Tokyo', asn: 'AS2516', org: 'KDDI CORPORATION', isp: 'KDDI', net: 'ISP', dc: false, res: true, mob: false, proxy: false, vpn: false, score: 15, risk: 'LOW' },
    { ip: '198.51.100.40', country: 'DE', city: 'Berlin', asn: 'AS3320', org: 'Deutsche Telekom AG', isp: 'Deutsche Telekom', net: 'ISP', dc: false, res: true, mob: false, proxy: false, vpn: false, score: 20, risk: 'LOW' },
    { ip: '198.51.100.50', country: 'FR', city: 'Paris', asn: 'AS16276', org: 'OVH SAS', isp: 'OVH', net: 'DATACENTER', dc: true, res: false, mob: false, proxy: true, vpn: true, score: 75, risk: 'HIGH' },
  ]

  for (const r of ips) {
    await prisma.ipIntelligence.create({
      data: {
        ip: r.ip, country: r.country, city: r.city, asn: r.asn, asOrganization: r.org, isp: r.isp,
        networkType: r.net as 'DATACENTER' | 'RESIDENTIAL' | 'ISP',
        isDatacenter: r.dc, isResidentialLike: r.res, isMobileLike: r.mob,
        isProxyLike: r.proxy, isVpnLike: r.vpn,
        internalRiskScore: r.score,
        riskLevel: r.risk as 'LOW' | 'MEDIUM' | 'HIGH',
        lastCheckedAt: new Date(now.getTime() - 3600000),
      },
    })
  }

  // Reminders
  await prisma.reminder.create({
    data: {
      title: 'APAC-01 VPS 即将到期',
      reminderType: 'VPS_EXPIRATION',
      dueAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      status: 'PENDING',
      message: 'APAC-01 将在 5 天后到期，请及时续费',
    },
  })

  await prisma.reminder.create({
    data: {
      title: 'FR-Residential SOCKS5 即将到期',
      reminderType: 'SOCKS5_EXPIRATION',
      dueAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      status: 'PENDING',
      message: '法国住宅代理将在 3 天后到期',
    },
  })

  await prisma.reminder.create({
    data: {
      title: 'EU-West-01 健康检查失败',
      reminderType: 'HEALTH_FAILURE',
      dueAt: new Date(now.getTime() - 2 * 3600000),
      status: 'PENDING',
      message: 'EU-West-01 健康检查失败，需要排查',
    },
  })

  await prisma.reminder.create({
    data: {
      title: 'JP-Residential-01 离线',
      reminderType: 'HEALTH_FAILURE',
      dueAt: new Date(now.getTime() - 5 * 3600000),
      status: 'PENDING',
      message: '日本代理已离线，需要检查',
    },
  })

  await prisma.reminder.create({
    data: {
      title: '手动提醒：检查客户 B 的使用情况',
      reminderType: 'MANUAL',
      dueAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      status: 'PENDING',
      message: '下周需要检查客户 B 的数据采集使用情况',
    },
  })

  // App Settings
  await prisma.appSetting.upsert({
    where: { key: 'app_name' },
    update: {},
    create: { key: 'app_name', value: 'ProxyOps Manager' },
  })
  await prisma.appSetting.upsert({
    where: { key: 'default_currency' },
    update: {},
    create: { key: 'default_currency', value: 'USD' },
  })

  console.log('演示 seed 数据已创建。')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
