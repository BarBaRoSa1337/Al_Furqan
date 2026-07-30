const player = {
  replace: () => undefined,
  play: () => undefined,
  pause: () => undefined,
  seekTo: async () => undefined,
};

export function useAudioPlayer() {
  return player;
}

export function useAudioPlayerStatus() {
  return {
    currentTime: 0,
    didJustFinish: false,
    duration: 0,
    isLoaded: false,
    playing: false,
  };
}

export async function setAudioModeAsync() {
  return undefined;
}
