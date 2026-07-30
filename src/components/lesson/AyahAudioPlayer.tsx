import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { resolveAndCacheRecitation, type AudioCacheResult } from '../../lib/audio/audioCache';
import { platformForAudio, resolveAudioAccessPolicy } from '../../lib/audio/audioPolicy';
import { colors, fonts, radii, spacing, touch } from '../../theme/tokens';
import type { ContentPackage } from '../../types/content';
import type { RecitationTrack, Reciter } from '../../types/media';
import Card from '../ui/Card';

type RepeatCount = 1 | 3 | 5;

export default function AyahAudioPlayer({
  tracks,
  reciter,
  contentPackage,
}: {
  tracks: RecitationTrack[];
  reciter: Reciter;
  contentPackage: ContentPackage;
}) {
  const [trackIndex, setTrackIndex] = useState(0);
  const [repeatCount, setRepeatCount] = useState<RepeatCount>(1);
  const [round, setRound] = useState(1);
  const [resolution, setResolution] = useState<AudioCacheResult>();
  const [cacheStatus, setCacheStatus] = useState<'checking' | 'verified' | 'streaming' | 'unavailable'>('checking');
  const [message, setMessage] = useState<string>();
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const pendingPlay = useRef(Platform.OS !== 'web');
  const handledFinish = useRef(false);
  const currentTrack = tracks[trackIndex];
  const currentUri = resolution && resolution.status !== 'unavailable' ? resolution.uri : '';

  useEffect(() => {
    void setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: 'doNotMix',
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => setMessage('Audio settings could not be applied.'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let release: (() => void) | undefined;
    setResolution(undefined);
    setCacheStatus('checking');
    setMessage(Platform.OS === 'web' ? 'Tap Play to start recitation.' : undefined);
    const policy = resolveAudioAccessPolicy(
      contentPackage,
      currentTrack,
      platformForAudio(Platform.OS),
      { development: __DEV__ },
    );
    void resolveAndCacheRecitation(currentTrack, policy).then(result => {
      if (cancelled) {
        result.status === 'verified_offline' && result.release?.();
        return;
      }
      release = result.status === 'verified_offline' ? result.release : undefined;
      setResolution(result);
      setCacheStatus(result.status === 'verified_offline'
        ? 'verified'
        : result.status === 'streaming' ? 'streaming' : 'unavailable');
      if ('reason' in result && result.reason) setMessage(result.reason);
    });
    return () => {
      cancelled = true;
      release?.();
    };
  }, [contentPackage, currentTrack]);

  useEffect(() => {
    player.replace(currentUri || null);
    pendingPlay.current = Platform.OS !== 'web';
    handledFinish.current = false;
  }, [currentUri, player]);

  useEffect(() => {
    if (!status.isLoaded || !pendingPlay.current || !currentUri) return;
    pendingPlay.current = false;
    try {
      player.play();
    } catch {
      setMessage('Tap Play to start recitation.');
    }
  }, [currentUri, player, status.isLoaded]);

  useEffect(() => {
    if (!status.didJustFinish) {
      handledFinish.current = false;
      return;
    }
    if (handledFinish.current) return;
    handledFinish.current = true;
    if (trackIndex < tracks.length - 1) {
      setTrackIndex(index => index + 1);
      return;
    }
    if (round < repeatCount) {
      setRound(value => value + 1);
      setTrackIndex(0);
      pendingPlay.current = true;
      void player.seekTo(0).then(() => player.play());
    }
  }, [player, repeatCount, round, status.didJustFinish, trackIndex, tracks.length]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') player.pause();
    });
    return () => {
      subscription.remove();
      player.pause();
    };
  }, [player]);

  const togglePlayback = () => {
    if (!currentUri) {
      setMessage('Audio is not ready for playback.');
      return;
    }
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish) void player.seekTo(0);
    player.play();
  };
  const progress = status.duration > 0 ? Math.min(status.currentTime / status.duration, 1) : 0;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Listen</Text>
          <Text style={styles.reciter}>{reciter.displayName}</Text>
          <Text style={styles.ayah}>
            Ayah {currentTrack.ayahRef.surahNumber}:{currentTrack.ayahRef.ayahNumber}
            {tracks.length > 1 ? ` · ${trackIndex + 1}/${tracks.length}` : ''}
          </Text>
        </View>
        <View style={styles.sourceBadge}>
          <Ionicons name={cacheStatus === 'verified' ? 'shield-checkmark-outline' : cacheStatus === 'unavailable' ? 'alert-circle-outline' : 'cloud-outline'} size={14} color={cacheStatus === 'unavailable' ? colors.warning : colors.success} />
          <Text style={[styles.sourceBadgeText, cacheStatus === 'unavailable' && styles.sourceBadgeWarning]}>
            {cacheStatus === 'verified'
              ? resolution?.status === 'verified_offline' && resolution.expiresAt
                ? `Offline until ${new Date(resolution.expiresAt).toLocaleDateString()}`
                : 'Verified offline'
              : cacheStatus === 'checking' ? 'Checking rights' : cacheStatus === 'unavailable' ? 'Unavailable' : 'Streaming only'}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable accessibilityLabel="Restart recitation" accessibilityRole="button" onPress={() => { void player.seekTo(0); }} style={({ pressed }) => [styles.secondaryControl, pressed && styles.pressed]}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </Pressable>
        <Pressable
          accessibilityLabel={status.playing ? 'Pause recitation' : 'Play recitation'}
          accessibilityRole="button"
          onPress={togglePlayback}
          style={({ pressed }) => [styles.playControl, pressed && styles.pressed]}
        >
          <Ionicons name={status.playing ? 'pause' : 'play'} size={28} color={colors.surface} />
        </Pressable>
        <View style={styles.timeWrap}>
          <View accessibilityLabel={`${formatTime(status.currentTime)} of ${formatTime(status.duration)}`} accessibilityRole="progressbar" style={styles.progress}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.time}>{formatTime(status.currentTime)} / {formatTime(status.duration || (currentTrack.durationMs ?? 0) / 1000)}</Text>
        </View>
      </View>

      <View style={styles.repeatRow}>
        <Text style={styles.repeatLabel}>Repeat</Text>
        {([1, 3, 5] as RepeatCount[]).map(count => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: repeatCount === count }}
            key={count}
            onPress={() => { setRepeatCount(count); setRound(1); }}
            style={({ pressed }) => [styles.repeatButton, repeatCount === count && styles.repeatButtonSelected, pressed && styles.pressed]}
          >
            <Text style={[styles.repeatText, repeatCount === count && styles.repeatTextSelected]}>{count}×</Text>
          </Pressable>
        ))}
        <Text style={styles.roundText}>{repeatCount > 1 ? `${round}/${repeatCount}` : null}</Text>
      </View>
      {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
    </Card>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const wholeSeconds = Math.floor(seconds);
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  card: { borderColor: colors.borderStrong, borderWidth: 1 },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: colors.success, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.7, textTransform: 'uppercase' },
  reciter: { color: colors.primary, fontFamily: fonts.bold, fontSize: 17, marginTop: 2 },
  ayah: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 12, marginTop: 1 },
  sourceBadge: { alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: radii.pill, flexDirection: 'row', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  sourceBadgeText: { color: colors.success, fontFamily: fonts.bold, fontSize: 9 },
  sourceBadgeWarning: { color: colors.warning },
  controls: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  secondaryControl: { alignItems: 'center', borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, height: touch.minimum, justifyContent: 'center', width: touch.minimum },
  playControl: { alignItems: 'center', backgroundColor: colors.success, borderRadius: radii.pill, height: 58, justifyContent: 'center', width: 58 },
  timeWrap: { flex: 1 },
  progress: { backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, height: 7, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.gold, borderRadius: radii.pill, height: 7 },
  time: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 11, marginTop: spacing.xs, textAlign: 'right' },
  repeatRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  repeatLabel: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 11, marginRight: spacing.xs, textTransform: 'uppercase' },
  repeatButton: { alignItems: 'center', borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center', minHeight: 34, minWidth: 42, paddingHorizontal: spacing.sm },
  repeatButtonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  repeatText: { color: colors.text, fontFamily: fonts.bold, fontSize: 12 },
  repeatTextSelected: { color: colors.surface },
  roundText: { color: colors.gold, fontFamily: fonts.bold, fontSize: 11, marginLeft: 'auto' },
  message: { color: colors.warning, fontFamily: fonts.medium, fontSize: 11, lineHeight: 16, marginTop: spacing.md },
  pressed: { opacity: 0.68 },
});
