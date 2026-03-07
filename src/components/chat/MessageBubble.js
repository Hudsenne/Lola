import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

const typeConfig = {
  user: {
    label: 'You',
    icon: 'person',
    accentColor: colors.chatUser,
    bgColor: 'rgba(139, 92, 246, 0.12)',
    align: 'right',
  },
  observation: {
    label: 'LOLA',
    icon: 'eye',
    accentColor: colors.chatLola,
    bgColor: 'rgba(99, 102, 241, 0.12)',
    align: 'left',
  },
  errand: {
    label: 'Errand Update',
    icon: 'checkmark-circle',
    accentColor: colors.chatErrand,
    bgColor: 'rgba(16, 185, 129, 0.12)',
    align: 'left',
  },
  question: {
    label: 'LOLA',
    icon: 'bulb',
    accentColor: colors.chatQuestion,
    bgColor: 'rgba(245, 158, 11, 0.12)',
    align: 'left',
  },
};

export default function MessageBubble({ type, text, time, confirmationData }) {
  const config = typeConfig[type] || typeConfig.user;
  const isUser = type === 'user';

  return (
    <View style={[styles.container, isUser && styles.containerRight]}>
      {!isUser && (
        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: config.accentColor + '30' }]}>
            <Ionicons name={config.icon} size={14} color={config.accentColor} />
          </View>
          <Text style={[styles.label, { color: config.accentColor }]}>{config.label}</Text>
          {time ? <Text style={styles.time}>{time}</Text> : null}
        </View>
      )}
      <View style={[styles.bubble, { backgroundColor: config.bgColor }, isUser && styles.bubbleUser]}>
        <Text style={styles.text}>{text}</Text>
      </View>
      {confirmationData && (
        <View style={styles.confirmationCard}>
          <View style={styles.confirmationHeader}>
            <Ionicons name="checkmark" size={14} color={colors.green} />
            <Text style={styles.confirmationTitle}>Logged</Text>
          </View>
          {confirmationData.map((item, i) => (
            <View key={i} style={styles.confirmationRow}>
              <Text style={styles.confirmationLabel}>{item.label}</Text>
              <Text style={styles.confirmationValue}>{item.value}</Text>
            </View>
          ))}
          <Text style={styles.editLink}>Edit</Text>
        </View>
      )}
      {isUser && time ? <Text style={[styles.time, styles.timeRight]}>{time}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  containerRight: {
    alignSelf: 'flex-end',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  time: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 'auto',
  },
  timeRight: {
    textAlign: 'right',
    marginTop: 4,
  },
  bubble: {
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 14,
  },
  bubbleUser: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 4,
  },
  text: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
  confirmationCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    borderLeftWidth: 2,
    borderLeftColor: colors.green,
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  confirmationTitle: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  confirmationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  confirmationLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  confirmationValue: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  editLink: {
    color: colors.purple,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
});
