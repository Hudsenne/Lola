import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import DriftStatus from '../components/dashboard/DriftStatus';
import CausalChain from '../components/dashboard/CausalChain';
import AgentPromptCard from '../components/dashboard/AgentPromptCard';
import ContextWindow from '../components/dashboard/ContextWindow';
import MacroSnapshot from '../components/dashboard/MacroSnapshot';

const samplePromptCards = [
  {
    id: '1',
    headline: 'Book a blood panel',
    reasoning:
      'Your fasting glucose has trended up 8% over 3 weeks and your last panel was 4 months ago.',
    status: null,
  },
  {
    id: '2',
    headline: 'Order magnesium before Thursday',
    reasoning:
      'Your sleep quality dropped 14% since running out. Previous supply improved deep sleep by 22 minutes.',
    status: null,
  },
  {
    id: '3',
    headline: 'Adjust evening screen time protocol',
    reasoning: 'Late screen sessions correlate with 40min later sleep onset in your data.',
    status: 'working',
  },
];

const sampleContextWindows = [
  {
    event: 'Trip to Austin',
    daysAway: 8,
    prepProtocol: [
      'Bank 5 extra hours of sleep over the next 4 nights.',
      'Based on your last 3 trips, day 2 is when sleep drops hardest.',
      'Pre-log meal targets — your Austin trips average +400cal/day.',
    ],
  },
  {
    event: 'Holiday Drift window opens Nov 14',
    daysAway: 22,
    prepProtocol: [
      'Historically you gain 3-4.5kg during this window.',
      'Start front-loading activity now — 10k steps/day minimum.',
    ],
  },
];

export default function DashboardScreen() {
  const [promptCards, setPromptCards] = useState(samplePromptCards);

  const handleSend = (id) => {
    setPromptCards((cards) =>
      cards.map((c) => (c.id === id ? { ...c, status: 'working' } : c))
    );
    setTimeout(() => {
      setPromptCards((cards) =>
        cards.map((c) => (c.id === id ? { ...c, status: 'done' } : c))
      );
    }, 2000);
  };

  const handleDismiss = (id) => {
    setPromptCards((cards) => cards.filter((c) => c.id !== id));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>LOLA</Text>
          <Text style={styles.subtitle}>Your health command center</Text>
        </View>

        <DriftStatus />

        <CausalChain
          message="Your *sleep* has been down for 3 nights, which is likely driving the *cravings* you logged yesterday. That's pushing your *calories* up and your *weight* is starting to drift."
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agent Suggestions</Text>
          {promptCards.map((card) => (
            <AgentPromptCard
              key={card.id}
              headline={card.headline}
              reasoning={card.reasoning}
              status={card.status}
              onSend={() => handleSend(card.id)}
              onDismiss={() => handleDismiss(card.id)}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          {sampleContextWindows.map((cw, i) => (
            <ContextWindow key={i} {...cw} />
          ))}
        </View>

        <MacroSnapshot />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  logo: {
    color: colors.purple,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  section: {
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
});
