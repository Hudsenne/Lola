import React, { useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import MessageBubble from '../components/chat/MessageBubble';
import ChatInput from '../components/chat/ChatInput';

const initialMessages = [
  {
    id: '1',
    type: 'observation',
    text: 'Good morning! Your sleep has been below baseline for 4 nights now. Want me to adjust your evening protocol?',
    time: '7:30 AM',
  },
  {
    id: '2',
    type: 'user',
    text: "Yeah that makes sense. I've been staying up too late on my phone.",
    time: '7:32 AM',
  },
  {
    id: '3',
    type: 'observation',
    text: "Got it. I'll set up a screen-time wind-down protocol starting at 10pm. I also noticed your step count has dropped below your baseline of 8,400 for the past week — want me to suggest a walking schedule?",
    time: '7:32 AM',
  },
  {
    id: '4',
    type: 'user',
    text: 'Had eggs and toast for breakfast, went for a 30 minute run, feeling off today.',
    time: '8:15 AM',
    confirmationData: [
      { label: 'Meal', value: 'Eggs & toast (~350 cal)' },
      { label: 'Exercise', value: '30 min run (~280 cal)' },
      { label: 'Self-report', value: 'Feeling off' },
    ],
  },
  {
    id: '5',
    type: 'errand',
    text: "Booked your blood panel for Thursday at 2pm at Quest Diagnostics on Main St. I'll send you a reminder Wednesday evening.",
    time: '9:00 AM',
  },
  {
    id: '6',
    type: 'observation',
    text: 'Your Austin trip is 8 days out. Based on your last 3 trips, day 2 is when sleep drops hardest. Want me to create a prep protocol to bank sleep before you go?',
    time: '10:15 AM',
  },
  {
    id: '7',
    type: 'user',
    text: 'Why am I stuck at this weight plateau?',
    time: '11:00 AM',
  },
  {
    id: '8',
    type: 'question',
    text: "You've been in the 95.5-97kg band for about 11 weeks. Looking at your data: your calorie intake has crept up ~200cal/day since September, your lifting frequency dropped from 4 to 3 sessions, and sleep quality is down 18%. The combination is likely maintaining equilibrium at a higher set point than your target. The strongest lever historically for you has been sleep — when you improved it in March, weight started moving within 2 weeks.",
    time: '11:01 AM',
  },
];

export default function ChatScreen() {
  const [messages, setMessages] = useState(initialMessages);
  const scrollRef = useRef(null);

  const handleSend = (text) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const newMsg = {
      id: Date.now().toString(),
      type: 'user',
      text: text,
      time: timeStr,
    };
    setMessages((prev) => [...prev, newMsg]);
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollToEnd({ animated: true });
      }
    }, 100);

    // Simulate LOLA response
    setTimeout(() => {
      const replyTime = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: 'observation',
          text: "Got it, I've logged that. Let me know if you need anything else.",
          time: replyTime,
        },
      ]);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          onContentSizeChange={() => {
            if (scrollRef.current) {
              scrollRef.current.scrollToEnd({ animated: false });
            }
          }}
        >
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              type={msg.type}
              text={msg.text}
              time={msg.time}
              confirmationData={msg.confirmationData}
            />
          ))}
        </ScrollView>
        <ChatInput onSend={handleSend} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 8,
  },
});
