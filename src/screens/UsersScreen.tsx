import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchUsers, type AdminUser } from '../api/admin';
import { roundOrDash } from '../lib/number';
import { formatRelative } from '../lib/format';
import { DEFAULT_SORT, SORT_OPTIONS, sortUsers, type SortField } from '../lib/sortUsers';
import type { RootScreenProps } from '../navigation/types';
import { adminTheme, spacing } from '../theme';

export default function UsersScreen({ navigation }: RootScreenProps<'Users'>) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sortField, setSortField] = useState<SortField>(DEFAULT_SORT);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh: boolean) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setUsers(await fetchUsers());
      if (isRefresh) setSortField(DEFAULT_SORT); // build 26 reset the sort on pull-to-refresh
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const sorted = useMemo(() => sortUsers(users, sortField), [users, sortField]);

  return (
    <View style={styles.container}>
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => {
          const active = opt.field === sortField;
          return (
            <Pressable
              key={opt.field}
              onPress={() => setSortField(opt.field)}
              style={[styles.sortButton, active && styles.sortButtonActive, opt.field === 'idusers' && { flex: 0.6 }]}
            >
              <Text style={styles.sortButtonText}>{opt.title}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.centered} color={adminTheme.accent} />
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => load(false)} style={styles.retry}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(u) => String(u.idusers)}
          renderItem={({ item }) => (
            <UserRow user={item} onPress={() => navigation.navigate('UserDetail', { user: item })} />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={adminTheme.accent} />
          }
          ListHeaderComponent={<Text style={styles.count}>{users.length} users</Text>}
        />
      )}
    </View>
  );
}

function UserRow({ user, onPress }: { user: AdminUser; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Text style={styles.email}>
        (ID: {user.idusers}) {user.userEmail}
      </Text>
      <Pair left={`Messages: ${user.user_message_count}`} right={`Liked: ${user.liked_responses}`} />
      <Pair left={`Meals: ${user.user_meal_count}`} right={`Disliked: ${user.disliked_responses}`} />
      <Pair
        left={`Signed up ${roundOrDash(user.days_since_first_message)} days ago`}
        right={`Avg logs per day: ${roundOrDash(user.avg_syft_data_responses_per_day)}`}
      />
      <Pair left={`Days active: ${roundOrDash(user.days_active)}`} right={`Days missed: ${roundOrDash(user.days_missed)}`} />
      <Pair
        left={`Avg msg per day: ${roundOrDash(user.avg_messages_per_day)}`}
        right={`${roundOrDash(user.missed_days_percentage)}% of days missed`}
      />
      <Pair
        left={`Avg weekday: ${roundOrDash(user.avg_weekday_logs)}`}
        right={`Avg weekend: ${roundOrDash(user.avg_weekend_logs)}`}
      />
      <Pair left={`Last active: ${formatRelative(user.most_recent_activity)}`} right="" />
      <Text style={styles.sub}>User Sub: {user.userSub || 'TestFlight user'}</Text>
    </Pressable>
  );
}

function Pair({ left, right }: { left: string; right: string }) {
  return (
    <View style={styles.pair}>
      <Text style={styles.stat}>{left}</Text>
      <Text style={styles.stat}>{right}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: adminTheme.background },
  sortRow: { flexDirection: 'row', paddingHorizontal: spacing.sm, paddingTop: spacing.sm, gap: 2 },
  sortButton: {
    flex: 1,
    backgroundColor: adminTheme.surface,
    paddingVertical: spacing.sm + 2,
    borderRadius: 5,
    alignItems: 'center',
  },
  sortButtonActive: { backgroundColor: adminTheme.accent },
  sortButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  count: { color: adminTheme.textMuted, fontSize: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { color: adminTheme.danger, textAlign: 'center', marginBottom: spacing.md },
  retry: { backgroundColor: adminTheme.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 6 },
  retryText: { color: adminTheme.text, fontWeight: '600' },
  row: { padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: adminTheme.border },
  rowPressed: { backgroundColor: adminTheme.surface },
  email: { color: adminTheme.text, fontWeight: '700', marginBottom: spacing.xs },
  pair: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { color: adminTheme.textMuted, fontSize: 13, lineHeight: 20 },
  sub: { color: adminTheme.textMuted, fontSize: 11, marginTop: spacing.xs },
});
