import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function ContextWindow({ event, daysAway, prepProtocol }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <Ionicons name="calendar" size={16} color={colors.purpleBright} />
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event}</Text>
          <Text style={styles.daysAway}>{daysAway} days away</Text>
        </View>
        <View style={styles.countdownBadge}>
          <Text style={styles.countdownText}>{daysAway}d</Text>
        </View>
      </View>
      {prepProtocol && (
        <TouchableOpacity
          style={styles.protocolToggle}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.protocolLabel}>Prep Protocol</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      )}
      {expanded && prepProtocol && (
        <View style={styles.protocolContent}>
          {prepProtocol.map((step, i) => (
            <View key={i} style={styles.protocolStep}>
              <View style={styles.stepDot} />
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.purpleSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  daysAway: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  countdownBadge: {
    backgroundColor: colors.purpleSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countdownText: {
    color: colors.purpleBright,
    fontSize: 13,
    fontWeight: '700',
  },
  protocolToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  protocolLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  protocolContent: {
    marginTop: 10,
  },
  protocolStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.purple,
    marginTop: 6,
    marginRight: 10,
  },
  stepText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
});
