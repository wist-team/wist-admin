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
import { summariseNutrition } from '../lib/nutrition';
import { legacyMealImageUrl, mealImageUrl, parseThreadContent, type ParsedContent } from '../lib/threadContent';
import { adminTheme, spacing } from '../theme';
import {
  hasSymptomCard,
  polarityColors,
  symptomCardDetail,
  symptomCardTitle,
} from '../vendor/wist/utils/symptomDisplay';
import { NutritionDataTable } from './NutritionDataTable';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Port of build 26's UserDetailsModal: raw syft_thread rows, newest first,
 * sender type, the useful content fields, timestamp, the user's photo, and a
 * long-press menu with Show JSON and Delete.
 */
export function RawThreadsView({ user }: { user: AdminUser }) {
  const [rows, setRows] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [jsonRow, setJsonRow] = useState<ThreadRow | null>(null);
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

  const openMenu = (row: ThreadRow) => {
    Alert.alert(`syft_thread ${row.syft_thread_id}`, row.syft_thread_sender_type, [
      { text: 'Show JSON', onPress: () => setJsonRow(row) },
      {
        text: 'Delete Message',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            'Delete message',
            `Permanently delete syft_thread ${row.syft_thread_id}? This removes it from the user's app.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
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
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
        <Pressable onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} style={styles.button}>
          <Text style={styles.buttonText}>Latest ↑</Text>
        </Pressable>
      </View>
      <FlatList
        ref={listRef}
        style={styles.list}
        data={rows} // API order: newest first
        keyExtractor={(r) => String(r.syft_thread_id)}
        renderItem={({ item }) => (
          <ThreadRowItem row={item} onLongPress={() => openMenu(item)} onOpenImage={setViewerUrl} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={adminTheme.accent} />
        }
        initialNumToRender={20}
      />
      <ImageViewer url={viewerUrl} onClose={() => setViewerUrl(null)} />
      <JsonViewer row={jsonRow} onClose={() => setJsonRow(null)} />
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
        {row.syft_thread_rating ? <Text style={styles.meta}>rating {row.syft_thread_rating}</Text> : null}
      </View>
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
  // syft-data rows are either a meal (nutritionDataNested) or a symptom log
  // (symptomData with a `symptoms` object); the user app renders each as a card.
  const nutrition =
    senderType === 'syft-data' ? summariseNutrition(c.nutritionDataNested, c.nutritionData, c.assumptions) : null;
  const symptomData = senderType === 'syft-data' && isRecord(c.symptomData) ? c.symptomData : null;
  const isSymptomCard = !nutrition && symptomData !== null && hasSymptomCard(symptomData);
  const showMealName = Boolean(c.mealName) && !isSymptomCard && c.mealName !== 'Unknown meal';

  return (
    <View>
      {image ? <RowImage url={image} fallbackUrl={legacyMealImageUrl(c.userImage)} onOpen={onOpenImage} /> : null}
      {c.userResponse ? <Text style={styles.body}>{c.userResponse}</Text> : null}
      {c.syftResponse ? <Text style={styles.body}>{c.syftResponse}</Text> : null}
      {showMealName ? <Text style={styles.bodyStrong}>{String(c.mealName)}</Text> : null}
      {nutrition ? <NutritionDataTable summary={nutrition} /> : null}
      {isSymptomCard && symptomData ? <SymptomCard symptomData={symptomData} /> : null}
      {c.syftVisionDescription && senderType === 'user' ? (
        <Text style={styles.bodyMuted}>Vision: {c.syftVisionDescription}</Text>
      ) : null}
      {c.proactive ? <Text style={styles.tag}>proactive{c.proactiveRuleId ? ` · ${c.proactiveRuleId}` : ''}</Text> : null}
      {c.userData ? <Text style={styles.bodyMuted}>{JSON.stringify(c.userData)}</Text> : null}
    </View>
  );
}

/** Same title, detail and red/green/grey treatment as the user app's chat symptom card. */
function SymptomCard({ symptomData }: { symptomData: Record<string, unknown> }) {
  const colors = polarityColors(symptomData.symptom_polarity);
  const response = typeof symptomData.response === 'string' ? symptomData.response : null;
  return (
    <View style={[styles.symptomCard, { backgroundColor: colors.bg, borderLeftColor: colors.bar }]}>
      <Text style={[styles.symptomTitle, { color: colors.fg }]}>{symptomCardTitle(symptomData)}</Text>
      <Text style={styles.symptomDetail}>{symptomCardDetail(symptomData)}</Text>
      {response ? <Text style={styles.bodyMuted}>{response}</Text> : null}
      {symptomData.red_flag ? <Text style={[styles.tag, { color: colors.fg }]}>red flag</Text> : null}
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

function JsonViewer({ row, onClose }: { row: ThreadRow | null; onClose: () => void }) {
  const text = useMemo(() => {
    if (!row) return '';
    const parsed = parseThreadContent(row.syft_thread_content);
    const content = parsed.ok ? parsed.content : row.syft_thread_content;
    return JSON.stringify({ ...row, syft_thread_content: content }, null, 2);
  }, [row]);
  return (
    <Modal visible={row !== null} animationType="slide" onRequestClose={onClose}>
      <View style={styles.jsonScreen}>
        <View style={styles.toolbar}>
          <Text style={styles.toolbarText}>syft_thread {row?.syft_thread_id}</Text>
          <Pressable onPress={onClose} style={styles.button}>
            <Text style={styles.buttonText}>Close</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.jsonContent}>
          <Text style={styles.json} selectable>
            {text}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { color: adminTheme.danger, textAlign: 'center', marginBottom: spacing.md },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  sender: { color: adminTheme.accent, fontSize: 12, fontWeight: '700' },
  meta: { color: adminTheme.textMuted, fontSize: 11 },
  body: { color: adminTheme.text, fontSize: 14, lineHeight: 20 },
  bodyStrong: { color: adminTheme.text, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  bodyMuted: { color: adminTheme.textMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  tag: { color: adminTheme.accent, fontSize: 11, marginTop: spacing.xs },
  unparseable: { color: adminTheme.danger, fontSize: 12 },
  image: { width: 160, height: 160, borderRadius: 8, marginBottom: spacing.sm, backgroundColor: adminTheme.background },
  symptomCard: { borderLeftWidth: 4, borderRadius: 8, padding: spacing.sm, marginTop: spacing.xs },
  symptomTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  symptomDetail: { color: adminTheme.text, fontSize: 14, fontWeight: '600', marginTop: 2 },
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
  jsonScreen: { flex: 1, backgroundColor: adminTheme.background, paddingTop: 56 },
  jsonContent: { padding: spacing.md },
  json: { color: adminTheme.text, fontFamily: 'Menlo', fontSize: 11, lineHeight: 15 },
});
