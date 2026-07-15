import { useState, useEffect, useRef } from 'react';
import { Animated, AccessibilityInfo } from 'react-native';

/** 读取系统"减弱动效"设置，并订阅其变化。 */
export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (active) setReduced(v); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; sub.remove(); };
  }, []);
  return reduced;
}

type EntranceOpts = {
  from: number;
  to: number;
  kind: 'spring' | 'timing';
  spring?: Omit<Animated.SpringAnimationConfig, 'toValue' | 'useNativeDriver'>;
  timing?: Omit<Animated.TimingAnimationConfig, 'toValue' | 'useNativeDriver'>;
};

/**
 * mount 时把一个 Animated.Value 从 from 动到 to；减弱动效时瞬时设为 to。
 * 返回值默认为 to（避免首帧闪），useEffect 内再 setValue(from) 并启动动画。
 * 返回的 Value 供组件映射到具体属性（scale/opacity/interpolate）。
 */
export function useMountEntrance(opts: EntranceOpts): Animated.Value {
  const reduce = useReduceMotion();
  const val = useRef(new Animated.Value(opts.to)).current;
  useEffect(() => {
    if (reduce) { val.setValue(opts.to); return; }
    val.setValue(opts.from);
    const anim = opts.kind === 'spring'
      ? Animated.spring(val, { toValue: opts.to, useNativeDriver: true, ...opts.spring })
      : Animated.timing(val, { toValue: opts.to, useNativeDriver: true, ...opts.timing });
    anim.start();
    return () => anim.stop();
  }, [reduce]);
  return val;
}
