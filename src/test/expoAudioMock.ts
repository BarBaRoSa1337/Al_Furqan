export const mockAudioPlayer = {
  replace: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(async () => undefined),
};

export let mockAudioStatus = {
  currentTime: 0,
  didJustFinish: false,
  duration: 10,
  isLoaded: true,
  playing: false,
};

export function resetAudioMock(): void {
  Object.values(mockAudioPlayer).forEach(mock => mock.mockClear());
  mockAudioStatus = { currentTime: 0, didJustFinish: false, duration: 10, isLoaded: true, playing: false };
}

export function useAudioPlayer() {
  return mockAudioPlayer;
}

export function useAudioPlayerStatus() {
  return mockAudioStatus;
}

export async function setAudioModeAsync() {
  return undefined;
}
