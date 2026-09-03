import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { deleteMessage, fetchUserThreads, type AdminUser, type ThreadRow } from '../api/admin';
import { formatTimestamp } from '../lib/format';
import { legacyMealImageUrl, mealImageUrl, parseThreadContent, type ParsedContent } from '../lib/threadContent';
import { adminTheme, spacing } from '../theme';

/**
 * Port of build 26's UserDetailsModal: raw syft_thread rows, newest last,
 * sender type, the useful content fields, timestamp, API version, the user's
 * photo, and long-press to delete. Adds a per-row JSON toggle for debugging.
 */
export function RawThreadsView({ user }: { user: AdminUser }) {
  const [rows, setRows] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const listRef = useRef<FlatList<ThreadRow>>(null);

  const load = useCallback(
    async (isRefresh: boolean) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        setRows(await fetchUserThreads(user.idusers));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user.idusers],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  // API returns newest first; build 26 rendered in that order with a
  // "scroll to bottom" button. Oldest-first reads like a chat, so flip it.
  const ordered = useMemo(() => [...rows].reverse(), [rows]);

  const confirmDelete = (row: ThreadRow) => {
    Alert.alert(
      'Delete message',
      `Permanently delete syft_thread ${row.syft_thread_id} (${row.syft_thread_sender_type})? This removes it from the user's app.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Message',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMessage(row.syft_thread_id);
              await load(true);
            } catch (e) {
              Alert.alert('Delete failed', e instanceof Error ? e.message : String(e));
            }
          },
        },
      ],
    );
  };

  if (loading) return <ActivityIndicator style={styles.centered} color={adminTheme.accent} />;
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => load(false)} style={styles.button}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Text style={styles.toolbarText}>
          {rows.length} rows{rows.length >= 150 ? ' (API cap 150)' : ''} · {user.userEmail}
        </Text>
        <Pressable onPress={() => listRef.current?.scrollToEnd({ animated: true })} style={styles.button}>
          <Text style={styles.buttonText}>Latest ↓</Text>
        </Pressable>
      </View>
      <FlatList
        ref={listRef}
        data={ordered}
        keyExtractor={(r) => String(r.syft_thread_id)}
        renderItem={({ item }) => (
          <ThreadRowItem row={item} onLongPress={() => confirmDelete(item)} onOpenImage={setViewerUrl} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={adminTheme.accent} />
        }
        initialNumToRender={20}
      />
      <ImageViewer url={viewerUrl} onClose={() => setViewerUrl(null)} />
    </View>
  );
}

function ThreadRowItem({
  row,
  onLongPress,
  onOpenImage,
}: {
  row: ThreadRow;
  onLongPress: () => void;
  onOpenImage: (url: string) => void;
}) {
  const [showJson, setShowJson] = useState(false);
  const parsed = useMemo(() => parseThreadContent(row.syft_thread_content), [row.syft_thread_content]);
  const bubble =
    row.syft_thread_sender_type === 'user'
      ? styles.bubbleUser
      : row.syft_thread_sender_type === 'syft-data'
        ? styles.bubbleData
        : styles.bubbleBot;

  return (
    <Pressable onLongPress={onLongPress} delayLongPress={400} style={[styles.row, bubble]}>
      <View style={styles.rowHeader}>
        <Text style={styles.sender}>{row.syft_thread_sender_type}</Text>
        <Text style={styles.meta}>#{row.syft_thread_id}</Text>
      </View>
      <ContentSummary parsed={parsed} senderType={row.syft_thread_sender_type} onOpenImage={onOpenImage} />
      <View style={styles.rowFooter}>
        <Text style={styles.meta}>{formatTimestamp(row.syft_thread_timestamp)}</Text>
        <View style={styles.footerRight}>
          {row.syft_thread_rating ? <Text style={styles.meta}>rating {row.syft_thread_rating}</Text> : null}
          {parsed.ok && parsed.content.apiVersion !== undefined ? (
            <Text style={styles.meta}>API {String(parsed.content.apiVersion)}</Text>
          ) : null}
          <Pressable onPress={() => setShowJson((v) => !v)} hitSlop={8}>
            <Text style={styles.jsonToggle}>{showJson ? 'hide JSON' : 'JSON'}</Text>
          </Pressable>
        </View>
      </View>
      {showJson ? (
        <Text style={styles.json} selectable>
          {parsed.ok ? JSON.stringify(parsed.content, null, 2) : (parsed.raw ?? '(null)')}
        </Text>
      ) : null}
    </Pressable>
  );
}

function ContentSummary({
  parsed,
  senderType,
  onOpenImage,
}: {
  parsed: ParsedContent;
  senderType: string;
  onOpenImage: (url: string) => void;
}) {
  if (!parsed.ok) {
    return (
      <Text style={styles.unparseable}>
        Unparseable content ({parsed.error}): {parsed.raw?.slice(0, 200) ?? '(null)'}
      </Text>
    );
  }
  const c = parsed.content;
  // Build 26 showed the photo only on the user's own message (the same file
  // name is echoed into the bot and data rows).
  const image = senderType === 'user' ? mealImageUrl(c.userImage) : null;
  return (
    <View>
      {image ? <RowImage url={image} fallbackUrl={legacyMealImageUrl(c.userImage)} onOpen={onOpenImage} /> : null}
      {c.userResponse ? <Text style={styles.body}>{c.userResponse}</Text> : null}
      {c.syftResponse ? <Text style={styles.body}>{c.syftResponse}</Text> : null}
      {c.mealName ? <Text style={styles.bodyStrong}>{String(c.mealName)}</Text> : null}
      {c.message && senderType === 'syft-data' ? <Text style={styles.body}>{String(c.message)}</Text> : null}
      {c.syftVisionDescription && senderType === 'user' ? (
        <Text style={styles.bodyMuted}>Vision: {c.syftVisionDescription}</Text>
      ) : null}
      {c.proactive ? <Text style={styles.tag}>proactive{c.proactiveRuleId ? ` · ${c.proactiveRuleId}` : ''}</Text> : null}
      {c.symptomData && typeof c.symptomData === 'object' && Object.keys(c.symptomData as object).length > 0 ? (
        <Text style={styles.tag}>symptomData</Text>
      ) : null}
      {c.userData ? <Text style={styles.bodyMuted}>{JSON.stringify(c.userData)}</Text> : null}
    </View>
  );
}

function RowImage({
  url,
  fallbackUrl,
  onOpen,
}: {
  url: string;
  fallbackUrl: string | null;
  onOpen: (url: string) => void;
}) {
  const [src, setSrc] = useState(url);
  const [failed, setFailed] = useState(false);
  if (failed) return <Text style={styles.meta}>image unavailable: {url.split('/').pop()}</Text>;
  return (
    <Pressable onPress={() => onOpen(src)}>
      <Image
        source={{ uri: src }}
        style={styles.image}
        resizeMode="cover"
        onError={() => (fallbackUrl && src !== fallbackUrl ? setSrc(fallbackUrl) : setFailed(true))}
      />
    </Pressable>
  );
}

function ImageViewer({ url, onClose }: { url: string | null; onClose: () => void }) {
  return (
    <Modal visible={url !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.viewerBackdrop}>
        <ScrollView
          contentContainerStyle={styles.viewerContent}
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
        >
          {url ? <Image source={{ uri: url }} style={styles.viewerImage} resizeMode="contain" /> : null}
        </ScrollView>
        <Pressable onPress={onClose} style={styles.viewerClose}>
          <Text style={styles.buttonText}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { color: adminTheme.danger, textAlign: 'center', marginBottom: spacing.md },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  toolbarText: { color: adminTheme.textMuted, fontSize: 12, flex: 1 },
  button: { backgroundColor: adminTheme.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 6 },
  buttonText: { color: adminTheme.text, fontWeight: '600', fontSize: 13 },
  row: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: adminTheme.border,
  },
  bubbleUser: { backgroundColor: adminTheme.bubbleUser },
  bubbleBot: { backgroundColor: adminTheme.bubbleBot },
  bubbleData: { backgroundColor: adminTheme.bubbleData },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  rowFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  footerRight: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  sender: { color: adminTheme.accent, fontSize: 12, fontWeight: '700' },
  meta: { color: adminTheme.textMuted, fontSize: 11 },
  jsonToggle: { color: adminTheme.accent, fontSize: 11, fontWeight: '600' },
  json: {
    color: adminTheme.text,
    fontFamily: 'Menlo',
    fontSize: 11,
    marginTop: spacing.sm,
    backgroundColor: adminTheme.background,
    padding: spacing.sm,
    borderRadius: 6,
  },
  body: { color: adminTheme.text, fontSize: 14, lineHeight: 20 },
  bodyStrong: { color: adminTheme.text, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  bodyMuted: { color: adminTheme.textMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  tag: { color: adminTheme.accent, fontSize: 11, marginTop: spacing.xs },
  unparseable: { color: adminTheme.danger, fontSize: 12 },
  image: { width: 160, height: 160, borderRadius: 8, marginBottom: spacing.sm, backgroundColor: adminTheme.background },
  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  viewerContent: { flexGrow: 1, justifyContent: 'center' },
  viewerImage: { width: '100%', aspectRatio: 1 },
  viewerClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    backgroundColor: adminTheme.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
});
