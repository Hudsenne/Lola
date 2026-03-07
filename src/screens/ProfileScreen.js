import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

// --- Timeline Placeholder ---
function Timeline() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Longitudinal Timeline</Text>
      <View style={styles.placeholder}>
        <Ionicons name="analytics-outline" size={36} color={colors.purpleSubtle} />
        <Text style={styles.placeholderText}>Timeline graph will be integrated here</Text>
        <Text style={styles.placeholderSub}>791 days tracked</Text>
      </View>
    </View>
  );
}

// --- Baselines ---
function PersonalBaselines() {
  const baselines = [
    { metric: 'Sleep', personal: '7.2 hrs', population: '7.0 hrs', icon: 'moon' },
    { metric: 'Weight', personal: '95.5-97 kg', population: 'N/A', icon: 'scale' },
    { metric: 'Steps', personal: '8,400/day', population: '7,000/day', icon: 'footsteps' },
    { metric: 'Calories', personal: '2,200/day', population: '2,000/day', icon: 'flame' },
    { metric: 'Lifts', personal: '4x/week', population: '2x/week', icon: 'barbell' },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Personal Baselines</Text>
      {baselines.map((b, i) => (
        <View key={i} style={styles.baselineRow}>
          <View style={styles.baselineLeft}>
            <Ionicons name={b.icon} size={16} color={colors.purpleBright} />
            <Text style={styles.baselineMetric}>{b.metric}</Text>
          </View>
          <View style={styles.baselineValues}>
            <View style={styles.baselineCol}>
              <Text style={styles.baselineLabel}>Yours</Text>
              <Text style={styles.baselineValue}>{b.personal}</Text>
            </View>
            <View style={styles.baselineDivider} />
            <View style={styles.baselineCol}>
              <Text style={styles.baselineLabel}>Population</Text>
              <Text style={styles.baselineValueMuted}>{b.population}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// --- Seasonal Patterns ---
function SeasonalPatterns() {
  const patterns = [
    { name: 'Holiday Drift', period: 'Dec', impact: '+3-4.5 kg', severity: 'high' },
    { name: 'Summer Drift', period: 'Jun-Aug', impact: '+1.5-2 kg', severity: 'medium' },
    { name: 'Autumn Creep', period: 'Oct-Nov', impact: '+1-2 kg', severity: 'medium' },
  ];

  const severityColors = { high: colors.red, medium: colors.amber, low: colors.green };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Seasonal Patterns</Text>
      <View style={styles.patternsGrid}>
        {patterns.map((p, i) => (
          <View key={i} style={styles.patternCard}>
            <View style={styles.patternHeader}>
              <Text style={styles.patternName}>{p.name}</Text>
              <View style={[styles.severityDot, { backgroundColor: severityColors[p.severity] }]} />
            </View>
            <Text style={styles.patternPeriod}>{p.period}</Text>
            <Text style={[styles.patternImpact, { color: severityColors[p.severity] }]}>
              {p.impact}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// --- Travel Profile ---
function TravelProfile() {
  const stats = [
    { label: 'Total Trips', value: '63' },
    { label: 'Avg Sleep Loss', value: '-1.2 hrs' },
    { label: 'Avg Weight Impact', value: '+1.8 kg' },
    { label: 'Avg Recovery', value: '4.2 days' },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Travel Profile</Text>
      <View style={styles.travelGrid}>
        {stats.map((s, i) => (
          <View key={i} style={styles.travelStat}>
            <Text style={styles.travelValue}>{s.value}</Text>
            <Text style={styles.travelLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// --- Interventions ---
function InterventionHistory() {
  const interventions = [
    {
      name: 'Magnesium supplementation',
      started: 'March 2024',
      result: 'Sleep improved 14% over 3 weeks',
      effective: true,
    },
    {
      name: 'Intermittent fasting (16:8)',
      started: 'June 2024',
      result: 'No measurable impact after 6 weeks',
      effective: false,
    },
    {
      name: 'Screen-time curfew (10pm)',
      started: 'August 2024',
      result: 'Sleep onset improved 25 min on average',
      effective: true,
    },
    {
      name: '10k steps daily target',
      started: 'September 2024',
      result: 'Weight dropped 1.2kg in first 3 weeks',
      effective: true,
    },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Intervention History</Text>
      {interventions.map((item, i) => (
        <View key={i} style={styles.interventionCard}>
          <View style={styles.interventionHeader}>
            <Ionicons
              name={item.effective ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={item.effective ? colors.green : colors.red}
            />
            <Text style={styles.interventionName}>{item.name}</Text>
          </View>
          <Text style={styles.interventionDate}>Started {item.started}</Text>
          <Text
            style={[
              styles.interventionResult,
              { color: item.effective ? colors.green : colors.textMuted },
            ]}
          >
            {item.result}
          </Text>
        </View>
      ))}
    </View>
  );
}

// --- Main Screen ---
export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile & History</Text>
          <Text style={styles.headerSubtitle}>Understand yourself over time</Text>
        </View>

        <Timeline />
        <PersonalBaselines />
        <SeasonalPatterns />
        <TravelProfile />
        <InterventionHistory />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24 },
  headerTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
  headerSubtitle: { color: colors.textMuted, fontSize: 13, marginTop: 4 },

  section: { marginBottom: 28 },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  sectionSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: -8, marginBottom: 12 },

  // Timeline placeholder
  placeholder: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 10,
  },
  placeholderSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },

  // Baselines
  baselineRow: {
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  baselineLeft: { flexDirection: 'row', alignItems: 'center', width: 90 },
  baselineMetric: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', marginLeft: 8 },
  baselineValues: { flexDirection: 'row', alignItems: 'center' },
  baselineCol: { alignItems: 'center', minWidth: 70 },
  baselineLabel: { color: colors.textMuted, fontSize: 10, marginBottom: 2 },
  baselineValue: { color: colors.purpleBright, fontSize: 13, fontWeight: '700' },
  baselineValueMuted: { color: colors.textMuted, fontSize: 13 },
  baselineDivider: { width: 1, height: 28, backgroundColor: colors.border, marginHorizontal: 12 },

  // Seasonal Patterns
  patternsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  patternCard: { backgroundColor: colors.bgCard, borderRadius: 12, padding: 14, flex: 1, marginHorizontal: 3 },
  patternHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  patternName: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  patternPeriod: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
  patternImpact: { fontSize: 14, fontWeight: '700' },

  // Travel
  travelGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  travelStat: { backgroundColor: colors.bgCard, borderRadius: 12, padding: 14, width: '48%', marginBottom: 8 },
  travelValue: { color: colors.purpleBright, fontSize: 22, fontWeight: '700' },
  travelLabel: { color: colors.textMuted, fontSize: 11, marginTop: 4 },

  // Interventions
  interventionCard: { backgroundColor: colors.bgCard, borderRadius: 10, padding: 14, marginBottom: 8 },
  interventionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  interventionName: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginLeft: 8 },
  interventionDate: { color: colors.textMuted, fontSize: 11, marginLeft: 26, marginBottom: 4 },
  interventionResult: { fontSize: 13, marginLeft: 26, fontWeight: '500' },
});
