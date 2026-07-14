import { ClothingItem, WearRecord, Weather } from '../types';

/**
 * 单品冷落度加分：长期未穿或从未穿过的单品获得权重加成，
 * 鼓励推荐引擎"盘活"被遗忘的单品。
 *
 * @returns Map<clothingId, boost> — 仅包含有加成的单品；无加成的不出现在 Map 中
 */
export function getIdleBoost(
  clothing: ClothingItem[],
  today: string, // "YYYY-MM-DD"
): Map<number, number> {
  const result = new Map<number, number>();
  const todayMs = new Date(today).getTime();

  for (const item of clothing) {
    if (item.lastWornAt === null) {
      // 从未穿过 → 最高加成
      result.set(item.id, 0.12);
    } else {
      const lastWornMs = new Date(item.lastWornAt).getTime();
      const daysAgo = (todayMs - lastWornMs) / 86_400_000;

      if (daysAgo > 14) {
        result.set(item.id, 0.08);
      }
      // daysAgo <= 14 → 不加成（不写入 Map）
    }
  }

  return result;
}

/**
 * 品牌亲和度：分析穿着记录中高频品牌，
 * 属于高频品牌的单品获得轻微加成。
 *
 * @returns Map<clothingId, boost> — 仅包含属于 Top 3 高频品牌的单品
 */
export function getBrandAffinity(
  clothing: ClothingItem[],
  wearRecords: WearRecord[],
): Map<number, number> {
  const result = new Map<number, number>();

  // 1. 构建 clothingId → brand 映射（跳过无品牌单品）
  const idToBrand = new Map<number, string>();
  for (const item of clothing) {
    if (item.brand && item.brand.trim() !== '') {
      idToBrand.set(item.id, item.brand);
    }
  }

  // 2. 统计各品牌穿着频次
  const brandCounts = new Map<string, number>();
  for (const record of wearRecords) {
    const brand = idToBrand.get(record.clothingId);
    if (brand !== undefined) {
      brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1);
    }
  }

  // 3. 找出 Top 3 品牌（频次 ≥ 3）
  const topBrands: string[] = [];
  const sorted = [...brandCounts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);

  for (let i = 0; i < Math.min(3, sorted.length); i++) {
    topBrands.push(sorted[i][0]);
  }

  if (topBrands.length === 0) {
    return result;
  }

  const topBrandSet = new Set(topBrands);

  // 4. 为属于 Top 3 品牌的单品设置加成
  for (const item of clothing) {
    if (item.brand && topBrandSet.has(item.brand)) {
      result.set(item.id, 0.05);
    }
  }

  return result;
}

/**
 * 厚薄温度感知：从穿着记录中学习用户在特定温度下的厚薄偏好。
 * 样本不足时返回空 Map（调用方回退硬编码规则）。
 *
 * @returns Map<clothingId, score> — 包含正分（偏好匹配）和负分（温度不适）的单品
 */
export function getThicknessTempComfort(
  clothing: ClothingItem[],
  wearRecords: WearRecord[],
  currentWeather: Weather,
): Map<number, number> {
  const result = new Map<number, number>();

  // 1. 构建 clothingId → thickness 映射
  const idToThickness = new Map<number, string>();
  for (const item of clothing) {
    if (item.thickness) {
      idToThickness.set(item.id, item.thickness);
    }
  }

  // 2. 统计各厚薄穿着频次
  const thicknessCounts = new Map<string, number>();

  for (const record of wearRecords) {
    const thickness = idToThickness.get(record.clothingId);
    if (thickness !== undefined) {
      thicknessCounts.set(thickness, (thicknessCounts.get(thickness) ?? 0) + 1);
    }
  }

  // 3. 冷启动：样本不足则返回空 Map
  let totalRecords = 0;
  for (const count of thicknessCounts.values()) {
    totalRecords += count;
  }

  if (totalRecords < 5) {
    return result;
  }

  // 4. 找出穿着频次最高的厚薄
  let topThickness = '';
  let topCount = 0;
  for (const [thickness, count] of thicknessCounts) {
    if (count > topCount) {
      topCount = count;
      topThickness = thickness;
    }
  }

  const temperature = currentWeather.temperature;

  // 5. 为每件单品打分
  for (const item of clothing) {
    const thickness = item.thickness;

    if (!thickness) {
      continue;
    }

    // 厚薄偏好匹配 → 加分
    if (thickness === topThickness) {
      result.set(item.id, (result.get(item.id) ?? 0) + 0.06);
    }

    // 高温穿厚款 → 减分
    if (temperature > 30 && (thickness === '厚款' || thickness === '加厚')) {
      result.set(item.id, (result.get(item.id) ?? 0) - 0.10);
    }

    // 低温穿薄款 → 减分
    if (temperature < 5 && thickness === '薄款') {
      result.set(item.id, (result.get(item.id) ?? 0) - 0.10);
    }
  }

  // 清理掉 net 0 的条目（偏好匹配 + 温度惩罚互相抵消的情况）
  for (const [id, score] of result) {
    if (score === 0) {
      result.delete(id);
    }
  }

  return result;
}
