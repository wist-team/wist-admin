import { StyleSheet, Text, View } from 'react-native';

import { MACROS, type NutritionSummary } from '../lib/nutrition';
import { adminTheme, spacing } from '../theme';

/** Port of build 26's NutritionDataTable: Item / Wgt / Kcals / Carbs / Protein / Fat / Fibre, headings indented, totals, assumptions. */
export function NutritionDataTable({ summary }: { summary: NutritionSummary }) {
  const { rows, totals, allAssumptions } = summary;
  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.cell, styles.itemCell, styles.headerText]}>Item</Text>
        <Text style={[styles.cell, styles.numCell, styles.headerText]}>Wgt</Text>
        {MACROS.map((m) => (
          <Text key={m} style={[styles.cell, styles.numCell, styles.headerText]}>
            {m}
          </Text>
        ))}
      </View>
      {rows.map((r, i) =>
        r.isHeading ? (
          <View key={`heading-${i}`} style={styles.row}>
            <Text style={[styles.cell, styles.headingText, { paddingLeft: r.depth * 10 }]} numberOfLines={2}>
              {r.name}
            </Text>
          </View>
        ) : (
          <View key={`row-${i}`} style={styles.row}>
            <Text style={[styles.cell, styles.itemCell, { paddingLeft: r.depth * 10 }]} numberOfLines={2}>
              {r.name}
            </Text>
            <Text style={[styles.cell, styles.numCell]}>{r.quantity.toFixed(0)}g</Text>
            {MACROS.map((m) => (
              <Text key={m} style={[styles.cell, styles.numCell]}>
                {r.macros[m].toFixed(0)}
              </Text>
            ))}
          </View>
        ),
      )}
      <View style={[styles.row, styles.footerRow]}>
        <Text style={[styles.cell, styles.itemCell, styles.headerText]}>Totals</Text>
        <Text style={[styles.cell, styles.numCell, styles.headerText]}>{totals.quantity.toFixed(0)}g</Text>
        {MACROS.map((m) => (
          <Text key={m} style={[styles.cell, styles.numCell, styles.headerText]}>
            {totals[m].toFixed(0)}
          </Text>
        ))}
      </View>
      {allAssumptions.length > 0 ? (
        <View style={styles.assumptions}>
          <Text style={styles.assumptionsHeading}>Assumptions:</Text>
          {allAssumptions.map((a, i) => (
            <Text key={i} style={styles.assumptionText}>
              • {a}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  table: { width: '100%', marginVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center' },
  headerRow: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.25)' },
  footerRow: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.4)', marginTop: 2 },
  cell: { paddingVertical: 3, fontSize: 11, color: adminTheme.text, textAlign: 'center' },
  itemCell: { flex: 3, textAlign: 'left' },
  numCell: { flex: 1 },
  headerText: { fontWeight: '700' },
  headingText: { flex: 1, textAlign: 'left', fontWeight: '700', color: adminTheme.accent, paddingTop: 6 },
  assumptions: { marginTop: spacing.sm },
  assumptionsHeading: { color: adminTheme.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 2 },
  assumptionText: { color: adminTheme.textMuted, fontSize: 11, lineHeight: 16 },
});
