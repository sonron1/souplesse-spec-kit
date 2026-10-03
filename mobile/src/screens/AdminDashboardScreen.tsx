import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as adminApi from '../api/admin';
import type { AdminStats } from '../api/admin';
import { useAuth } from '../context/AuthContext';
import {
  approvedThisMonthText,
  distributionRows,
  monthLabel,
  reviewTimeText,
  updatedAtText,
  waitingText,
} from '../lib/admin';
import { formatFcfa } from '../lib/plans';
import { colors, radii, spacing } from '../theme/tokens';

function StatTile({ label, value, hint, accent }: { label: string; value: string; hint?: string | null; accent?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, accent ? { color: accent } : null]}>{value}</Text>
      {hint ? <Text style={styles.tileHint}>{hint}</Text> : null}
    </View>
  );
}

export default function AdminDashboardScreen() {
  const { logout } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setStats(await adminApi.getStats());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les statistiques.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      load().finally(() => setIsLoading(false));
    }, [load]),
  );

  async function refresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  const rows = stats ? distributionRows(stats.planDistribution) : [];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
    >
      <Text style={styles.title}>Tableau de bord Admin</Text>
      {stats ? <Text style={styles.updated}>{updatedAtText(stats.generatedAt)} · tirez pour actualiser</Text> : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {stats ? (
        <>
          <View style={styles.revenueCard}>
            <Text style={styles.revenueLabel}>Revenu · {monthLabel(stats.revenue.month)}</Text>
            <Text style={styles.revenueValue}>{formatFcfa(stats.revenue.amount)}</Text>
            <Text style={styles.revenueHint}>{approvedThisMonthText(stats.revenue.approvedProofs)}</Text>
          </View>

          <Text style={styles.sectionTitle}>Membres</Text>
          <View style={styles.grid}>
            <StatTile label="Actifs" value={String(stats.members.active)} accent={colors.good} />
            <StatTile label="En pause" value={String(stats.members.paused)} accent={colors.brand} />
          </View>

          <Text style={styles.sectionTitle}>Paiements</Text>
          <View style={styles.grid}>
            <StatTile
              label="En attente"
              value={String(stats.payments.pending)}
              hint={waitingText(stats.payments.oldestPendingSince)}
              accent={stats.payments.pending > 0 ? colors.info : undefined}
            />
            <StatTile label="Délai moyen de modération" value={reviewTimeText(stats.payments.last30Days.averageReviewHours)} hint="sur 30 jours" />
            <StatTile label="Validés (30 j)" value={String(stats.payments.last30Days.approved)} accent={colors.good} />
            <StatTile label="Rejetés (30 j)" value={String(stats.payments.last30Days.rejected)} accent={colors.bad} />
          </View>

          <Text style={styles.sectionTitle}>Répartition des formules en cours</Text>
          <View style={styles.card}>
            {rows.length === 0 ? <Text style={styles.meta}>Aucun abonnement en cours.</Text> : null}
            {rows.map((row) => (
              <View key={row.key} style={styles.row}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowCount}>
                    {row.count} · {row.percent} %
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${row.percent}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <TouchableOpacity style={styles.logout} onPress={() => logout()}>
        <Text style={styles.logoutText}>Déconnexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bg,
  },
  container: {
    flexGrow: 1,
    width: '100%',
    backgroundColor: colors.bg,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  centered: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  updated: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  error: {
    width: '100%',
    color: colors.bad,
    marginBottom: spacing.md,
  },
  revenueCard: {
    width: '100%',
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  revenueLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  revenueValue: {
    color: colors.brand,
    fontSize: 30,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  revenueHint: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  tileLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  tileValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  tileHint: {
    color: colors.muted,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  row: {
    width: '100%',
    marginBottom: spacing.md,
  },
  rowHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  rowLabel: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rowCount: {
    color: colors.muted,
    fontSize: 13,
  },
  barTrack: {
    width: '100%',
    height: 6,
    backgroundColor: colors.surface2,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    backgroundColor: colors.brand,
    borderRadius: radii.pill,
  },
  logout: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.muted,
    fontWeight: '600',
  },
});
