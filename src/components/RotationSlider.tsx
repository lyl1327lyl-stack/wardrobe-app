import React, { useRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

interface Props {
  value: number;
  onValueChange: (angle: number) => void;
  disabled?: boolean;
  darkMode?: boolean;
}

const PX_PER_DEG = 1.6;
const RANGE = 360;

const MAJOR = [-180, -135, -90, -45, 0, 45, 90, 135, 180];
const MINOR: number[] = [];
for (let a = -180; a <= 180; a += 15) {
  if (!MAJOR.includes(a)) MINOR.push(a);
}
const LABELED = [-180, -90, 0, 90, 180];

const DOT = 20;
const TRACK_H = 2;

const makeStyles = (theme: Theme, darkMode: boolean) =>
  StyleSheet.create({
    wrap: {
      paddingVertical: 2,
    },
    badgeRow: { alignItems: 'center', marginBottom: 2 },
    badge: {
      backgroundColor: darkMode ? 'rgba(255,255,255,0.12)' : theme.colors.background,
      paddingHorizontal: 14,
      paddingVertical: 2,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: darkMode ? 'rgba(255,255,255,0.2)' : theme.colors.border,
    },
    badgeText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.primary,
      fontVariant: ['tabular-nums'],
    },
    area: {
      width: '100%',
      height: 52,
      overflow: 'hidden',
    },
    dot: {
      position: 'absolute',
      left: '50%',
      top: 0,
      width: DOT,
      height: DOT,
      marginLeft: -DOT / 2,
      borderRadius: DOT / 2,
      backgroundColor: theme.colors.primary,
      borderWidth: 2.5,
      borderColor: darkMode ? 'rgba(255,255,255,0.9)' : theme.colors.white,
      zIndex: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 3,
      elevation: 5,
    },
    needle: {
      position: 'absolute',
      left: '50%',
      top: DOT - 2,
      width: 2,
      height: 10,
      marginLeft: -1,
      backgroundColor: theme.colors.primary,
      zIndex: 2,
    },
    rail: {
      position: 'absolute',
      top: DOT + 8,
      height: TRACK_H,
      borderRadius: TRACK_H / 2,
      backgroundColor: darkMode ? 'rgba(255,255,255,0.2)' : theme.colors.border,
    },
    ticks: {
      position: 'absolute',
      bottom: TRACK_H,
      height: 12,
    },
    tickMajor: {
      position: 'absolute',
      width: 1.5,
      height: 10,
      borderRadius: 0.75,
      backgroundColor: darkMode ? 'rgba(255,255,255,0.4)' : theme.colors.textTertiary,
    },
    tickMinor: {
      position: 'absolute',
      width: 1,
      height: 5,
      borderRadius: 0.5,
      backgroundColor: darkMode ? 'rgba(255,255,255,0.15)' : theme.colors.border,
    },
    tickZero: {
      position: 'absolute',
      width: 2,
      height: 12,
      borderRadius: 1,
      backgroundColor: theme.colors.primary,
    },
    labels: {
      position: 'absolute',
      top: DOT + 8 + TRACK_H + 4,
    },
    label: {
      position: 'absolute',
      fontSize: 9,
      color: darkMode ? 'rgba(255,255,255,0.45)' : theme.colors.textTertiary,
      width: 28,
      textAlign: 'center',
    },
    labelZero: {
      position: 'absolute',
      fontSize: 9,
      fontWeight: '700',
      color: theme.colors.primary,
      width: 28,
      textAlign: 'center',
    },
  });

export function RotationSlider({ value, onValueChange, disabled = false, darkMode = false }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme, darkMode), [theme, darkMode]);
  const viewW = useRef(1);
  const startAngle = useRef(0);

  const railW = RANGE * PX_PER_DEG;
  const railLeft = viewW.current / 2 - (value + 180) * PX_PER_DEG;
  const tPos = (a: number) => (a + 180) * PX_PER_DEG;

  const pan = Gesture.Pan()
    .onStart(() => { startAngle.current = value; })
    .onUpdate((e) => {
      if (disabled) return;
      const delta = Math.round(e.translationX / PX_PER_DEG);
      onValueChange(Math.max(-180, Math.min(180, startAngle.current + delta)));
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => { if (!disabled) onValueChange(0); });

  const composed = Gesture.Race(pan, doubleTap);

  return (
    <View style={styles.wrap}>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{value}°</Text>
        </View>
      </View>

      <GestureDetector gesture={composed}>
        <View
          style={styles.area}
          onLayout={(e) => { viewW.current = e.nativeEvent.layout.width; }}
        >
          <View style={styles.dot} pointerEvents="none" />
          <View style={styles.needle} pointerEvents="none" />

          <View style={[styles.rail, { left: railLeft, width: railW }]}>
            <View style={[styles.ticks, { left: 0, right: 0 }]} pointerEvents="none">
              {MINOR.map((a) => (
                <View key={a} style={[styles.tickMinor, { left: tPos(a) - 0.5 }]} />
              ))}
              {MAJOR.map((a) => (
                <View
                  key={a}
                  style={[a === 0 ? styles.tickZero : styles.tickMajor, { left: tPos(a) - (a === 0 ? 1 : 0.75) }]}
                />
              ))}
            </View>
          </View>

          <View style={[styles.labels, { left: railLeft, width: railW }]} pointerEvents="none">
            {LABELED.map((a) => (
              <Text key={a} style={[a === 0 ? styles.labelZero : styles.label, { left: tPos(a) - 14 }]}>
                {a}°
              </Text>
            ))}
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}
