import {
  ClothingItem,
  ClothingType,
  Season,
  Scene,
  OutfitRecommendation,
} from '../types';

// 颜色搭配规则：哪些颜色可以一起穿
// 同色系 or 互补色
const COLOR_COMBOS: Record<string, string[]> = {
  // 中性色可以搭配一切
  '黑色': ['白色', '灰色', '蓝色', '红色', '绿色', '粉色', '棕色', '卡其色'],
  '白色': ['黑色', '灰色', '蓝色', '红色', '绿色', '粉色', '棕色', '卡其色', '黄色'],
  '灰色': ['黑色', '白色', '蓝色', '粉色', '紫色', '绿色'],
  // 蓝色系
  '蓝色': ['黑色', '白色', '灰色', '棕色', '米色', '卡其色', '浅蓝'],
  '藏青色': ['白色', '灰色', '米色', '浅蓝'],
  // 暖色系
  '红色': ['黑色', '白色', '灰色', '蓝色', '棕色', '米色'],
  '酒红色': ['黑色', '白色', '灰色', '米色', '金色'],
  '粉色': ['黑色', '白色', '灰色', '蓝色', '浅蓝', '紫色'],
  // 大地色系
  '棕色': ['黑色', '白色', '蓝色', '绿色', '米色', '橙色', '红色'],
  '咖啡色': ['黑色', '白色', '米色', '卡其色', '蓝色'],
  '卡其色': ['黑色', '白色', '蓝色', '棕色', '绿色', '红色'],
  // 绿色系
  '绿色': ['黑色', '白色', '灰色', '棕色', '米色', '蓝色'],
  '军绿色': ['黑色', '白色', '棕色', '卡其色'],
  // 黄色系
  '黄色': ['黑色', '白色', '蓝色', '棕色', '灰色'],
  // 基础色
  '米色': ['黑色', '白色', '蓝色', '棕色', '绿色', '红色', '藏青色'],
};

// 温度到季节优先级的映射
function getSeasonPriority(temperature: number): Season[] {
  if (temperature < 10) {
    return ['冬', '秋', '春', '夏']; // 优先冬装
  } else if (temperature < 20) {
    return ['春', '秋', '夏', '冬']; // 春秋过渡
  } else {
    return ['夏', '春', '秋', '冬']; // 优先夏装
  }
}

// 场景到场合优先级的映射
const SCENE_OCCASION_SCORE: Record<Scene, Record<string, number>> = {
  '工作': { '工作': 10, '正式': 8, '休闲': 5, '日常': 3, '运动': 0 },
  '运动': { '运动': 10, '休闲': 5, '日常': 3, '工作': 0, '正式': 0 },
  '约会': { '约会': 10, '正式': 7, '休闲': 6, '日常': 4, '运动': 0 } as any, // TODO: fix type
  '宅家': { '宅家': 10, '休闲': 8, '日常': 6, '运动': 3, '工作': 0, '正式': 0 },
};

// 衣服类型优先级（用于构建搭配）
const TYPE_PRIORITY: ClothingType[] = ['外套', '上衣', '裤子', '裙子', '鞋子', '配饰'];

/**
 * 推荐引擎核心函数
 */
export function generateRecommendation(
  scene: Scene,
  clothing: ClothingItem[],
  recentWornIds: number[],
  temperature?: number
): OutfitRecommendation | null {
  if (clothing.length === 0) {
    return null;
  }

  // 1. 按温度筛选适合季节的衣服（如果提供了温度）
  const seasonPriority = temperature !== undefined
    ? getSeasonPriority(temperature)
    : ['春', '夏', '秋', '冬'] as Season[];

  // 2. 给所有衣服打分
  const scoredItems = clothing
    .filter(item => !recentWornIds.includes(item.id)) // 排除近期穿过的
    .map(item => {
      // 季节匹配分
      const seasonScore = item.seasons.length > 0
        ? item.seasons.reduce((sum, s) => {
            const idx = seasonPriority.indexOf(s);
            return sum + (10 - idx); // 排前面的季节得分高
          }, 0) / item.seasons.length
        : 5; // 未设置季节的给中等分

      // 场合匹配分
      const occasionScore = item.occasions.reduce((sum, o) => {
        return sum + (SCENE_OCCASION_SCORE[scene][o] || 0);
      }, 0) / (item.occasions.length || 1);

      // 久未穿着奖励分
      const daysSinceWorn = item.lastWornAt
        ? Math.floor((Date.now() - new Date(item.lastWornAt).getTime()) / (1000 * 60 * 60 * 24))
        : 365; // 从未穿过给最高分
      const wearIncentiveScore = Math.min(daysSinceWorn * 0.5, 30); // 最多30分奖励

      // 综合评分
      const totalScore = seasonScore * 0.3 + occasionScore * 0.3 + wearIncentiveScore * 0.4;

      return {
        item,
        score: totalScore,
        reason: buildItemReason(item, seasonScore, occasionScore, daysSinceWorn),
      };
    })
    .sort((a, b) => b.score - a.score);

  if (scoredItems.length === 0) {
    // 如果所有衣服都近期穿过，允许推荐（降低标准）
    const fallbackScored = clothing
      .map(item => {
        const daysSinceWorn = item.lastWornAt
          ? Math.floor((Date.now() - new Date(item.lastWornAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        return {
          item,
          score: Math.max(0, 30 - daysSinceWorn * 0.3),
          reason: '近期重复穿着，但仍适合今日搭配',
        };
      })
      .sort((a, b) => b.score - a.score);
    return buildOutfitRecommendation(fallbackScored, scene);
  }

  return buildOutfitRecommendation(scoredItems, scene);
}

/**
 * 构建完整穿搭
 */
function buildOutfitRecommendation(
  scoredItems: { item: ClothingItem; score: number; reason: string }[],
  scene: Scene
): OutfitRecommendation {
  const selectedItems: ClothingItem[] = [];
  const usedTypes = new Set<ClothingType>();

  // 按优先级选择每种类型的最佳单品
  for (const type of TYPE_PRIORITY) {
    const candidates = scoredItems.filter(
      s => s.item.type === type && !usedTypes.has(type)
    );
    if (candidates.length > 0) {
      selectedItems.push(candidates[0].item);
      usedTypes.add(type);
    }
  }

  // 计算整体评分（取各单品的平均分）
  const avgScore = scoredItems
    .filter(s => selectedItems.some(i => i.id === s.item.id))
    .reduce((sum, s) => sum + s.score, 0) / selectedItems.length;

  // 构建推荐理由
  const sceneNames: Record<Scene, string> = {
    '工作': '工作场合',
    '运动': '运动场景',
    '约会': '约会时刻',
    '宅家': '居家时光',
  };
  const reason = `${sceneNames[scene]}，打造理想造型。`;

  return {
    items: selectedItems,
    scene,
    reason,
    score: Math.round(avgScore),
  };
}

/**
 * 为单个衣服构建推荐理由
 */
function buildItemReason(
  item: ClothingItem,
  seasonScore: number,
  occasionScore: number,
  daysSinceWorn: number
): string {
  const reasons: string[] = [];

  if (daysSinceWorn > 30) {
    reasons.push(`${daysSinceWorn}天未穿`);
  }
  if (seasonScore > 7) {
    reasons.push('当季适合');
  }
  if (occasionScore > 6) {
    reasons.push('场合匹配');
  }

  return reasons.length > 0 ? reasons.join('，') : '综合推荐';
}

/**
 * 检查两个颜色是否搭配
 */
export function areColorsCompatible(color1: string, color2: string): boolean {
  const combo = COLOR_COMBOS[color1];
  if (!combo) return true; // 未知颜色默认兼容
  return combo.includes(color2);
}

/**
 * 获取搭配的颜色建议
 */
export function getColorSuggestions(item: ClothingItem): string[] {
  const compatibleColors = COLOR_COMBOS[item.color];
  if (!compatibleColors) return [];
  return compatibleColors.slice(0, 5); // 最多返回5个建议
}
