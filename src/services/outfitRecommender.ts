import {
  ClothingItem,
  Outfit,
  OutfitRecommendation,
  Weather,
} from '../types';
import { getIdleBoost, getBrandAffinity, getThicknessTempComfort } from './implicitSignals';

// ── 色相家族（HSL 回退用） ──
const HUE_FAMILY: Record<string, string> = {
  '红色': 'red', '酒红色': 'red', '砖红色': 'red', '粉红': 'red',
  '玫红色': 'red', '桃红色': 'red', '橘红色': 'red', '紫红色': 'red',
  '橙色': 'orange', '金色': 'orange',
  '黄色': 'yellow', '姜黄色': 'yellow',
  '绿色': 'green', '军绿色': 'green', '墨绿色': 'green', '薄荷绿': 'green',
  '翠绿色': 'green', '草绿色': 'green',
  '蓝色': 'blue', '深蓝': 'blue', '浅蓝': 'blue', '藏青色': 'blue',
  '天蓝色': 'blue', '宝蓝色': 'blue', '湖蓝色': 'blue', '牛仔蓝': 'blue',
  '靛蓝色': 'blue', '水洗蓝': 'blue', '青色': 'blue',
  '紫色': 'purple', '薰衣草': 'purple', '粉色': 'purple',
  '棕色': 'brown', '咖啡色': 'brown', '卡其色': 'brown', '驼色': 'brown',
  '杏色': 'brown', '米色': 'brown', '米白': 'brown', '奶油色': 'brown', '香槟色': 'brown',
  '黑色': 'neutral', '白色': 'neutral', '深灰': 'neutral', '浅灰': 'neutral',
  '灰色': 'neutral', '银灰色': 'neutral', '银色': 'neutral', '其他': 'neutral',
};

// 互补色对（时尚进阶搭配）：红↔绿, 蓝↔橙, 紫↔黄
const COMPLEMENTARY: Record<string, string> = {
  red: 'green', green: 'red', blue: 'orange', orange: 'blue',
  purple: 'yellow', yellow: 'purple',
};

// 相邻色族（柔和过渡）
const ADJACENT: Record<string, string[]> = {
  red: ['orange', 'purple', 'brown'],
  orange: ['red', 'yellow', 'brown'],
  yellow: ['orange', 'green'],
  green: ['yellow', 'blue'],
  blue: ['green', 'purple'],
  purple: ['blue', 'red'],
  brown: ['red', 'orange'],
};

// ── 颜色协调规则 ──
const COLOR_HARMONY: Record<string, string[]> = {
  // 黑灰白系
  '黑色': ['白色', '灰色', '蓝色', '红色', '绿色', '粉色', '棕色', '卡其色', '米色', '酒红色', '藏青色'],
  '深灰': ['白色', '黑色', '蓝色', '粉色', '绿色', '酒红色'],
  '浅灰': ['黑色', '白色', '蓝色', '粉色', '紫色', '绿色'],
  '白色': ['黑色', '灰色', '蓝色', '红色', '绿色', '粉色', '棕色', '卡其色', '黄色', '米色', '藏青色', '军绿色'],
  '米白': ['黑色', '蓝色', '棕色', '绿色', '卡其色'],
  '奶油色': ['黑色', '蓝色', '棕色', '咖啡色'],
  // 红色系
  '红色': ['黑色', '白色', '灰色', '蓝色', '棕色', '米色'],
  '酒红色': ['黑色', '白色', '灰色', '米色'],
  '砖红色': ['黑色', '白色', '蓝色', '卡其色'],
  '粉红': ['黑色', '白色', '灰色', '蓝色'],
  // 蓝色系
  '蓝色': ['黑色', '白色', '灰色', '棕色', '米色', '卡其色'],
  '深蓝': ['白色', '灰色', '米色', '卡其色'],
  '浅蓝': ['白色', '黑色', '灰色', '棕色'],
  '藏青色': ['白色', '灰色', '米色', '卡其色'],
  // 绿色系
  '绿色': ['黑色', '白色', '灰色', '棕色', '米色', '蓝色'],
  '军绿色': ['黑色', '白色', '棕色', '卡其色'],
  '墨绿色': ['白色', '米色', '卡其色'],
  '薄荷绿': ['白色', '黑色', '蓝色'],
  // 黄橙系
  '黄色': ['黑色', '白色', '蓝色', '棕色', '灰色'],
  '姜黄色': ['黑色', '白色', '蓝色', '棕色'],
  '橙色': ['黑色', '白色', '蓝色', '棕色'],
  // 紫粉系
  '紫色': ['黑色', '白色', '灰色', '蓝色', '粉色'],
  '薰衣草': ['白色', '黑色', '灰色'],
  '粉色': ['黑色', '白色', '灰色', '蓝色', '紫色'],
  // 棕卡系
  '棕色': ['黑色', '白色', '蓝色', '绿色', '米色', '红色', '卡其色'],
  '咖啡色': ['黑色', '白色', '米色', '卡其色', '蓝色'],
  '卡其色': ['黑色', '白色', '蓝色', '棕色', '绿色', '红色'],
  '驼色': ['黑色', '白色', '蓝色', '棕色'],
  // 其他
  '青色': ['白色', '黑色', '灰色'],
  '灰色': ['黑色', '白色', '蓝色', '粉色', '紫色', '绿色', '酒红色'],
  '米色': ['黑色', '白色', '蓝色', '棕色', '绿色', '红色', '藏青色', '咖啡色'],
  '银灰色': ['黑色', '白色', '蓝色', '粉色', '紫色'],
  '杏色': ['黑色', '白色', '蓝色', '棕色', '卡其色'],
  '玫红色': ['黑色', '白色', '灰色', '蓝色'],
  '桃红色': ['黑色', '白色', '灰色', '蓝色'],
  '橘红色': ['黑色', '白色', '蓝色', '棕色', '灰色'],
  '天蓝色': ['白色', '黑色', '灰色', '棕色', '米色'],
  '宝蓝色': ['白色', '灰色', '米色', '卡其色'],
  '湖蓝色': ['白色', '黑色', '灰色', '米色'],
  '牛仔蓝': ['白色', '黑色', '灰色', '米色', '棕色', '卡其色'],
  '靛蓝色': ['白色', '灰色', '米色', '卡其色'],
  '水洗蓝': ['白色', '黑色', '灰色', '米色', '棕色'],
  '翠绿色': ['黑色', '白色', '灰色', '米色', '棕色'],
  '草绿色': ['白色', '黑色', '灰色', '米色'],
  '金色': ['黑色', '白色', '蓝色', '棕色', '灰色'],
  '紫红色': ['黑色', '白色', '灰色', '蓝色'],
  '香槟色': ['黑色', '白色', '蓝色', '棕色', '卡其色'],
  '银色': ['黑色', '白色', '蓝色', '粉色', '紫色'],
  '其他': ['黑色', '白色', '灰色', '蓝色'],
};

const NEUTRAL_COLORS = new Set(['黑色', '白色', '灰色', '米色', '米白', '奶油色', '咖啡色', '藏青色', '深灰', '浅灰', '卡其色', '驼色', '银灰色', '杏色', '香槟色', '银色', '其他']);

/** 强烈冲突色对 */
const CLASH_PAIRS: [string, string][] = [
  ['红色', '绿色'],
  ['红色', '粉色'],
  ['红色', '粉红'],
  ['红色', '翠绿色'],
  ['绿色', '橙色'],
  ['绿色', '玫红色'],
  ['蓝色', '橙色'],
  ['蓝色', '橘红色'],
  ['紫色', '黄色'],
  ['紫色', '草绿色'],
  ['军绿色', '红色'],
  ['薄荷绿', '粉色'],
  ['薄荷绿', '桃红色'],
  ['翠绿色', '红色'],
  ['翠绿色', '橙色'],
  ['草绿色', '紫色'],
  ['玫红色', '橘红色'],
  ['紫红色', '黄色'],
  ['橘红色', '宝蓝色'],
];

// ── 共现矩阵缓存（模块级，outfits 不变时复用） ──
let _cachedPairFreq: Map<string, number> | null = null;
let _cachedItemDiversity: Map<number, number> | null = null;
let _cacheOutfitKey = '';

function getCachedMatrices(outfits: Outfit[]): {
  pairFreq: Map<string, number>;
  itemDiversity: Map<number, number>;
} {
  // 用 outfit ID 序列 + 数量做简易 digest
  const key = outfits.length + '|' + outfits.map(o => o.id).sort((a, b) => a - b).join(',');
  if (key !== _cacheOutfitKey) {
    _cachedPairFreq = buildPairFrequency(outfits);
    _cachedItemDiversity = buildItemDiversity(outfits);
    _cacheOutfitKey = key;
    console.log(`[cache] rebuilt matrices for ${outfits.length} outfits`);
  } else {
    console.log(`[cache] reusing cached matrices`);
  }
  return { pairFreq: _cachedPairFreq!, itemDiversity: _cachedItemDiversity! };
}

/** Fisher-Yates 洗牌（原地） */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── 天气 → 季节映射 ──
function getSeasonFromTemp(temperature: number): string {
  if (temperature < 10) return '冬';
  if (temperature < 20) return '秋';
  if (temperature < 26) return '春';
  return '夏';
}

// ── 加权随机选择 ──
function weightedRandomSelect<T>(candidates: T[], getWeight: (item: T) => number): T {
  if (candidates.length === 1) return candidates[0];
  const weights = candidates.map(getWeight);
  const totalWeight = weights.reduce((sum, w) => sum + Math.max(0, w), 0);
  if (totalWeight <= 0) return candidates[Math.floor(Math.random() * candidates.length)];
  let r = Math.random() * totalWeight;
  for (let i = 0; i < candidates.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

/** 两个颜色是否协调（支持逗号分隔的多色值） */
function colorsCompatible(c1: string, c2: string): boolean {
  const colors1 = c1.split(',').map(c => c.trim()).filter(Boolean);
  const colors2 = c2.split(',').map(c => c.trim()).filter(Boolean);
  if (colors1.length === 0 || colors2.length === 0) return true;
  // 如果存在任意一对不协调的颜色，返回 false
  for (const a of colors1) {
    for (const b of colors2) {
      if (!singleColorsCompatible(a, b)) return false;
    }
  }
  return true;
}

function singleColorsCompatible(c1: string, c2: string): boolean {
  if (!c1 || !c2 || c1 === c2) return true;
  // 先查精确规则表
  const allowed = COLOR_HARMONY[c1];
  if (allowed) return allowed.includes(c2);
  const reverse = COLOR_HARMONY[c2];
  if (reverse) return reverse.includes(c1);
  // HSL 色相族回退：不再对未知颜色一律放行
  const f1 = HUE_FAMILY[c1];
  const f2 = HUE_FAMILY[c2];
  if (!f1 || !f2) return true; // 完全未知则保守放行
  if (f1 === f2) return true;  // 同族协调
  if (f1 === 'neutral' || f2 === 'neutral') return true; // 中性色百搭
  // 互补色（红↔绿, 蓝↔橙, 紫↔黄）在时尚中可大胆搭配
  if (COMPLEMENTARY[f1] === f2) return true;
  // 相邻色族柔和过渡
  if (ADJACENT[f1]?.includes(f2)) return true;
  // 其他跨族组合保守拒绝
  return false;
}

// ═════════════════════════════════════════════════
// Step 1: 候选单品过滤
// ═════════════════════════════════════════════════
function filterByWeather(items: ClothingItem[], weather: Weather | null): ClothingItem[] {
  if (!weather) return items;
  const t = weather.temperature;
  const season = getSeasonFromTemp(t);
  const isRainy = weather.condition === '雨' || weather.condition === '雪';

  console.log(`[filterByWeather] temp=${t}°C season=${season} rainy=${isRainy} total=${items.length}`);

  // 温和温度 (15–25°C): 不硬过滤季节，小衣橱经不起砍 2/3
  // 只根据厚薄排除明显不合时宜的单品
  if (t >= 15 && t <= 25) {
    const result = items.filter(item => {
      const ep = effectiveParent(item);
      // 厚款/加厚外套在 > 20°C 不合适
      if (t > 20 && (item.thickness === '厚款' || item.thickness === '加厚') && ep === '外套') return false;
      // 加厚任何品类在 > 22°C 不合适
      if (t > 22 && item.thickness === '加厚') return false;
      return true;
    });
    const excluded = items.filter(i => !result.includes(i));
    if (excluded.length > 0) {
      console.log(`[filterByWeather] mild temp — excluded thick items:`, excluded.map(i => `#${i.id} ${i.type}(${i.thickness}/${effectiveParent(i)})`));
    }
    console.log(`[filterByWeather] mild temp — kept ${result.length}/${items.length}`);
    return result;
  }

  // 极端温度: 季节硬过滤 + 厚薄过滤
  const seasonFiltered = items.filter(item => item.seasons.includes(season));
  const excludedBySeason = items.filter(item => !item.seasons.includes(season));
  console.log(`[filterByWeather] extreme temp — seasonFiltered: ${seasonFiltered.length} excluded:`, excludedBySeason.slice(0, 10).map(i => `#${i.id} ${i.type}(${i.seasons.join('/')})`));

  const pool = seasonFiltered.length >= 5 ? seasonFiltered : items;

  const result = pool.filter(item => {
    const ep = effectiveParent(item);
    if (t < 15 && item.thickness === '薄款' && ep !== '上装') return false;
    if (t > 28 && item.thickness === '厚款' && ep === '外套') return false;
    return true;
  });
  console.log(`[filterByWeather] extreme temp — final pool: ${result.length}`);
  return result;
}

// ═════════════════════════════════════════════════
// Step 2: 共现频率矩阵
// ═════════════════════════════════════════════════
function buildPairFrequency(outfits: Outfit[]): Map<string, number> {
  const pairCounts = new Map<string, number>();
  let maxCount = 0;

  for (const outfit of outfits) {
    const ids = outfit.itemIds;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i], b = ids[j];
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        const count = (pairCounts.get(key) || 0) + 1;
        pairCounts.set(key, count);
        if (count > maxCount) maxCount = count;
      }
    }
  }

  console.log(`[buildPairFrequency] outfits=${outfits.length} totalPairs=${pairCounts.size} maxCount=${maxCount}`);

  // 归一化到 [0, 1]
  if (maxCount > 0) {
    for (const [key, count] of pairCounts) {
      pairCounts.set(key, count / maxCount);
    }
  }

  return pairCounts;
}

function getPairFreq(pairFreq: Map<string, number>, id1: number, id2: number): number {
  const key = id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
  return pairFreq.get(key) || 0;
}

/** 搭配广度：每个 item 在历史 outfit 中搭配过的不同单品数量 */
function buildItemDiversity(outfits: Outfit[]): Map<number, number> {
  const map = new Map<number, Set<number>>();
  for (const outfit of outfits) {
    for (const a of outfit.itemIds) {
      if (!map.has(a)) map.set(a, new Set());
      for (const b of outfit.itemIds) {
        if (a !== b) map.get(a)!.add(b);
      }
    }
  }
  const diversity = new Map<number, number>();
  for (const [id, set] of map) {
    diversity.set(id, set.size);
  }
  if (diversity.size > 0) {
    const vals = [...diversity.values()];
    console.log(`[buildItemDiversity] items=${diversity.size} min=${Math.min(...vals)} max=${Math.max(...vals)} avg=${(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1)}`);
  } else {
    console.log(`[buildItemDiversity] EMPTY — no outfit history!`);
  }
  return diversity;
}

/**
 * 穿着间隔权重：最近穿过的单品降低推荐优先级。
 * 窗口随季节变化 — 夏长（出汗多）冬短（外套可重复穿）。
 */
function recencyMultiplier(
  id: number,
  recentlyWornDays?: Map<number, number>,
  season?: string,
  userRepeatInterval?: number | null,
): number {
  if (!recentlyWornDays) return 1.0;
  const daysAgo = recentlyWornDays.get(id);
  if (daysAgo === undefined) return 1.0; // 没穿过，满分
  if (daysAgo === 0) return 0.01;        // 今天刚穿，几乎不推荐
  // User preference takes priority; season defaults as fallback
  const window = userRepeatInterval != null
    ? userRepeatInterval
    : season === '夏' ? 7 : season === '冬' ? 4 : 5;
  if (daysAgo >= window) return 1.0;      // 超出窗口，不受影响
  return daysAgo / window;                // 线性恢复：1天前 → 0.14~0.25, 越靠近窗口越接近 1.0
}

/** 获取有效的分类：parentType 优先，为空时用 type 推断 */
function effectiveParent(item: ClothingItem): string {
  if (item.parentType) return item.parentType;
  // 尝试从 type 推断常见分类
  const t = item.type;
  if (['T恤', '衬衫', '卫衣', '毛衣', '针织衫', 'Polo衫', '背心', '打底衫', 'POLO衫', '长袖', '短袖', '雪纺衫', '马甲'].includes(t)) return '上装';
  if (['牛仔裤', '休闲裤', '西裤', '运动裤', '短裤', '工装裤', '阔腿裤', '直筒裤', '九分裤', '裙子', '半身裙', '长裤'].includes(t)) return '下装';
  if (['连衣裙', '连体裤', '吊带裙', '背带裙', '长裙', '短裙', '旗袍'].includes(t)) return '连衣裙';
  if (['外套', '夹克', '风衣', '大衣', '羽绒服', '棉服', '西装', '棒球服', '牛仔外套', '皮衣', '针织开衫', '派克大衣'].includes(t)) return '外套';
  if (['运动鞋', '休闲鞋', '皮鞋', '靴子', '凉鞋', '帆布鞋', '高跟鞋', '拖鞋', '板鞋', '乐福鞋', '马丁靴'].includes(t)) return '鞋';
  if (['包包', '背包', '手提包', '斜挎包', '双肩包', '单肩包', '钱包', '腰包'].includes(t)) return '包包';
  if (['帽子', '围巾', '手套', '腰带', '眼镜', '首饰', '手表', '项链', '耳环', '手链', '戒指'].includes(t)) return '配饰';
  return t;
}

/** 是否需要内搭上衣：背带裙/吊带裙等设计为叠穿的连衣裙 */
function dressNeedsTop(item: ClothingItem): boolean {
  const keywords = ['背带', '吊带', '马甲'];
  return keywords.some(kw => item.type.includes(kw));
}

// ═════════════════════════════════════════════════
// Step 3: 生成候选搭配
// ═════════════════════════════════════════════════
function generateCandidates(
  items: ClothingItem[],
  selectedItem?: ClothingItem,
  maxCandidates: number = 40,
  recentRecommendedItemIds?: Set<number>,
  itemDiversity?: Map<number, number>,
  pairFreq?: Map<string, number>,
  season?: string,
  recentlyWornDays?: Map<number, number>,
  idleBoost?: Map<number, number>,
  brandAffinity?: Map<number, number>,
  userRepeatInterval?: number | null,
  userLayering?: 'often' | 'sometimes' | 'rarely',
  userAccessory?: 'often' | 'sometimes' | 'rarely',
): ClothingItem[][] {
  const tops = items.filter(i => effectiveParent(i) === '上装');
  const bottoms = items.filter(i => effectiveParent(i) === '下装');
  const shoes = items.filter(i => effectiveParent(i) === '鞋');
  const outers = items.filter(i => effectiveParent(i) === '外套');
  const dresses = items.filter(i => effectiveParent(i) === '连衣裙');
  const bags = items.filter(i => effectiveParent(i) === '包包');

  // Layering preference affects outer probability
  const outerBase = userLayering === 'often' ? 0.70 : userLayering === 'rarely' ? 0.15 : 0.50;
  const outerProb = season === '冬' ? Math.min(1, outerBase + 0.20) : season === '夏' ? Math.max(0.05, outerBase - 0.35) : outerBase;
  // Accessory preference affects bag probability
  const bagBase = userAccessory === 'often' ? 0.70 : userAccessory === 'rarely' ? 0.20 : 0.55;
  const bagProb = bags.length > 0 ? bagBase : 0;

  // 搭配历史太少（< 5 个 outfit）时 compat gate 反而有害：矩阵太稀疏，
  // 大部分 compat() 返回空集后回退到全量，导致少数有历史记录的单品被反复选中。
  const compatEnabled = pairFreq && pairFreq.size >= 5;
  console.log(`[generateCandidates] pools — tops:${tops.length} bottoms:${bottoms.length} shoes:${shoes.length} outers:${outers.length} dresses:${dresses.length} bags:${bags.length} season:${season} outerProb:${outerProb} compatEnabled:${compatEnabled}`);

  const candidates: ClothingItem[][] = [];
  const seen = new Set<string>();
  const hasShoes = shoes.length > 0;
  const hasBags = bags.length > 0;

  function add(outfitItems: ClothingItem[]) {
    if (outfitItems.length < 2) return;
    const key = [...outfitItems.map(i => i.id)].sort((a, b) => a - b).join(',');
    if (!seen.has(key)) {
      seen.add(key);
      candidates.push(outfitItems);
    }
  }

  // 组合权重：新鲜度 × 穿着间隔 × 搭配广度
  function fw(id: number): number {
    const fresh = recentRecommendedItemIds?.has(id) ? 0.05 : 1.0;
    const diversity = 1 + (itemDiversity?.get(id) || 0);
    const recency = recencyMultiplier(id, recentlyWornDays, season, userRepeatInterval);
    const idle = 1 + (idleBoost?.get(id) || 0);
    const brand = 1 + (brandAffinity?.get(id) || 0);
    return fresh * recency * diversity * idle * brand;
  }

  // 兼容性过滤：只保留历史上与 targetId 搭配过的单品
  // 若无历史数据则返回全量（冷启动宽容）
  function compat(pool: ClothingItem[], targetId: number): ClothingItem[] {
    if (!pairFreq) return pool;
    const filtered = pool.filter(item => getPairFreq(pairFreq, targetId, item.id) > 0);
    return filtered.length > 0 ? filtered : pool;
  }

  // 双目标兼容：至少与其中一个搭配过
  function compatEither(pool: ClothingItem[], id1: number, id2: number): ClothingItem[] {
    if (!pairFreq) return pool;
    const filtered = pool.filter(item =>
      getPairFreq(pairFreq, id1, item.id) > 0 || getPairFreq(pairFreq, id2, item.id) > 0,
    );
    return filtered.length > 0 ? filtered : pool;
  }

  // 三目标兼容（上装+下装+外套）：至少与其中一个搭配过
  function compatAny(pool: ClothingItem[], ids: number[]): ClothingItem[] {
    if (!pairFreq) return pool;
    const filtered = pool.filter(item =>
      ids.some(id => getPairFreq(pairFreq, id, item.id) > 0),
    );
    return filtered.length > 0 ? filtered : pool;
  }

  // 情况 A: 有选中单品，优先围绕它搭配
  if (selectedItem) {
    const pt = effectiveParent(selectedItem);
    for (let i = 0; i < maxCandidates; i++) {
      if (pt === '上装' && bottoms.length > 0) {
        const bottom = weightedRandomSelect(compat(bottoms, selectedItem.id), b => fw(b.id));
        const outfit = [selectedItem, bottom];
        if (hasShoes) {
          outfit.push(weightedRandomSelect(compatEither(shoes, selectedItem.id, bottom.id), s => fw(s.id)));
        }
        if (outers.length > 0 && Math.random() < outerProb) {
          outfit.push(weightedRandomSelect(compat(outers, selectedItem.id), o => fw(o.id)));
        }
        if (hasBags && Math.random() < bagProb) {
          outfit.push(weightedRandomSelect(compatAny(bags, outfit.map(o => o.id)), b => fw(b.id)));
        }
        add(outfit);
      } else if (pt === '下装' && tops.length > 0) {
        const top = weightedRandomSelect(compat(tops, selectedItem.id), t => fw(t.id));
        const outfit = [top, selectedItem];
        if (hasShoes) {
          outfit.push(weightedRandomSelect(compatEither(shoes, top.id, selectedItem.id), s => fw(s.id)));
        }
        if (outers.length > 0 && Math.random() < outerProb) {
          outfit.push(weightedRandomSelect(compat(outers, top.id), o => fw(o.id)));
        }
        if (hasBags && Math.random() < bagProb) {
          outfit.push(weightedRandomSelect(compatAny(bags, outfit.map(o => o.id)), b => fw(b.id)));
        }
        add(outfit);
      } else if (pt === '连衣裙') {
        const needsTop = dressNeedsTop(selectedItem) && tops.length > 0;
        const outfit: ClothingItem[] = [];
        if (needsTop) {
          const top = weightedRandomSelect(compat(tops, selectedItem.id), t => fw(t.id));
          outfit.push(top);
        }
        outfit.push(selectedItem);
        if (hasShoes) {
          outfit.push(weightedRandomSelect(compat(shoes, selectedItem.id), s => fw(s.id)));
        }
        if (outers.length > 0 && Math.random() < outerProb) {
          outfit.push(weightedRandomSelect(compat(outers, selectedItem.id), o => fw(o.id)));
        }
        if (hasBags && Math.random() < bagProb) {
          outfit.push(weightedRandomSelect(compatAny(bags, outfit.map(o => o.id)), b => fw(b.id)));
        }
        add(outfit);
      } else if (pt === '鞋' && tops.length > 0 && bottoms.length > 0) {
        const top = weightedRandomSelect(tops, t => fw(t.id));
        const bottom = weightedRandomSelect(compat(bottoms, top.id), b => fw(b.id));
        add([top, bottom, selectedItem]);
      } else if (pt === '外套' && tops.length > 0 && bottoms.length > 0) {
        const top = weightedRandomSelect(compat(tops, selectedItem.id), t => fw(t.id));
        const bottom = weightedRandomSelect(compat(bottoms, top.id), b => fw(b.id));
        const outfit = [top, bottom, selectedItem];
        if (hasShoes) outfit.push(shoes[Math.floor(Math.random() * shoes.length)]);
        add(outfit);
      } else {
        break;
      }
    }
  }

  // 情况 B: 无选中单品 / 补充候选，全局生成
  const canDress = dresses.length > 0;
  const canTopBottom = tops.length > 0 && bottoms.length > 0;

  if (!canDress && !canTopBottom) return candidates;

  let iterations = 0;
  const MAX_ITERATIONS = maxCandidates * 5;

  while (candidates.length < maxCandidates && iterations < MAX_ITERATIONS) {
    iterations++;
    const useDress = canDress && (!canTopBottom || Math.random() < 0.25);

    if (useDress) {
      const dress = weightedRandomSelect(dresses, d => fw(d.id));
      const needsTop = dressNeedsTop(dress) && tops.length > 0;
      const outfit: ClothingItem[] = [];
      if (needsTop) {
        const top = weightedRandomSelect(compat(tops, dress.id), t => fw(t.id));
        outfit.push(top);
      }
      outfit.push(dress);
      if (hasShoes) {
        outfit.push(weightedRandomSelect(compat(shoes, dress.id), s => fw(s.id)));
      }
      if (outers.length > 0 && Math.random() < outerProb) {
        outfit.push(weightedRandomSelect(compat(outers, dress.id), o => fw(o.id)));
      }
      if (hasBags && Math.random() < bagProb) {
        outfit.push(weightedRandomSelect(compatAny(bags, outfit.map(o => o.id)), b => fw(b.id)));
      }
      add(outfit);
    } else if (canTopBottom) {
      const top = weightedRandomSelect(tops, t => fw(t.id));
      const bottom = weightedRandomSelect(compat(bottoms, top.id), b => fw(b.id));
      const outfit = [top, bottom];
      if (hasShoes) {
        outfit.push(weightedRandomSelect(compatEither(shoes, top.id, bottom.id), s => fw(s.id)));
      }
      if (outers.length > 0 && Math.random() < outerProb) {
        outfit.push(weightedRandomSelect(compat(outers, top.id), o => fw(o.id)));
      }
      if (hasBags && Math.random() < bagProb) {
        outfit.push(weightedRandomSelect(compatAny(bags, outfit.map(o => o.id)), b => fw(b.id)));
      }
      add(outfit);
    }
  }

  return candidates;
}

// ═════════════════════════════════════════════════
// Step 4: 搭配评分
// ═════════════════════════════════════════════════
interface ScoredOutfit {
  items: ClothingItem[];
  pairFreqScore: number;
  styleScore: number;
  colorScore: number;
  weatherScore: number;
  favoriteScore: number;
  freshnessScore: number;
  recencyScore: number;
  userOutfitBoost: number;
  totalScore: number;
}

function computeThicknessBoost(
  items: ClothingItem[],
  thicknessComfort?: Map<number, number>,
): number {
  if (!thicknessComfort || thicknessComfort.size === 0) return 0;
  let sum = 0;
  for (const item of items) {
    sum += thicknessComfort.get(item.id) || 0;
  }
  return items.length > 0 ? sum / items.length : 0;
}

function scoreOutfits(
  candidates: ClothingItem[][],
  pairFreq: Map<string, number>,
  weather: Weather | null,
  favoriteSet: Set<number>,
  userOutfitSets: Set<string>,
  currentSeason: string,
  recentRecommendedItemIds?: Set<number>,
  recentlyWornDays?: Map<number, number>,
  likedItemIds?: Set<number>,
  preferredStyles?: string[],
  preferredColors?: string[],
  comfortVsAppearance?: 'comfort' | 'balanced' | 'appearance',
  preferredScenes?: string[],
  explorationLevel?: 'explore' | 'balanced' | 'conservative',
  colorBoldness?: 'safe' | 'moderate' | 'bold',
  thicknessComfort?: Map<number, number>,
): ScoredOutfit[] {
  // 权重方案：根据用户舒适/外观偏好调整
  const w = getWeights(comfortVsAppearance, explorationLevel);

  return candidates.map(items => {
    // 1. 共现频率
    const pairFreqScore = computePairFreqScore(items, pairFreq);

    // 2. 风格一致性
    const styleScore = computeStyleScore(items);

    // 3. 颜色协调度
    const colorScore = computeColorScore(items);

    // Color boldness adjustment
    const adjustedColorScore = colorBoldness === 'bold'
      ? Math.min(1, colorScore * 1.15)
      : colorBoldness === 'safe'
      ? colorScore * 0.9
      : colorScore;

    // 4. 天气匹配度
    const weatherScore = computeWeatherScore(items, weather, currentSeason);

    // 5. 偏好单品
    const favoriteScore = computeFavoriteScore(items, favoriteSet);

    // 6. 新鲜度
    const freshnessScore = computeFreshnessScore(items, recentRecommendedItemIds);

    // 7. 穿着间隔
    const recencyScore = computeRecencyScore(items, recentlyWornDays, currentSeason);

    // 用户自定义搭配加成
    const key = [...items.map(i => i.id)].sort((a, b) => a - b).join(',');
    const userOutfitBoost = userOutfitSets.has(key) ? 0.30 : 0;

    // 用户喜欢单品加成
    const likedBoost = computeLikedBoost(items, likedItemIds);

    // 用户风格偏好加成
    const stylePrefBoost = computeStylePrefBoost(items, preferredStyles);

    // 用户色系偏好加成
    const colorPrefBoost = computeColorPrefBoost(items, preferredColors);

    // 用户场景偏好加成
    const sceneBoost = computeSceneBoost(preferredScenes, weather);

    const thicknessBoost = computeThicknessBoost(items, thicknessComfort);

    const totalScore =
      w.pairFreq * pairFreqScore +
      w.style * styleScore +
      w.color * adjustedColorScore +
      w.weather * weatherScore +
      w.favorite * favoriteScore +
      w.freshness * freshnessScore +
      w.recency * recencyScore +
      userOutfitBoost +
      likedBoost +
      stylePrefBoost +
      colorPrefBoost +
      sceneBoost +
      thicknessBoost;

    return { items, pairFreqScore, styleScore, colorScore, weatherScore, favoriteScore, freshnessScore, recencyScore, userOutfitBoost, totalScore };
  });
}

function getWeights(
  preference?: 'comfort' | 'balanced' | 'appearance',
  exploration?: 'explore' | 'balanced' | 'conservative',
) {
  const exploreWeights = exploration === 'explore'
    ? { pairFreq: 0.05, freshness: 0.30 }
    : exploration === 'conservative'
    ? { pairFreq: 0.25, freshness: 0.10 }
    : { pairFreq: 0.15, freshness: 0.20 };

  switch (preference) {
    case 'comfort':
      return { ...exploreWeights, style: 0.20, color: 0.15, weather: 0.15, favorite: 0.10, recency: 0.05 };
    case 'appearance':
      return { ...exploreWeights, style: 0.30, color: 0.15, weather: 0.05, favorite: 0.10, recency: 0.05 };
    default:
      return { ...exploreWeights, style: 0.25, color: 0.15, weather: 0.10, favorite: 0.10, recency: 0.05 };
  }
}

function computeLikedBoost(items: ClothingItem[], likedItemIds?: Set<number>): number {
  if (!likedItemIds || likedItemIds.size === 0) return 0;
  const likedCount = items.filter(i => likedItemIds.has(i.id)).length;
  return items.length > 0 ? (likedCount / items.length) * 0.15 : 0;
}

function computeStylePrefBoost(items: ClothingItem[], preferredStyles?: string[]): number {
  if (!preferredStyles || preferredStyles.length === 0) return 0;
  const prefSet = new Set(preferredStyles);
  let matchCount = 0;
  let totalTags = 0;
  for (const item of items) {
    for (const tag of item.tags) {
      totalTags++;
      if (prefSet.has(tag)) matchCount++;
    }
  }
  return totalTags > 0 ? (matchCount / totalTags) * 0.10 : 0;
}

function computeColorPrefBoost(items: ClothingItem[], preferredColors?: string[]): number {
  if (!preferredColors || preferredColors.length === 0) return 0;
  // 将色系名称展开为具体颜色
  const expanded = new Set<string>();
  for (const family of preferredColors) {
    const colors = COLOR_FAMILY_MAP[family];
    if (colors) for (const c of colors) expanded.add(c);
  }
  if (expanded.size === 0) return 0;
  let matchCount = 0;
  for (const item of items) {
    const colors = (item.color || '').split(',').map(c => c.trim()).filter(Boolean);
    if (colors.some(c => expanded.has(c))) matchCount++;
  }
  return items.length > 0 ? (matchCount / items.length) * 0.08 : 0;
}

function computeSceneBoost(preferredScenes?: string[], weather?: Weather | null): number {
  if (!preferredScenes || preferredScenes.length === 0 || !weather) return 0;
  const currentScene = inferScene(weather);
  return preferredScenes.includes(currentScene) ? 0.05 : 0;
}

const COLOR_FAMILY_MAP: Record<string, string[]> = {
  '黑灰白系': ['黑色', '白色', '灰色', '深灰', '浅灰', '米白', '米色', '银灰色'],
  '红色系': ['红色', '酒红色', '砖红色', '粉红', '玫红色'],
  '蓝色系': ['蓝色', '深蓝', '浅蓝', '藏青色', '天蓝色', '牛仔蓝'],
  '绿色系': ['绿色', '军绿色', '墨绿色', '薄荷绿'],
  '棕卡系': ['棕色', '咖啡色', '卡其色', '驼色'],
  '彩色系': ['黄色', '橙色', '紫色', '粉色'],
};

/** 共现频率分：outfit 内所有 pair 的平均共现概率 */
function computePairFreqScore(items: ClothingItem[], pairFreq: Map<string, number>): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      sum += getPairFreq(pairFreq, items[i].id, items[j].id);
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

/** 风格一致性：所有物品标签的 Jaccard 相似度平均值 */
function computeStyleScore(items: ClothingItem[]): number {
  const tagSets = items.map(i => new Set(i.tags));
  let sum = 0;
  let count = 0;
  for (let i = 0; i < tagSets.length; i++) {
    for (let j = i + 1; j < tagSets.length; j++) {
      if (tagSets[i].size === 0 && tagSets[j].size === 0) {
        sum += 0.5;
      } else {
        const intersection = [...tagSets[i]].filter(t => tagSets[j].has(t)).length;
        const union = new Set([...tagSets[i], ...tagSets[j]]).size;
        sum += union > 0 ? intersection / union : 0;
      }
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

/** 颜色协调度：逐对检查 + 中性色加分 */
function computeColorScore(items: ClothingItem[]): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const colors1 = (items[i].color || '').split(',').map(c => c.trim()).filter(Boolean);
      const colors2 = (items[j].color || '').split(',').map(c => c.trim()).filter(Boolean);
      if (colors1.length === 0 || colors2.length === 0) {
        sum += 0.8;
      } else {
        // 对每对颜色取最差分数
        let pairScore = 1;
        for (const c1 of colors1) {
          for (const c2 of colors2) {
            let s: number;
            if (c1 === c2) {
              s = 0.8;
            } else if (isClash(c1, c2)) {
              s = -1.0;
            } else if (NEUTRAL_COLORS.has(c1) || NEUTRAL_COLORS.has(c2)) {
              s = 0.6;
            } else if (singleColorsCompatible(c1, c2)) {
              s = 0.8;
            } else {
              s = 0.2;
            }
            pairScore = Math.min(pairScore, s);
          }
        }
        sum += pairScore;
      }
      count++;
    }
  }
  if (count === 0) return 0.5;
  return Math.max(0, Math.min(1, (sum / count + 1) / 2));
}

function isClash(c1: string, c2: string): boolean {
  return CLASH_PAIRS.some(([a, b]) =>
    (c1 === a && c2 === b) || (c1 === b && c2 === a),
  );
}

/** 天气匹配度 */
function computeWeatherScore(items: ClothingItem[], weather: Weather | null, currentSeason: string): number {
  if (!weather) return 0.5;
  const t = weather.temperature;
  const isRainy = weather.condition === '雨' || weather.condition === '雪';
  let sum = 0;

  for (const item of items) {
    let itemScore = 0.5;
    const ep = effectiveParent(item);
    // 厚薄 vs 温度
    if (t < 10 && (item.thickness === '厚款' || item.thickness === '加厚')) itemScore += 0.3;
    if (t > 28 && item.thickness === '薄款') itemScore += 0.3;
    if (t >= 15 && t <= 25 && item.thickness === '适中') itemScore += 0.2;
    // 雨雪天：外套 +0.3，不防水的薄下装/短裤扣分
    if (isRainy) {
      if (ep === '外套') itemScore += 0.3;
      if (ep === '下装' && item.type.includes('短')) itemScore -= 0.25;
      if (ep === '鞋' && (item.type.includes('凉') || item.type.includes('拖'))) itemScore -= 0.3;
    }
    // 季节兼容
    if (item.seasons.includes(currentSeason)) itemScore += 0.2;
    // 温度不适配扣分
    if (t > 30 && item.thickness === '厚款') itemScore -= 0.3;
    if (t < 5 && item.thickness === '薄款') itemScore -= 0.3;

    sum += Math.max(0, Math.min(1, itemScore));
  }

  return sum / items.length;
}

/** 偏好单品加分：高频穿着单品 */
function computeFavoriteScore(items: ClothingItem[], favoriteSet: Set<number>): number {
  const favCount = items.filter(i => favoriteSet.has(i.id)).length;
  return items.length > 0 ? favCount / items.length : 0;
}

/** 新鲜度：最近推荐过的单品越少分越高，鼓励探索 */
function computeFreshnessScore(items: ClothingItem[], recentRecommendedItemIds?: Set<number>): number {
  if (!recentRecommendedItemIds || recentRecommendedItemIds.size === 0) return 0.5;
  const freshCount = items.filter(i => !recentRecommendedItemIds.has(i.id)).length;
  return freshCount / items.length;
}

/** 穿着间隔分：最近实际穿过的单品越少分越高，避免短期内重复推荐 */
function computeRecencyScore(
  items: ClothingItem[],
  recentlyWornDays?: Map<number, number>,
  season?: string,
): number {
  if (!recentlyWornDays || recentlyWornDays.size === 0) return 0.5;
  const window = season === '夏' ? 7 : season === '冬' ? 4 : 5;
  let sum = 0;
  for (const item of items) {
    const daysAgo = recentlyWornDays.get(item.id);
    if (daysAgo === undefined || daysAgo >= window) {
      sum += 1.0; // 没穿过或已过窗口，满分
    } else if (daysAgo === 0) {
      sum += 0.0; // 今天刚穿，零分
    } else {
      sum += daysAgo / window; // 线性恢复
    }
  }
  return sum / items.length;
}

// ═════════════════════════════════════════════════
// Step 5: 推荐理由生成
// ═════════════════════════════════════════════════
function generateReason(s: ScoredOutfit, weather: Weather | null): string {
  const reasons: string[] = [];

  if (s.pairFreqScore > 0.4) reasons.push('因你常这样搭配');
  if (s.styleScore > 0.4) reasons.push('风格协调统一');
  if (s.colorScore > 0.5) reasons.push('配色和谐');
  if (weather && s.weatherScore > 0.5) reasons.push('适合当前天气');
  if (s.favoriteScore > 0.3) reasons.push('包含你爱穿的单品');
  if (s.userOutfitBoost > 0) reasons.push('与你收藏的搭配一致');

  if (reasons.length === 0) reasons.push('衣橱智能搭配');
  return reasons.slice(0, 2).join('，');
}

// ═════════════════════════════════════════════════
// 主入口
// ═════════════════════════════════════════════════
export function generateRecommendations(
  clothing: ClothingItem[],
  outfits: Outfit[],
  weather: Weather | null,
  options?: {
    selectedItem?: ClothingItem;
    topN?: number;
    recentRecommendedItemIds?: Set<number>;
    recentlyWornDays?: Map<number, number>;
    blacklistPairs?: Set<string>;
    likedItemIds?: Set<number>;
    preferredStyles?: string[];
    preferredColors?: string[];
    comfortVsAppearance?: 'comfort' | 'balanced' | 'appearance';
    preferredScenes?: string[];
    repeatInterval?: number | null;
    explorationLevel?: 'explore' | 'balanced' | 'conservative';
    colorBoldness?: 'safe' | 'moderate' | 'bold';
    layeringPreference?: 'often' | 'sometimes' | 'rarely';
    accessoryUsage?: 'often' | 'sometimes' | 'rarely';
    wearRecords?: import('../types').WearRecord[];
  },
): OutfitRecommendation[] {
  if (clothing.length === 0) return [];

  const topN = options?.topN ?? 5;

  // Step 1: 天气过滤
  const filtered = filterByWeather(clothing, weather);
  if (filtered.length < 3) {
    // 过滤后太少，回退到全部
    return generateRecommendationsFallback(clothing, weather);
  }

  // 准备数据（模块级缓存，outfits 不变时复用）
  const { pairFreq, itemDiversity } = getCachedMatrices(outfits);
  const currentSeason = weather ? getSeasonFromTemp(weather.temperature) : '春';

  // Build implicit signals (cold start = empty maps)
  const today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const wearRecords = options?.wearRecords ?? [];
  const idleBoost = wearRecords.length > 0 ? getIdleBoost(filtered, today) : new Map<number, number>();
  const brandAffinity = wearRecords.length > 0 ? getBrandAffinity(filtered, wearRecords) : new Map<number, number>();
  const thicknessComfort = weather ? getThicknessTempComfort(filtered, wearRecords, weather) : new Map<number, number>();

  // 偏好单品：穿着次数前 25%
  const maxWear = Math.max(1, ...clothing.map(c => c.wearCount));
  const favThreshold = Math.max(1, maxWear * 0.6);
  const favoriteSet = new Set(clothing.filter(c => c.wearCount >= favThreshold).map(c => c.id));

  // 用户自定义搭配集合（用于强匹配加成）
  const userOutfitSets = new Set(
    outfits.map(o => [...o.itemIds].sort((a, b) => a - b).join(',')),
  );

  // 搭配历史 < 5 个时 compat gate 有害：矩阵太稀疏，反而限制多样性
  const effectivePairFreq = outfits.length >= 5 ? pairFreq : undefined;
  if (outfits.length < 5) {
    console.log(`[generateRecommendations] outfits=${outfits.length} < 5 — compat gate disabled`);
  }

  // Step 2 & 3: 生成候选 + 评分
  let candidates = generateCandidates(
    filtered, options?.selectedItem, 40,
    options?.recentRecommendedItemIds, itemDiversity,
    effectivePairFreq, currentSeason, options?.recentlyWornDays,
    idleBoost, brandAffinity,
    options?.repeatInterval ?? null,
    options?.layeringPreference ?? 'sometimes',
    options?.accessoryUsage ?? 'sometimes',
  );

  // 候选太少则回退到简单生成
  if (candidates.length === 0) {
    return generateRecommendationsFallback(clothing, weather);
  }

  // 黑名单过滤：排除用户标记为不喜欢的组合
  if (options?.blacklistPairs && options.blacklistPairs.size > 0) {
    candidates = candidates.filter(items => {
      const key = [...items.map(i => i.id)].sort((a, b) => a - b).join(',');
      return !options.blacklistPairs!.has(key);
    });
  }

  const scored = scoreOutfits(candidates, pairFreq, weather, favoriteSet, userOutfitSets, currentSeason, options?.recentRecommendedItemIds, options?.recentlyWornDays, options?.likedItemIds, options?.preferredStyles, options?.preferredColors, options?.comfortVsAppearance, options?.preferredScenes,
    options?.explorationLevel ?? 'balanced',
    options?.colorBoldness ?? 'moderate',
    thicknessComfort,
  );

  // 排序，去重（同一件上装不出现太多次）
  scored.sort((a, b) => b.totalScore - a.totalScore);

  // 确保多样性：同一单品最多出现在 Math.max(2, ceil(topN * 0.6)) 个结果中
  const dedupLimit = Math.max(2, Math.ceil(topN * 0.6));
  const diverse: ScoredOutfit[] = [];
  const itemUsageCount = new Map<number, number>();
  for (const s of scored) {
    const overused = s.items.some(i => (itemUsageCount.get(i.id) || 0) >= dedupLimit);
    if (!overused || diverse.length < topN / 2) {
      diverse.push(s);
      s.items.forEach(i => itemUsageCount.set(i.id, (itemUsageCount.get(i.id) || 0) + 1));
    }
    if (diverse.length >= topN * 3) break; // 取足够多再截断
  }

  const best = diverse.slice(0, topN);

  console.log(`[generateRecommendations] candidates=${candidates.length} scored=${scored.length} diverse=${diverse.length} top=${best.length}`);
  best.forEach((s, i) => {
    console.log(`[generateRecommendations] #${i+1} score=${s.totalScore.toFixed(2)} items:`, s.items.map(it => `#${it.id} ${it.type}(${effectiveParent(it)})`).join(' + '));
  });

  // Step 5: 输出
  return best.map(s => ({
    items: s.items,
    scene: weather ? inferScene(weather) : '工作',
    reason: generateReason(s, weather),
    score: Math.round(s.totalScore * 100),
  }));
}

function inferScene(weather: Weather): '工作' | '运动' | '约会' | '宅家' {
  const now = new Date();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const hour = now.getHours();
  if (weather.condition === '雨' || weather.condition === '雪') return '宅家';
  if (isWeekend) return '约会';
  if (hour >= 6 && hour <= 10) return '工作';
  if (hour >= 17 && hour <= 20) return '运动';
  return '工作';
}

/** 回退：候选不足时的简单推荐 */
function generateRecommendationsFallback(
  clothing: ClothingItem[],
  weather: Weather | null,
): OutfitRecommendation[] {
  const tops = clothing.filter(i => effectiveParent(i) === '上装');
  const bottoms = clothing.filter(i => effectiveParent(i) === '下装');
  const shoes = clothing.filter(i => effectiveParent(i) === '鞋');
  const dresses = clothing.filter(i => effectiveParent(i) === '连衣裙');
  const outers = clothing.filter(i => effectiveParent(i) === '外套');
  const accessories = clothing.filter(i => effectiveParent(i) === '配饰' || effectiveParent(i) === '包包');
  const hasShoes = shoes.length > 0;

  const results: OutfitRecommendation[] = [];
  const scene = weather ? inferScene(weather) : ('工作' as const);

  // 按不同的 effectiveParent 分组所有衣服
  const allByCategory = new Map<string, ClothingItem[]>();
  for (const item of clothing) {
    const cat = effectiveParent(item);
    if (!allByCategory.has(cat)) allByCategory.set(cat, []);
    allByCategory.get(cat)!.push(item);
  }

  const categories = [...allByCategory.keys()];

  // Fisher-Yates 洗牌后生成搭配，避免小衣橱每次看到相同顺序
  const shuffledTops = shuffle([...tops]);
  const shuffledBottoms = shuffle([...bottoms]);
  const shuffledShoes = shuffle([...shoes]);
  const shuffledDresses = shuffle([...dresses]);
  const shuffledOuters = shuffle([...outers]);

  for (let k = 0; k < 5; k++) {
    let items: ClothingItem[] = [];
    if (shuffledDresses.length > 0 && (k >= shuffledTops.length || shuffledTops.length === 0 || Math.random() < 0.3)) {
      items = [shuffledDresses[k % shuffledDresses.length]];
      if (hasShoes) items.push(shuffledShoes[k % shuffledShoes.length]);
      if (shuffledOuters.length > 0 && Math.random() < 0.35) items.push(shuffledOuters[k % shuffledOuters.length]);
    } else if (shuffledTops.length > 0) {
      items = [shuffledTops[k % shuffledTops.length]];
      if (shuffledBottoms.length > 0) items.push(shuffledBottoms[k % shuffledBottoms.length]);
      if (hasShoes) items.push(shuffledShoes[k % shuffledShoes.length]);
      if (shuffledOuters.length > 0 && Math.random() < 0.35) items.push(shuffledOuters[k % shuffledOuters.length]);
    } else if (categories.length >= 2) {
      const picks: ClothingItem[] = [];
      for (const cat of categories.slice(0, 3)) {
        const pool = allByCategory.get(cat)!;
        picks.push(pool[Math.floor(Math.random() * pool.length)]);
      }
      items = picks;
    } else if (clothing.length >= 2) {
      const shuffled = shuffle([...clothing]);
      if (shuffled[0].id !== shuffled[1].id) items = [shuffled[0], shuffled[1]];
    }

    if (items.length >= 2) {
      results.push({ items, scene, reason: '根据你的衣橱生成', score: 70 });
    }
  }

  // 最后手段：无法构成任何搭配时，至少展示已有单品
  if (results.length === 0 && clothing.length > 0) {
    return [{
      items: clothing.slice(0, Math.min(3, clothing.length)),
      scene,
      reason: '快去添加更多单品完善搭配吧',
      score: 50,
    }];
  }

  return results;
}

// ── 向后兼容：单条推荐 ──
export function generateRecommendation(
  clothing: ClothingItem[],
  outfits: Outfit[],
  weather: Weather | null,
  options?: { selectedItem?: ClothingItem },
): OutfitRecommendation | null {
  const results = generateRecommendations(clothing, outfits, weather, { ...options, topN: 1 });
  return results[0] || null;
}

// ── 工具函数导出 ──
export { colorsCompatible as areColorsCompatible };

export function getColorSuggestions(item: ClothingItem): string[] {
  const primary = item.color?.split(',')[0]?.trim() || '';
  const compatible = COLOR_HARMONY[primary];
  if (!compatible) return [];
  return compatible.slice(0, 5);
}
