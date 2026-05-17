import React, { useRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../utils/theme';

interface Props {
  value: number;
  onValueChange: (angle: number) => void;
  minAngle?: number;
  maxAngle?: number;
  disabled?: boolean;
}

const THUMB_SIZE = 28;
const TRACK_HEIGHT = 4;
const TICK_LABELS = [
  { angle: -180, label: '-180°' },
  { angle: -90, label: '-90°' },
  { angle: 0, label: '0°' },
  { angle: 90, label: '90°' },
  { angle: 180, label: '180°' },
];

// Labels for major tick positions
const MAJOR_ANGLES = [-180, -90, 0, 90, 180];
const MINOR_ANGLES = [-135, -45, 45, 135];

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingVertical: 4,
    },
    angleRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 8,
    },
    angleBadge: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: 14,
      paddingVertical: 4,
      borderRadius: 10,
    },
    angleText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    trackWrap: {
      paddingHorizontal: THUMB_SIZE / 2,
    },
    trackTouch: {
      height: 44,
      justifyContent: 'center',
    },
    track: {
      height: TRACK_HEIGHT,
      borderRadius: TRACK_HEIGHT / 2,
      backgroundColor: theme.colors.border,
      overflow: 'visible' as const,
    },
    ticksLayer: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    tick: {
      width: 2,
      height: 10,
      borderRadius: 1,
      backgroundColor: theme.colors.textTertiary,
    },
    tickCenter: {
      width: 2,
      height: 16,
      borderRadius: 1,
      backgroundColor: theme.colors.primary,
    },
    tickMinor: {
      width: 1,
      height: 6,
      borderRadius: 0.5,
      backgroundColor: theme.colors.border,
    },
    thumbLayer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      paddingHorizontal: THUMB_SIZE / 2,
    },
    thumbDot: {
      position: 'absolute',
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: THUMB_SIZE / 2,
      backgroundColor: theme.colors.primary,
      borderWidth: 2.5,
      borderColor: theme.colors.white,
      top: -(THUMB_SIZE - TRACK_HEIGHT) / 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 4,
      elevation: 5,
    },
    labelsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: THUMB_SIZE / 2,
      marginTop: 6,
    },
    labelText: {
      fontSize: 10,
      fontWeight: '500',
      color: theme.colors.textTertiary,
    },
    labelZero: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.primary,
    },
  });

const PAN_SENSITIVITY = 0.5;

/** Convert angle to fraction [0..1] on the slider track */
function angleToFrac(angle: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (angle - min) / (max - min)));
}

/** Convert pixel position on track to angle (used for tap — absolute positioning) */
function posToAngle(px: number, trackWidth: number, min: number, max: number): number {
  const frac = Math.max(0, Math.min(1, px / trackWidth));
  return Math.round(min + frac * (max - min));
}

export function RotationSlider({
  value,
  onValueChange,
  minAngle = -180,
  maxAngle = 180,
  disabled = false,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const trackWidthRef = useRef(300);
  const startAngleRef = useRef(0);

  const frac = angleToFrac(value, minAngle, maxAngle);
  const thumbLeft = trackWidthRef.current * frac;

  // Pan uses delta from start position for fine-grained control
  const panGesture = Gesture.Pan()
    .onStart(() => {
      startAngleRef.current = value;
    })
    .onUpdate((e) => {
      if (disabled) return;
      const range = maxAngle - minAngle;
      const deltaAngle = (e.translationX / trackWidthRef.current) * range * PAN_SENSITIVITY;
      const newAngle = startAngleRef.current + deltaAngle;
      onValueChange(Math.round(Math.max(minAngle, Math.min(maxAngle, newAngle))));
    });

  // Tap uses absolute positioning for quick jumps
  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      if (disabled) return;
      const angle = posToAngle(e.x, trackWidthRef.current, minAngle, maxAngle);
      onValueChange(angle);
    });

  const composed = Gesture.Race(panGesture, tapGesture);

  return (
    <View style={styles.container}>
      {/* Angle display badge */}
      <View style={styles.angleRow}>
        <View style={styles.angleBadge}>
          <Text style={styles.angleText}>{value}°</Text>
        </View>
      </View>

      {/* Track with gestures */}
      <View
        style={styles.trackWrap}
        onLayout={(e) => {
          trackWidthRef.current = e.nativeEvent.layout.width - THUMB_SIZE;
        }}
      >
        <GestureDetector gesture={composed}>
          <View style={styles.trackTouch}>
            {/* Track bar */}
            <View style={styles.track}>
              {/* Major ticks at -180, -90, 0, 90, 180 */}
              <View style={styles.ticksLayer}>
                {MAJOR_ANGLES.map((a) => (
                  <View key={a} style={a === 0 ? styles.tickCenter : styles.tick} />
                ))}
              </View>
              {/* Minor ticks between majors */}
              <View style={[styles.ticksLayer, { paddingLeft: `${100 / 8}%`, paddingRight: `${100 / 8}%` }]}>
                {MINOR_ANGLES.map((_, i) => (
                  <View key={i} style={styles.tickMinor} />
                ))}
              </View>
            </View>

            {/* Thumb dot */}
            <View style={styles.thumbLayer} pointerEvents="none">
              <View
                style={[
                  styles.thumbDot,
                  { left: thumbLeft },
                ]}
              />
            </View>
          </View>
        </GestureDetector>
      </View>

      {/* Labels */}
      <View style={styles.labelsRow}>
        {TICK_LABELS.map((t) => (
          <Text key={t.angle} style={t.angle === 0 ? styles.labelZero : styles.labelText}>
            {t.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
