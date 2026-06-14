import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';
import { getWearRecordsByDateRange } from '../db/wearRecords';
import { WearRecord } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_PADDING = 16;
const THUMB_SIZE = 42;

interface DayOutfit {
  date: string;
  label: string;
  thumbnails: Array<{ uri: string; type: string; id: number }>;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff === 2) return '前天';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function groupByDate(records: WearRecord[]): DayOutfit[] {
  const map = new Map<string, Array<{ uri: string; type: string; id: number }>>();
  for (const r of records) {
    const arr = map.get(r.wornDate) || [];
    if (!arr.some(a => a.id === r.clothingId)) {
      arr.push({ uri: r.clothingThumbnailUri, type: r.clothingType, id: r.clothingId });
    }
    map.set(r.wornDate, arr);
  }
  const days: DayOutfit[] = [];
  for (const [date, thumbnails] of map) {
    days.push({ date, label: formatDateLabel(date), thumbnails });
  }
  return days.sort((a, b) => b.date.localeCompare(a.date));
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      marginHorizontal: CARD_MARGIN,
      marginTop: 16,
      backgroundColor: theme.colors.card,
      borderRadius: 18,
      padding: CARD_PADDING,
      ...theme.shadows.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconWrap: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      letterSpacing: -0.2,
    },
    headerLink: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    emptyWrap: {
      alignItems: 'center',
      paddingVertical: 16,
      gap: 6,
    },
    emptyText: {
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    dayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    dayRowLast: {
      borderBottomWidth: 0,
    },
    dayLabel: {
      width: 36,
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    dayThumbs: {
      flexDirection: 'row',
      flex: 1,
      gap: 6,
    },
    thumbWrap: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: theme.colors.background,
    },
    thumbImg: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
    },
    moreBadge: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: 10,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    moreText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.textTertiary,
    },
    itemCount: {
      fontSize: 10,
      color: theme.colors.textTertiary,
      marginLeft: 'auto',
    },
  });

interface RecentOutfitCardProps {
  todayRecords: WearRecord[];
  onViewCalendar: () => void;
}

export function RecentOutfitCard({ todayRecords, onViewCalendar }: RecentOutfitCardProps) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const [historyDays, setHistoryDays] = useState<DayOutfit[]>([]);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      const records = await getWearRecordsByDateRange(startDate, endDate);
      const grouped = groupByDate(records);
      setHistoryDays(grouped);
    };
    load();
  }, [todayRecords]);

  if (historyDays.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrap}>
            <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
          </View>
          <Text style={styles.headerTitle}>近期穿搭</Text>
        </View>
        <TouchableOpacity onPress={onViewCalendar} activeOpacity={0.7}>
          <Text style={styles.headerLink}>查看全部</Text>
        </TouchableOpacity>
      </View>

      {historyDays.map((day, i) => {
        const isLast = i === historyDays.length - 1;
        const maxShow = 5;
        const overflow = day.thumbnails.length - maxShow;
        return (
          <View key={day.date} style={[styles.dayRow, isLast && styles.dayRowLast]}>
            <Text style={styles.dayLabel}>{day.label}</Text>
            <View style={styles.dayThumbs}>
              {day.thumbnails.slice(0, maxShow).map(t => (
                <View key={t.id} style={styles.thumbWrap}>
                  {t.uri ? (
                    <Image source={{ uri: t.uri }} style={styles.thumbImg} />
                  ) : (
                    <View style={[styles.thumbWrap, { justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="shirt-outline" size={16} color={theme.colors.textTertiary} />
                    </View>
                  )}
                </View>
              ))}
              {overflow > 0 && (
                <View style={styles.moreBadge}>
                  <Text style={styles.moreText}>+{overflow}</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
