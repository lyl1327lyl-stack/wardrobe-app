import { ClothingItem } from '../types';

export interface AttributeTip {
  message: string;
  detail: string;
  attributeName: string;
  affectedCount: number;
  severity: 'high' | 'medium';
}

export function analyzeAttributeGaps(clothing: ClothingItem[]): AttributeTip[] {
  if (clothing.length === 0) return [];

  const total = clothing.length;
  const tips: AttributeTip[] = [];

  // seasons
  const missingSeasons = clothing.filter(c => !c.seasons || c.seasons.length === 0).length;
  if (missingSeasons > 0) {
    const ratio = missingSeasons / total;
    tips.push({
      message: `有 ${missingSeasons} 件衣服缺少季节标签`,
      detail: '添加季节信息可以让推荐更适应天气变化',
      attributeName: 'seasons',
      affectedCount: missingSeasons,
      severity: ratio > 0.3 ? 'high' : 'medium',
    });
  }

  // tags
  const missingTags = clothing.filter(c => !c.tags || c.tags.length === 0).length;
  if (missingTags > 0) {
    const ratio = missingTags / total;
    tips.push({
      message: `有 ${missingTags} 件衣服缺少风格标签`,
      detail: '添加风格标签可以提升搭配协调性评分',
      attributeName: 'tags',
      affectedCount: missingTags,
      severity: ratio > 0.3 ? 'high' : 'medium',
    });
  }

  // color
  const missingColor = clothing.filter(c => !c.color || c.color.trim() === '').length;
  if (missingColor > 0) {
    const ratio = missingColor / total;
    tips.push({
      message: `有 ${missingColor} 件衣服缺少颜色信息`,
      detail: '完善颜色信息让色彩搭配更和谐',
      attributeName: 'color',
      affectedCount: missingColor,
      severity: ratio > 0.4 ? 'high' : 'medium',
    });
  }

  // thickness
  const missingThickness = clothing.filter(c => !c.thickness || c.thickness.trim() === '').length;
  if (missingThickness > 0) {
    const ratio = missingThickness / total;
    tips.push({
      message: `有 ${missingThickness} 件衣服缺少厚度信息`,
      detail: '完善厚度信息让天气匹配更精准',
      attributeName: 'thickness',
      affectedCount: missingThickness,
      severity: ratio > 0.4 ? 'high' : 'medium',
    });
  }

  // Sort by severity (high first), then by affectedCount descending
  tips.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
    return b.affectedCount - a.affectedCount;
  });

  return tips.slice(0, 3);
}
