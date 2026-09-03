import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { adminTheme, spacing } from '../theme';

export interface Segment<T extends string> {
  key: T;
  label: string;
}

interface Props<T extends string> {
  segments: ReadonlyArray<Segment<T>>;
  value: T;
  onChange: (key: T) => void;
}

export function SegmentedControl<T extends string>({ segments, value, onChange }: Props<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {segments.map((s) => {
        const active = s.key === value;
        return (
          <Pressable
            key={s.key}
            onPress={() => onChange(s.key)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{s.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  segment: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: adminTheme.surface,
    borderWidth: 1,
    borderColor: adminTheme.border,
  },
  segmentActive: { backgroundColor: adminTheme.accent, borderColor: adminTheme.accent },
  label: { color: adminTheme.textMuted, fontWeight: '600', fontSize: 13 },
  labelActive: { color: '#fff' },
});
