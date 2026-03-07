import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function AgentPromptCard({ headline, reasoning, status, onSend, onDismiss }) {
  const isWorking = status === 'working';
  const isDone = status === 'done';

  return (
    <View style={[styles.container, isDone && styles.doneContainer]}>
      <View style={styles.header}>
        <View style={styles.iconBadge}>
          <Ionicons
            name={isDone ? 'checkmark-circle' : isWorking ? 'hourglass' : 'flash'}
            size={18}
            color={isDone ? colors.green : colors.purple}
          />
        </View>
        <Text style={styles.headline} numberOfLines={2}>
          {headline}
        </Text>
      </View>
      <Text style={styles.reasoning}>{reasoning}</Text>
      {isWorking && (
        <View style={styles.statusRow}>
          <Ionicons name="sync" size={12} color={colors.purple} />
          <Text style={styles.workingText}>Working on it...</Text>
        </View>
      )}
      {isDone && (
        <View style={styles.statusRow}>
          <Ionicons name="checkmark" size={12} color={colors.green} />
          <Text style={styles.doneText}>Done</Text>
        </View>
      )}
      {!status && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.sendButton} onPress={onSend} activeOpacity={0.8}>
            <Ionicons name="send" size={14} color="#fff" />
            <Text style={styles.sendText}>Send LOLA</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} activeOpacity={0.7}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  doneContainer: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.purpleSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headline: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  reasoning: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    marginLeft: 42,
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 42,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.purple,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 10,
  },
  sendText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  dismissButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.bgElevated,
  },
  dismissText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 42,
  },
  workingText: {
    color: colors.purple,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
  doneText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
});
