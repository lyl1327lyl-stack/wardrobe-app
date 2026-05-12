import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OutfitRecommendation } from '../types';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { OutfitConfirmModal } from './OutfitConfirmModal';

interface Props {
  recommendation: OutfitRecommendation;
  onRefresh: () => void;
  onWear: (mode: 'append' | 'replace') => void;
  onCalendar: () => void;
  todayThumbnails: Array<{ uri: string; type: string; id: number }>;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_PADDING = 20;
const CONTENT_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2 - CARD_PADDING * 2;
const RATIO = 3 / 5;
const GRID_GAP = 10;
const GRID_WIDTH = CONTENT_WIDTH * RATIO;

function getCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const weeks: (number | null)[][] = [];
  let day = 1;
  for (let w = 0; w < 6; w++) {
    const week: (number | null)[] = [];
    for (let d = 0; d < 7; d++) {
      if ((w === 0 && d < startOffset) || day > daysInMonth) {
        week.push(null);
      } else {
        week.push(day++);
      }
    }
    weeks.push(week);
    if (day > daysInMonth) break;
  }
  return weeks;
}

const WEEK_HEADERS = ['一', '二', '三', '四', '五', '六', '日'];

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      padding: CARD_PADDING,
      marginHorizontal: CARD_MARGIN,
      marginTop: 16,
      overflow: 'visible' as const,
      ...theme.shadows.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    headerLeft: {
      flex: 1,
      marginRight: 12,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    titleIcon: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: theme.colors.primary + '18',
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      fontWeight: '400',
      marginLeft: 34,
    },
    headerRefresh: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.borderLight || theme.colors.border + '40',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 2,
    },
    // ── 长方形印章（双层边框，溢出卡片）──
    stampWrap: {
      position: 'absolute',
      top: 0,
      left: 140,
      zIndex: 10,
    },
    stampOuter: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 2,
      borderColor: '#C4545A',
      borderRadius: 5,
      backgroundColor: 'rgba(255, 246, 246, 0.88)',
      transform: [{ rotate: '-10deg' }],
    },
    stampInner: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: '#C4545A',
      borderRadius: 3,
      opacity: 0.5,
    },
    stampText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#C4545A',
      letterSpacing: 2,
    },
    contentRow: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 16,
    },
    grid: {
      width: GRID_WIDTH,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: GRID_GAP,
    },
    gridImage: {
      borderRadius: 12,
      resizeMode: 'cover',
    },
    actionsColumn: {
      flex: 1,
      justifyContent: 'center',
      gap: 10,
    },
    wearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      borderRadius: 16,
      ...theme.shadows.md,
    },
    wearButtonDisabled: {
      opacity: 0.5,
    },
    wearButtonText: {
      color: theme.colors.white,
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.3,
    },

    // ── 日历按钮 ──
    calendarWrap: {
      // 自然高度，不拉伸
    },
    calendarRings: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 18,
      marginBottom: -4,
      zIndex: 1,
    },
    calendarRing: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.colors.border,
    },
    calendarBody: {
      backgroundColor: theme.colors.white,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 6,
      ...theme.shadows.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.borderLight,
    },
    calendarMonthRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 3,
      gap: 6,
    },
    calMonthText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.text,
    },
    calDivider: {
      width: 18,
      height: 2,
      borderRadius: 1,
      backgroundColor: theme.colors.accent,
    },
    calWeekRow: {
      flexDirection: 'row',
      marginBottom: 0,
    },
    calWeekCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 0,
    },
    calWeekText: {
      fontSize: 7,
      fontWeight: '600',
      color: theme.colors.textTertiary,
    },
    calDateRow: {
      flexDirection: 'row',
    },
    calDateCell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 0,
    },
    calDateText: {
      fontSize: 8,
      color: theme.colors.textSecondary,
      lineHeight: 14,
    },
    calDateTextToday: {
      fontSize: 8,
      fontWeight: '700',
      color: theme.colors.white,
    },
    calTodayDot: {
      width: 13,
      height: 13,
      borderRadius: 7,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    calendarLabel: {
      textAlign: 'center',
      fontSize: 10,
      color: theme.colors.textSecondary,
      fontWeight: '500',
      marginTop: 3,
    },
  });

export function OutfitRecommendationCard({ recommendation, onRefresh, onWear, onCalendar, todayThumbnails }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { items } = recommendation;
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const hasTodayRecord = todayThumbnails.length > 0;

  // 推荐单品都是今日已记录的子集时，视为重复
  const todayIdSet = useMemo(() => new Set(todayThumbnails.map(t => t.id)), [todayThumbnails]);
  const isDuplicate = hasTodayRecord && items.length > 0 && items.every(i => todayIdSet.has(i.id));

  const handlePressWear = () => {
    if (isDuplicate) {
      Alert.alert('已记录', '这套搭配和今天已记录的一致，无需重复记录');
      return;
    }
    setShowModal(true);
  };

  const handleWear = async (mode: 'append' | 'replace') => {
    setShowModal(false);
    setIsLoading(true);
    try {
      await onWear(mode);
    } finally {
      setIsLoading(false);
    }
  };

  const gridItems = items.slice(0, 6);
  const gridCols = gridItems.length > 4 ? 3 : 2;
  const gridColSize = (GRID_WIDTH - GRID_GAP * (gridCols - 1)) / gridCols;

  // 固定网格高度：始终按 2×2 大图布局预留空间，避免卡片高度跳动
  const baseColSize = (GRID_WIDTH - GRID_GAP) / 2;
  const gridHeight = 2 * baseColSize * 1.25 + GRID_GAP;

  const today = new Date();
  const todayDate = today.getDate();
  const calYear = today.getFullYear();
  const calMonth = today.getMonth() + 1;
  const calWeeks = useMemo(() => getCalendarGrid(calYear, calMonth), [calYear, calMonth]);

  return (
    <View style={styles.container}>
      {/* ── 印章（溢出在卡片右上角）── */}
      {hasTodayRecord && (
        <View style={styles.stampWrap} pointerEvents="none">
          <View style={styles.stampOuter}>
            <View style={styles.stampInner}>
              <Text style={styles.stampText}>今日已记录</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Header: 图标 + 标题, 右侧换一套按钮 ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.titleRow}>
            <View style={styles.titleIcon}>
              <Ionicons name="sparkles" size={15} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>今日推荐</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerRefresh} onPress={onRefresh} activeOpacity={0.7}>
          <Ionicons name="refresh" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Body: 图片网格 + 操作区 ── */}
      <View style={[styles.contentRow, { height: gridHeight }]}>
        <View style={[styles.grid, { height: gridHeight }]}>
          {gridItems.map(item => (
            <Image
              key={item.id}
              source={{ uri: item.thumbnailUri || item.imageUri }}
              style={[styles.gridImage, { width: gridColSize, height: gridColSize * 1.25 }]}
            />
          ))}
        </View>

        <View style={styles.actionsColumn}>
          <TouchableOpacity
            style={[
              styles.wearButton,
              isLoading && styles.wearButtonDisabled,
            ]}
            onPress={handlePressWear}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <Ionicons
              name="checkmark-outline"
              size={16}
              color={theme.colors.white}
            />
            <Text style={styles.wearButtonText}>
              {isLoading ? '记录中...' : '就穿这套'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.calendarWrap} onPress={onCalendar} activeOpacity={0.7}>
            {/* 日历活页环 */}
            <View style={styles.calendarRings}>
              <View style={styles.calendarRing} />
              <View style={styles.calendarRing} />
            </View>

            {/* 日历主体 */}
            <View style={styles.calendarBody}>
              <View style={styles.calendarMonthRow}>
                <Text style={styles.calMonthText}>{calMonth}月</Text>
                <View style={styles.calDivider} />
              </View>

              <View style={styles.calWeekRow}>
                {WEEK_HEADERS.map((d, i) => (
                  <View key={i} style={styles.calWeekCell}>
                    <Text style={styles.calWeekText}>{d}</Text>
                  </View>
                ))}
              </View>

              {calWeeks.map((week, wi) => (
                <View key={wi} style={styles.calDateRow}>
                  {week.map((d, di) => (
                    <View key={di} style={styles.calDateCell}>
                      {d !== null ? (
                        d === todayDate ? (
                          <View style={styles.calTodayDot}>
                            <Text style={styles.calDateTextToday}>{d}</Text>
                          </View>
                        ) : (
                          <Text style={styles.calDateText}>{d}</Text>
                        )
                      ) : (
                        <Text style={styles.calDateText}> </Text>
                      )}
                    </View>
                  ))}
                </View>
              ))}

              <Text style={styles.calendarLabel}>穿着日历</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <OutfitConfirmModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleWear}
        todayThumbnails={todayThumbnails}
        recItems={items}
      />
    </View>
  );
}
