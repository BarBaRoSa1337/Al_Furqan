process.env.EXPO_PUBLIC_FURQAN_CONTENT_MODE = 'preview';

jest.mock(
  '@react-native-async-storage/async-storage',
  () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
