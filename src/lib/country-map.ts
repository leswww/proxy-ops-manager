// ISO 3166-1 alpha-2 country code to Chinese name mapping
const countryNames: Record<string, string> = {
  US: '美国', CN: '中国', JP: '日本', KR: '韩国', GB: '英国', DE: '德国',
  FR: '法国', IT: '意大利', ES: '西班牙', NL: '荷兰', SG: '新加坡',
  HK: '中国香港', TW: '中国台湾', AU: '澳大利亚', CA: '加拿大', BR: '巴西',
  IN: '印度', RU: '俄罗斯', UA: '乌克兰', PL: '波兰', SE: '瑞典',
  NO: '挪威', FI: '芬兰', DK: '丹麦', AT: '奥地利', CH: '瑞士',
  BE: '比利时', CZ: '捷克', PT: '葡萄牙', IE: '爱尔兰', RO: '罗马尼亚',
  BG: '保加利亚', HU: '匈牙利', SK: '斯洛伐克', LT: '立陶宛', LV: '拉脱维亚',
  EE: '爱沙尼亚', HR: '克罗地亚', SI: '斯洛文尼亚', GR: '希腊', TH: '泰国',
  VN: '越南', MY: '马来西亚', ID: '印度尼西亚', PH: '菲律宾', NZ: '新西兰',
  MX: '墨西哥', AR: '阿根廷', CL: '智利', CO: '哥伦比亚', ZA: '南非',
  EG: '埃及', NG: '尼日利亚', KE: '肯尼亚', AE: '阿联酋', SA: '沙特阿拉伯',
  IL: '以色列', TR: '土耳其', PK: '巴基斯坦', BD: '孟加拉', MM: '缅甸',
  KH: '柬埔寨', LA: '老挝', MN: '蒙古', NP: '尼泊尔', LK: '斯里兰卡',
  KZ: '哈萨克斯坦', UZ: '乌兹别克斯坦', GE: '格鲁吉亚', AM: '亚美尼亚',
  AZ: '阿塞拜疆', RS: '塞尔维亚', BA: '波黑', MK: '北马其顿', AL: '阿尔巴尼亚',
  CY: '塞浦路斯', MT: '马耳他', IS: '冰岛', LU: '卢森堡', MO: '澳门',
}

export const commonCountryOptions = [
  { code: 'US', name: '美国' },
  { code: 'JP', name: '日本' },
  { code: 'SG', name: '新加坡' },
  { code: 'DE', name: '德国' },
  { code: 'GB', name: '英国' },
  { code: 'HK', name: '中国香港' },
  { code: 'TW', name: '中国台湾' },
  { code: 'KR', name: '韩国' },
  { code: 'FR', name: '法国' },
  { code: 'CA', name: '加拿大' },
  { code: 'AU', name: '澳大利亚' },
  { code: 'NL', name: '荷兰' },
]

const countryNameToCode = Object.entries(countryNames).reduce<Record<string, string>>((acc, [code, name]) => {
  acc[name] = code
  return acc
}, {})

countryNameToCode['中国香港'] = 'HK'
countryNameToCode['中国台湾'] = 'TW'

export function countryCodeToFlag(code: string | null | undefined) {
  if (!code || !/^[A-Z]{2}$/i.test(code)) return ''
  return code
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('')
}

export function getCountryName(code: string | null | undefined): string | null {
  if (!code) return null
  return countryNames[code.toUpperCase()] || null
}

export function getCountryDisplay(code: string | null | undefined): { code: string; name: string } | null {
  if (!code) return null
  const raw = code.trim()
  const upper = raw.toUpperCase()
  const name = countryNames[upper]
  if (name) return { code: upper, name }
  const matchedCode = countryNameToCode[raw]
  if (matchedCode) return { code: matchedCode, name: raw }
  return { code: '', name: raw }
}
