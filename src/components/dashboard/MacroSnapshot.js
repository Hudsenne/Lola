import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

const topRow = [
  { label: 'Sleep', icon: 'moon', value: '6.8h', trend: 'down', trendColor: colors.amber },
  { label: 'Calories', icon: 'flame', value: '2,340', trend: 'up', trendColor: colors.amber },
];

const bottomRow = [
  { label: 'Steps', icon: 'footsteps', value: '6,200', trend: 'down', trendColor: colors.red },
  { label: 'Lifts', icon: 'barbell', value: '3/wk', trend: 'stable', trendColor: colors.green },
  { label: 'Weight', icon: 'scale', value: '96.2', trend: 'stable', trendColor: colors.green },
];

const trendIcons = {
  up: 'arrow-up',
  down: 'arrow-down',
  stable: 'remove',
};

export default function MacroSnapshot() {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Macro Health Snapshot</Text>
      <View style={styles.rowCentered}>
        {topRow.map((metric) => (
          <TouchableOpacity key={metric.label} style={styles.tileHalf} activeOpacity={0.7}>
            <View style={styles.tileHeader}>
              <Ionicons name={metric.icon} size={18} color={colors.purpleBright} />
              <Ionicons name={trendIcons[metric.trend]} size={14} color={metric.trendColor} />
            </View>
            <Text style={styles.tileValue}>{metric.value}</Text>
            <Text style={styles.tileLabel}>{metric.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.row}>
        {bottomRow.map((metric) => (
          <TouchableOpacity key={metric.label} style={styles.tileThird} activeOpacity={0.7}>
            <View style={styles.tileHeader}>
              <Ionicons name={metric.icon} size={18} color={colors.purpleBright} />
              <Ionicons name={trendIcons[metric.trend]} size={14} color={metric.trendColor} />
            </View>
            <Text style={styles.tileValue}>{metric.value}</Text>
            <Text style={styles.tileLabel}>{metric.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rowCentered: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tileThird: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    width: '32%',
  },
  tileHalf: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    width: '47%',
    marginHorizontal: 4,
  },
  tileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tileValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  tileLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
});
