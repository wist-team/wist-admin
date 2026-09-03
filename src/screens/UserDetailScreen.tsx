import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RawThreadsView } from '../components/RawThreadsView';
import { SegmentedControl } from '../components/SegmentedControl';
import type { RootScreenProps } from '../navigation/types';
import { adminTheme } from '../theme';

// Release 1 ships Raw only. Release 2 adds Chat, History, Insights,
// Sensitivities and Profile here — same screen, more segments (PLAN.md #7).
type SegmentKey = 'raw';

const SEGMENTS = [{ key: 'raw', label: 'Raw' }] as const satisfies ReadonlyArray<{ key: SegmentKey; label: string }>;

export default function UserDetailScreen({ route }: RootScreenProps<'UserDetail'>) {
  const { user } = route.params;
  const [segment, setSegment] = useState<SegmentKey>('raw');

  return (
    <View style={styles.container}>
      <SegmentedControl segments={SEGMENTS} value={segment} onChange={setSegment} />
      {segment === 'raw' && <RawThreadsView user={user} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: adminTheme.background },
});
