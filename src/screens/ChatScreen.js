import React, { useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import MessageBubble from '../components/chat/MessageBubble';
import ChatInput from '../components/chat/ChatInput';
import { api } from '../api';

const initialMessages = [
  { id: '1', type: 'observation', text: 'Good morning! Your sleep has been below baseline for 4 nights. Want me to adjust your evening protocol?', time: '7:30 AM' },
];

export default function ChatScreen() {
  const [messages, setMessages] = useState(initialMessages);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const handleSend = async (text) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const userMsg = { id: Date.now().toString(), type: 'user', text, time: timeStr };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const history = updatedMessages.map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.text }));
const data = await api.chat(text, history);
      const replyTime = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), type: 'observation', text: data.reply, time: replyTime }]);
    } catch (e) {
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), type: 'observation', text: 'Connection error — check the server.', time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
          {messages.map((msg) => (<MessageBubble key={msg.id} type={msg.type} text={msg.text} time={msg.time} confirmationData={msg.confirmationData} />))}
          {loading && <MessageBubble type="observation" text="..." time="" />}
        </ScrollView>
        <ChatInput onSend={handleSend} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 8 },
});
