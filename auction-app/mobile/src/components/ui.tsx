import { forwardRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { font, radius, spacing, useColors } from '../lib/theme';

export type IconName = keyof typeof Ionicons.glyphMap;

// ---------------------------------------------------------------- text

export function T({
  children,
  variant = 'body',
  color,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  variant?: keyof typeof font;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const c = useColors();
  return (
    <Text numberOfLines={numberOfLines} style={[font[variant], { color: color ?? c.text }, style]}>
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------- button

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  size?: 'md' | 'lg' | 'sm';
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, variant = 'primary', icon, loading, disabled, size = 'md', style, ...rest }: ButtonProps) {
  const c = useColors();
  const bg: Record<ButtonVariant, string> = {
    primary: c.primary,
    secondary: c.surfaceAlt,
    ghost: 'transparent',
    danger: c.danger,
    success: c.success,
  };
  const fg: Record<ButtonVariant, string> = {
    primary: c.primaryText,
    secondary: c.text,
    ghost: c.primary,
    danger: '#fff',
    success: '#fff',
  };
  const height = size === 'lg' ? 54 : size === 'sm' ? 36 : 46;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg[variant], height, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        variant === 'ghost' && { paddingHorizontal: spacing.sm },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 19} color={fg[variant]} /> : null}
          <Text style={[font.h3, { color: fg[variant], fontSize: size === 'sm' ? 14 : 16 }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------- inputs

interface FieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
  prefix?: string;
  suffix?: string;
}

export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, hint, error, prefix, suffix, style, multiline, ...rest },
  ref,
) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      {label ? <T variant="small" color={c.textMuted}>{label}</T> : null}
      <View
        style={[
          styles.field,
          { backgroundColor: c.surface, borderColor: error ? c.danger : c.border },
          multiline && { height: undefined, minHeight: 110, alignItems: 'flex-start', paddingVertical: spacing.md },
        ]}
      >
        {prefix ? <T color={c.textMuted}>{prefix}</T> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={c.textFaint}
          multiline={multiline}
          style={[font.body, { flex: 1, color: c.text, paddingVertical: 0 }, multiline && { textAlignVertical: 'top' }, style]}
          {...rest}
        />
        {suffix ? <T color={c.textMuted}>{suffix}</T> : null}
      </View>
      {error ? <T variant="small" color={c.danger}>{error}</T> : hint ? <T variant="small" color={c.textFaint}>{hint}</T> : null}
    </View>
  );
});

// ---------------------------------------------------------------- layout

export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const c = useColors();
  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth }, padded && { padding: spacing.lg }, style]}>
      {children}
    </View>
  );
}

export function Row({ children, style, gap = spacing.sm }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: spacing.md }} />;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const c = useColors();
  return (
    <Row style={{ justifyContent: 'space-between', marginBottom: spacing.md }}>
      <T variant="h2">{title}</T>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <T variant="small" color={c.primary}>{action}</T>
        </Pressable>
      ) : null}
    </Row>
  );
}

// ---------------------------------------------------------------- chips & badges

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? c.text : c.surface, borderColor: selected ? c.text : c.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={15} color={selected ? c.background : c.textMuted} /> : null}
      <Text style={[font.small, { color: selected ? c.background : c.text }]}>{label}</Text>
    </Pressable>
  );
}

type Tone = 'neutral' | 'primary' | 'success' | 'danger' | 'warning';

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const c = useColors();
  const map: Record<Tone, [string, string]> = {
    neutral: [c.surfaceAlt, c.textMuted],
    primary: [c.primarySoft, c.primary],
    success: [c.successSoft, c.success],
    danger: [c.dangerSoft, c.danger],
    warning: [c.warningSoft, c.warning],
  };
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <Text style={[font.tiny, { color: fg }]}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- states

export function Loading() {
  const c = useColors();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={c.primary} size="large" />
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  onAction,
}: {
  icon: IconName;
  title: string;
  message?: string;
  action?: string;
  onAction?: () => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.center, { padding: spacing.xxl, gap: spacing.md }]}>
      <View style={[styles.emptyIcon, { backgroundColor: c.primarySoft }]}>
        <Ionicons name={icon} size={30} color={c.primary} />
      </View>
      <T variant="h3" style={{ textAlign: 'center' }}>{title}</T>
      {message ? <T color={c.textMuted} style={{ textAlign: 'center' }}>{message}</T> : null}
      {action ? <Button title={action} onPress={onAction} style={{ marginTop: spacing.sm, paddingHorizontal: spacing.xl }} /> : null}
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const c = useColors();
  return (
    <View style={[styles.banner, { backgroundColor: c.dangerSoft }]}>
      <Ionicons name="alert-circle" size={18} color={c.danger} />
      <T variant="small" color={c.danger} style={{ flex: 1 }}>{message}</T>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={10}>
          <T variant="small" color={c.danger} style={{ textDecorationLine: 'underline' }}>Reintentar</T>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Stars({ rating, size = 14 }: { rating: number | null; size?: number }) {
  const c = useColors();
  const value = rating ?? 0;
  return (
    <Row gap={1}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline'}
          size={size}
          color={c.accent}
        />
      ))}
    </Row>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const hues = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];
  const color = hues[(name.charCodeAt(0) || 0) % hues.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.42 }}>{name.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
});
