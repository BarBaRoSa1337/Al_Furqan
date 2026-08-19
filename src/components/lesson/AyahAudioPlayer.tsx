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
import { isPreviewContentMode } from '../../lib/content/contentMode';

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
  const [message, setMessage] = useState<string>();
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const pendingPlay = useRef(true);
  const handledFinish = useRef(false);
  const currentTrack = tracks[trackIndex];
  const currentUri = resolution && resolution.status !== 'unavailable' ? resolution.uri : '';
  const segmentStart = (currentTrack.startMs ?? 0) / 1000;
  const segmentEnd = currentTrack.endMs !== undefined ? currentTrack.endMs / 1000 : undefined;
  const segmentDuration = segmentEnd !== undefined
    ? Math.max(segmentEnd - segmentStart, 0)
    : status.duration;

  useEffect(() => {
    void setAudioModeAsync({
      allowsRecording: false,
      interruptionMode: 'doNotMix',
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    let release: (() => void) | undefined;
    setResolution(undefined);
    pendingPlay.current = true;
    const policy = resolveAudioAccessPolicy(
      contentPackage,
      currentTrack,
      platformForAudio(Platform.OS),
      { development: isPreviewContentMode() },
    );
    void resolveAndCacheRecitation(currentTrack, policy).then(result => {
      if (cancelled) {
        result.status === 'verified_offline' && result.release?.();
        return;
      }
      release = result.status === 'verified_offline' ? result.release : undefined;
      setResolution(result);
      if ('reason' in result && result.reason) setMessage(result.reason);
    });
    return () => {
      cancelled = true;
      release?.();
    };
  }, [contentPackage, currentTrack]);

  useEffect(() => {
    if (currentUri) {
      player.replace(currentUri);
      pendingPlay.current = true;
      handledFinish.current = false;
    }
  }, [currentUri, player]);

  useEffect(() => {
    if (!status.isLoaded || !currentUri) return;
    const shouldPlay = pendingPlay.current;
    pendingPlay.current = false;
    void player.seekTo(segmentStart).then(() => {
      if (shouldPlay) {
        try {
          player.play();
        } catch {
          // Handled gracefully if browser policy requires user tap
        }
      }
    }).catch(() => {});
  }, [currentUri, player, segmentStart, status.isLoaded]);

  useEffect(() => {
    const segmentFinished = segmentEnd !== undefined && status.currentTime >= segmentEnd - 0.05;
    if (!status.didJustFinish && !segmentFinished) {
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
      void player.seekTo((tracks[0]?.startMs ?? 0) / 1000).then(() => player.play());
      return;
    }
    try { player.pause(); } catch { /* player may already be released */ }
  }, [player, repeatCount, round, segmentEnd, status.currentTime, status.didJustFinish, trackIndex, tracks]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        try { player.pause(); } catch { /* player may already be released */ }
      }
    });
    return () => {
      subscription.remove();
      try { player.pause(); } catch { /* player may already be released */ }
    };
  }, [player]);

  const togglePlayback = () => {
    if (!currentUri) {
      setMessage('Audio is preparing...');
      return;
    }
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || (segmentEnd !== undefined && status.currentTime >= segmentEnd - 0.05)) void player.seekTo(segmentStart);
    player.play();
  };

  const cycleRepeat = () => {
    const nextRepeat: Record<RepeatCount, RepeatCount> = { 1: 3, 3: 5, 5: 1 };
    setRepeatCount(nextRepeat[repeatCount]);
    setRound(1);
  };

  const elapsed = Math.max(status.currentTime - segmentStart, 0);
  const progress = segmentDuration > 0 ? Math.min(elapsed / segmentDuration, 1) : 0;

  return (
    <View style={styles.container}>
      <Card style={styles.minimalCard}>
        <View style={styles.playerRow}>
          <Pressable
            accessibilityLabel={status.playing ? 'Pause recitation' : 'Play recitation'}
            accessibilityRole="button"
            onPress={togglePlayback}
            style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
          >
            <Ionicons name={status.playing ? 'pause' : 'play'} size={20} color={colors.surface} />
          </Pressable>

          <Pressable
            accessibilityLabel="Restart recitation"
            accessibilityRole="button"
            onPress={() => { void player.seekTo(segmentStart); }}
            style={({ pressed }) => [styles.restartButton, pressed && styles.pressed]}
          >
            <Ionicons name="refresh" size={16} color={colors.textMuted} />
          </Pressable>

          <View style={styles.trackInfo}>
            <View accessibilityLabel={`${formatTime(elapsed)} of ${formatTime(segmentDuration)}`} accessibilityRole="progressbar" style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.reciterName}>{reciter.displayName}</Text>
              <Text style={styles.timeText}>{formatTime(elapsed)} / {formatTime(segmentDuration || (currentTrack.durationMs ?? 0) / 1000)}</Text>
            </View>
          </View>

          <Pressable
            accessibilityLabel={`Repeat mode: ${repeatCount} times`}
            accessibilityRole="button"
            onPress={cycleRepeat}
            style={({ pressed }) => [styles.repeatPill, repeatCount > 1 && styles.repeatPillActive, pressed && styles.pressed]}
          >
            <Ionicons name="repeat" size={14} color={repeatCount > 1 ? colors.surface : colors.primary} />
            <Text style={[styles.repeatPillText, repeatCount > 1 && styles.repeatPillTextActive]}>
              {repeatCount > 1 ? `${round}/${repeatCount}` : '1×'}
            </Text>
          </Pressable>
        </View>
      </Card>
      {message ? <Text accessibilityLiveRegion="polite" style={styles.messageText}>{message}</Text> : null}
    </View>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const wholeSeconds = Math.floor(seconds);
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: spacing.xs,
  },
  minimalCard: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  playerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  playButton: {
    alignItems: 'center',
    backgroundColor: colors.success,
    borderRadius: radii.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  restartButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  trackInfo: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  progressTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    height: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    height: 4,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  reciterName: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  timeText: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 10,
  },
  repeatPill: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  repeatPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  repeatPillText: {
    color: colors.primary,
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  repeatPillTextActive: {
    color: colors.surface,
  },
  messageText: {
    color: colors.warning,
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
