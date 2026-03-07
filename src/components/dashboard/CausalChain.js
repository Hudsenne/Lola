import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function CausalChain({ message, isStable }) {
  const displayMessage =
    message ||
    'Your sleep has been down for 3 nights, which is likely driving the cravings you logged yesterday.';

  if (isStable) {
    return (
      <View style={[styles.container, styles.stableContainer]}>
        <Ionicons name="checkmark-circle" size={18} color={colors.green} />
        <Text style={[styles.text, styles.stableText]}>All signals stable.</Text>
      </View>
    );
  }

  const parts = displayMessage.split(/(\*[^*]+\*)/g);
  const rendered = parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <Text key={i} style={styles.highlight}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return <Text key={i}>{part}</Text>;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="link" size={14} color={colors.purpleBright} />
        <Text style={styles.headerText}>What's Happening</Text>
      </View>
      <Text style={styles.text}>{rendered}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.purpleSubtle,
  },
  stableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  headerText: {
    color: colors.purpleBright,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  text: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  stableText: {
    color: colors.green,
    fontWeight: '600',
  },
  highlight: {
    color: colors.purpleBright,
    fontWeight: '600',
  },
});
