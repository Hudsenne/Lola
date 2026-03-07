import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

const metrics = [
  {
    label: 'Sleep',
    icon: 'moon',
    value: 6.8,
    unit: 'hrs',
    baseline: { low: 7.0, high: 7.5 },
    status: 'amber',
  },
  {
    label: 'Weight',
    icon: 'scale',
    value: 96.2,
    unit: 'kg',
    baseline: { low: 95.5, high: 97.0 },
    status: 'green',
  },
  {
    label: 'Activity',
    icon: 'fitness',
    value: 6200,
    unit: 'steps',
    baseline: { low: 8000, high: 10000 },
    status: 'red',
  },
];

const statusColors = {
  green: colors.green,
  amber: colors.amber,
  red: colors.red,
};

const statusBg = {
  green: colors.greenBg,
  amber: colors.amberBg,
  red: colors.redBg,
};

const statusLabels = {
  green: 'On Track',
  amber: 'Mild Drift',
  red: 'Drifting',
};

function DriftBar({ metric }) {
  const color = statusColors[metric.status];
  const bg = statusBg[metric.status];

  // Layout: [red 20%] [amber 15%] [green 30%] [amber 15%] [red 20%]
  const redW = 20;
  const amberW = 15;
  const greenW = 30;
  const totalRange = 2 * redW + 2 * amberW + greenW; // 100

  // Map value position across the full range
  const range = metric.baseline.high - metric.baseline.low;
  const amberRange = range * 0.5;
  const fullLow = metric.baseline.low - amberRange - (range * 0.67);
  const fullHigh = metric.baseline.high + amberRange + (range * 0.67);
  const fullRange = fullHigh - fullLow;
  const position = Math.max(0, Math.min(1, (metric.value - fullLow) / fullRange));

  return (
    <TouchableOpacity style={[styles.bar, { borderLeftColor: color }]} activeOpacity={0.7}>
      <View style={styles.barTop}>
        <View style={styles.barLabel}>
          <Ionicons name={metric.icon} size={16} color={color} />
          <Text style={styles.barLabelText}>{metric.label}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: bg }]}>
          <Text style={[styles.statusText, { color }]}>{statusLabels[metric.status]}</Text>
        </View>
      </View>
      <View style={styles.trackContainer}>
        <View style={styles.track}>
          {/* Red zone left */}
          <View style={[styles.zone, { left: '0%', width: `${redW}%`, backgroundColor: 'rgba(239, 68, 68, 0.15)' }]} />
          {/* Amber zone left */}
          <View style={[styles.zone, { left: `${redW}%`, width: `${amberW}%`, backgroundColor: 'rgba(245, 158, 11, 0.15)' }]} />
          {/* Green zone center */}
          <View style={[styles.zone, { left: `${redW + amberW}%`, width: `${greenW}%`, backgroundColor: 'rgba(16, 185, 129, 0.2)' }]} />
          {/* Amber zone right */}
          <View style={[styles.zone, { left: `${redW + amberW + greenW}%`, width: `${amberW}%`, backgroundColor: 'rgba(245, 158, 11, 0.15)' }]} />
          {/* Red zone right */}
          <View style={[styles.zone, { left: `${redW + 2 * amberW + greenW}%`, width: `${redW}%`, backgroundColor: 'rgba(239, 68, 68, 0.15)', borderTopRightRadius: 3, borderBottomRightRadius: 3 }]} />
          {/* Indicator dot */}
          <View
            style={[
              styles.indicator,
              {
                left: `${position * 100}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      </View>
      <View style={styles.barBottom}>
        <Text style={styles.valueText}>
          {metric.value.toLocaleString()}
          <Text style={styles.unitText}> {metric.unit}</Text>
        </Text>
        <Text style={styles.rangeText}>
          Baseline: {metric.baseline.low}-{metric.baseline.high} {metric.unit}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DriftStatus() {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Drift Status</Text>
      {metrics.map((metric) => (
        <DriftBar key={metric.label} metric={metric} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  bar: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  barTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  barLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabelText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  trackContainer: {
    marginBottom: 8,
  },
  track: {
    height: 6,
    backgroundColor: colors.bgElevated,
    borderRadius: 3,
    position: 'relative',
  },
  zone: {
    position: 'absolute',
    top: 0,
    height: 6,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  indicator: {
    position: 'absolute',
    top: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  barBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  unitText: {
    color: colors.textSecondary,
    fontWeight: '400',
  },
  rangeText: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
