declare module 'react-native-confetti-cannon' {
  import React from 'react';
  import { ViewProps } from 'react-native';

  interface ConfettiCannonProps extends ViewProps {
    count: number;
    origin: { x: number; y: number };
    explosionSpeed?: number;
    fallSpeed?: number;
    colors?: string[];
    fadeOut?: boolean;
    autoStart?: boolean;
    autoStartDelay?: number;
    onAnimationStart?: () => void;
    onAnimationEnd?: () => void;
  }

  export default class ConfettiCannon extends React.Component<ConfettiCannonProps> {
    start(): void;
  }
}
