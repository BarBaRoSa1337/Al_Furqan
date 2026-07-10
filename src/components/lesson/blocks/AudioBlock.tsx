import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AudioLessonBlock } from '../../../types/content';
import Card from '../../ui/Card';

interface Props { block: AudioLessonBlock; }

// Audio is a placeholder in MVP — playback to be added later
const AudioBlock: React.FC<Props> = ({ block }) => {
  const { title, duration } = block.content;

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.iconWrapper}>
          <Text style={styles.icon}>🎵</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>{title ?? 'Quran Recitation'}</Text>
          {duration ? <Text style={styles.duration}>{duration}s</Text> : null}
          <Text style={styles.placeholder}>Audio playback coming soon</Text>
        </View>
        <TouchableOpacity style={styles.playBtn} activeOpacity={0.8}>
          <Text style={styles.playIcon}>▶</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrapper: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EBF5FB', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  duration: { fontSize: 12, color: '#888' },
  placeholder: { fontSize: 11, color: '#AAA', marginTop: 2 },
  playBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1B4F72', alignItems: 'center', justifyContent: 'center' },
  playIcon: { color: '#FFF', fontSize: 14 },
});

export default AudioBlock;
