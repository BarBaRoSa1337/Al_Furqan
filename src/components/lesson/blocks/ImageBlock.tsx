import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { ImageLessonBlock } from '../../../types/content';
import Card from '../../ui/Card';

interface Props { block: ImageLessonBlock; }

const ImageBlock: React.FC<Props> = ({ block }) => {
  const { url, caption, altText } = block.content;
  const [error, setError] = React.useState(false);

  return (
    <Card>
      {!error && url ? (
        <Image
          source={{ uri: url }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setError(true)}
          accessibilityLabel={altText ?? caption}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>🖼️</Text>
          <Text style={styles.placeholderText}>{altText ?? caption ?? 'Image unavailable'}</Text>
        </View>
      )}
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  image: { width: '100%', height: 200, borderRadius: 10 },
  placeholder: { height: 140, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F0F0', borderRadius: 10 },
  placeholderIcon: { fontSize: 32, marginBottom: 8 },
  placeholderText: { fontSize: 13, color: '#999', textAlign: 'center' },
  caption: { fontSize: 13, color: '#666', marginTop: 8, textAlign: 'center', fontStyle: 'italic' },
});

export default ImageBlock;
