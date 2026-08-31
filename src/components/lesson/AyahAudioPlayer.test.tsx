import { render, waitFor } from '@testing-library/react-native';
import surahAlFilPackage from '../../content/packages/surah-al-fil/v1';
import { mockAudioPlayer, resetAudioMock, setMockAudioLoaded } from '../../test/expoAudioMock';
import AyahAudioPlayer from './AyahAudioPlayer';

jest.mock('../../lib/audio/audioCache', () => ({
  resolveAndCacheRecitation: async () => ({ status: 'streaming', uri: 'https://audio.example/ayah.mp3' }),
}));

const reciter = surahAlFilPackage.reciters[0];
const track = surahAlFilPackage.recitationTracks[0];

beforeEach(resetAudioMock);

test('autoplays resolved recitation when learner preference is enabled', async () => {
  render(<AyahAudioPlayer autoplay contentPackage={surahAlFilPackage} reciter={reciter} tracks={[track]} />);

  await waitFor(() => expect(mockAudioPlayer.play).toHaveBeenCalled());
});

test('preloads without autoplay and keeps manual play action available', async () => {
  const screen = render(<AyahAudioPlayer autoplay={false} contentPackage={surahAlFilPackage} reciter={reciter} tracks={[track]} />);

  await waitFor(() => expect(screen.getByLabelText('Play recitation')).toBeTruthy());
  expect(mockAudioPlayer.replace).not.toHaveBeenCalled();
  expect(mockAudioPlayer.play).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Play recitation')).toBeTruthy();
});

test('waits for resolved audio source to load before autoplaying', async () => {
  setMockAudioLoaded(false);
  const screen = render(<AyahAudioPlayer autoplay contentPackage={surahAlFilPackage} reciter={reciter} tracks={[track]} />);

  await waitFor(() => expect(mockAudioPlayer.play).not.toHaveBeenCalled());
  setMockAudioLoaded(true);
  screen.rerender(<AyahAudioPlayer autoplay contentPackage={surahAlFilPackage} reciter={reciter} tracks={[track]} />);

  await waitFor(() => expect(mockAudioPlayer.play).toHaveBeenCalledTimes(1));
});
