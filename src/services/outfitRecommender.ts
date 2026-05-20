import {
  ClothingItem,
  Outfit,
  OutfitRecommendation,
  Weather,
} from '../types';

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
  const allowed = COLOR_HARMONY[c1];
  if (allowed) return allowed.includes(c2);
  const reverse = COLOR_HARMONY[c2];
  if (reverse) return reverse.includes(c1);
  return true;
}

// ═════════════════════════════════════════════════
// Step 1: 候选单品过滤
// ═════════════════════════════════════════════════
function filterByWeather(items: ClothingItem[], weather: Weather | null): ClothingItem[] {
  if (!weather) return items;
  const t = weather.temperature;
  const season = getSeasonFromTemp(t);

  console.log(`[filterByWeather] temp=${t}°C season=${season} total=${items.length}`);

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
): ClothingItem[][] {
  const tops = items.filter(i => effectiveParent(i) === '上装');
  const bottoms = items.filter(i => effectiveParent(i) === '下装');
  const shoes = items.filter(i => effectiveParent(i) === '鞋');
  const outers = items.filter(i => effectiveParent(i) === '外套');
  const dresses = items.filter(i => effectiveParent(i) === '连衣裙');
  const bags = items.filter(i => effectiveParent(i) === '包包');

  // 按季节调整外套概率：春秋常需叠穿，冬季几乎必备，夏季很少
  const outerProb = season === '冬' ? 0.70 : season === '夏' ? 0.15 : 0.50;
  const bagProb = bags.length > 0 ? 0.55 : 0;

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

  // 组合权重：新鲜度 × 搭配广度
  function fw(id: number): number {
    const fresh = recentRecommendedItemIds?.has(id) ? 0.05 : 1.0;
    const diversity = 1 + (itemDiversity?.get(id) || 0);
    return fresh * diversity;
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
  userOutfitBoost: number;
  totalScore: number;
}

function scoreOutfits(
  candidates: ClothingItem[][],
  pairFreq: Map<string, number>,
  weather: Weather | null,
  favoriteSet: Set<number>,
  userOutfitSets: Set<string>,
  currentSeason: string,
  recentRecommendedItemIds?: Set<number>,
): ScoredOutfit[] {
  return candidates.map(items => {
    // 1. 共现频率 (0.15) — 历史仅供参考，不作为主导
    const pairFreqScore = computePairFreqScore(items, pairFreq);

    // 2. 风格一致性 (0.25)
    const styleScore = computeStyleScore(items);

    // 3. 颜色协调度 (0.15)
    const colorScore = computeColorScore(items);

    // 4. 天气匹配度 (0.10)
    const weatherScore = computeWeatherScore(items, weather, currentSeason);

    // 5. 偏好单品 (0.10)
    const favoriteScore = computeFavoriteScore(items, favoriteSet);

    // 6. 新鲜度 (0.25) — 最近没推荐过的搭配得分高
    const freshnessScore = computeFreshnessScore(items, recentRecommendedItemIds);

    // 用户自定义搭配加成
    const key = [...items.map(i => i.id)].sort((a, b) => a - b).join(',');
    const userOutfitBoost = userOutfitSets.has(key) ? 0.30 : 0;

    const totalScore =
      0.15 * pairFreqScore +
      0.25 * styleScore +
      0.15 * colorScore +
      0.10 * weatherScore +
      0.10 * favoriteScore +
      0.25 * freshnessScore +
      userOutfitBoost;

    return { items, pairFreqScore, styleScore, colorScore, weatherScore, favoriteScore, freshnessScore, userOutfitBoost, totalScore };
  });
}

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
    // 厚薄 vs 温度
    if (t < 10 && (item.thickness === '厚款' || item.thickness === '加厚')) itemScore += 0.3;
    if (t > 28 && item.thickness === '薄款') itemScore += 0.3;
    if (t >= 15 && t <= 25 && item.thickness === '适中') itemScore += 0.2;
    // 雨天外套加分
    if (isRainy && effectiveParent(item) === '外套') itemScore += 0.2;
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

  // 准备数据
  const pairFreq = buildPairFrequency(outfits);
  const itemDiversity = buildItemDiversity(outfits);
  const currentSeason = weather ? getSeasonFromTemp(weather.temperature) : '春';

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
  const candidates = generateCandidates(filtered, options?.selectedItem, 40, options?.recentRecommendedItemIds, itemDiversity, effectivePairFreq, currentSeason);

  // 候选太少则回退到简单生成
  if (candidates.length === 0) {
    return generateRecommendationsFallback(clothing, weather);
  }

  const scored = scoreOutfits(candidates, pairFreq, weather, favoriteSet, userOutfitSets, currentSeason, options?.recentRecommendedItemIds);

  // 排序，去重（同一件上装不出现太多次）
  scored.sort((a, b) => b.totalScore - a.totalScore);

  // 确保多样性：同一 parentType 核心单品不重复出现超过 2 次
  const diverse: ScoredOutfit[] = [];
  const itemUsageCount = new Map<number, number>();
  for (const s of scored) {
    const overused = s.items.some(i => (itemUsageCount.get(i.id) || 0) >= 3);
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

  // 尝试生成完整搭配
  for (let k = 0; k < 5; k++) {
    let items: ClothingItem[] = [];
    if (dresses.length > 0 && (k >= tops.length || tops.length === 0 || Math.random() < 0.3)) {
      items = [dresses[k % dresses.length]];
      if (hasShoes) items.push(shoes[k % shoes.length]);
      if (outers.length > 0 && Math.random() < 0.35) items.push(outers[k % outers.length]);
    } else if (tops.length > 0) {
      items = [tops[k % tops.length]];
      if (bottoms.length > 0) items.push(bottoms[k % bottoms.length]);
      if (hasShoes) items.push(shoes[k % shoes.length]);
      if (outers.length > 0 && Math.random() < 0.35) items.push(outers[k % outers.length]);
    } else if (categories.length >= 2) {
      // 没有标准分类但有多个不同类别，直接按类别配对
      const picks: ClothingItem[] = [];
      for (const cat of categories.slice(0, 3)) {
        const pool = allByCategory.get(cat)!;
        picks.push(pool[k % pool.length]);
      }
      items = picks;
    } else if (clothing.length >= 2) {
      // 只有一种类型：两两随机搭配
      const a = clothing[k % clothing.length];
      const b = clothing[(k + 1) % clothing.length];
      if (a.id !== b.id) items = [a, b];
    }

    if (items.length >= 2) {
      results.push({ items, scene, reason: '根据你的衣橱生成', score: 70 });
    }
    // 不 break，继续尝试后续 k（不同索引可能产生有效组合）
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
