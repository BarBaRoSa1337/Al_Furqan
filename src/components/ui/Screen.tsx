import React from 'react';
import { View, StyleSheet, ViewStyle, StatusBar, StatusBarStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  statusBarStyle?: StatusBarStyle;
}

const Screen: React.FC<ScreenProps> = ({
  children,
  style,
  backgroundColor = '#F5F0E8',
  edges = ['top', 'left', 'right'],
  statusBarStyle = 'dark-content',
}) => {
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]} edges={edges}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={backgroundColor} />
      <View style={[styles.content, style]}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1 },
});

export default Screen;
