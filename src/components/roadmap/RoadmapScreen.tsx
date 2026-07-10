// Roadmap Screen Component

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getContentRepository } from '../../lib/content/repository';
import { ContentPackage, Lesson } from '../../types/content';

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  type: 'package' | 'lesson';
  packageId?: string;
  completed?: boolean;
  duration?: number;
  level?: 'beginner' | 'intermediate' | 'advanced';
}

const RoadmapScreen: React.FC = () => {
  const router = useRouter();
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRoadmapData();
  }, []);

  const loadRoadmapData = async () => {
    try {
      setLoading(true);
      const repository = getContentRepository();
      
      // Get all packages and convert to roadmap items
      const packages = repository.getAllPackages();
      const lessons = repository.getAllLessons();
      
      const roadmapItems: RoadmapItem[] = [];
      
      // Add packages as main roadmap items
      packages.forEach(pkg => {
        roadmapItems.push({
          id: pkg.id,
          title: pkg.title,
          description: pkg.description,
          type: 'package',
          duration: pkg.metadata.totalDuration,
          level: 'beginner' // Default level for packages
        });
        
        // Add lessons as sub-items
        const packageLessons = repository.getLessonsByPackageId(pkg.id);
        packageLessons.forEach(lesson => {
          roadmapItems.push({
            id: lesson.id,
            title: lesson.title,
            description: lesson.description || '',
            type: 'lesson',
            packageId: lesson.packageId,
            duration: lesson.durationMinutes,
            level: lesson.level
          });
        });
      });

      setItems(roadmapItems);
      setError(null);
    } catch (err) {
      console.error('Error loading roadmap data:', err);
      setError('Failed to load roadmap data');
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item: RoadmapItem) => {
    if (item.type === 'package') {
      // Navigate to package detail or first lesson
      const repository = getContentRepository();
      const lessons = repository.getLessonsByPackageId(item.id);
      if (lessons.length > 0) {
        router.push(`/lesson/${lessons[0].id}`);
      }
    } else if (item.type === 'lesson') {
      router.push(`/lesson/${item.id}`);
    }
  };

  const renderItem = ({ item }: { item: RoadmapItem }) => (
    <TouchableOpacity
      style={[styles.itemContainer, item.type === 'lesson' && styles.lessonItem]}
      onPress={() => handleItemPress(item)}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        {item.completed && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>✓</Text>
          </View>
        )}
      </View>
      <Text style={styles.itemDescription}>{item.description}</Text>
      <View style={styles.itemMeta}>
        {item.duration && (
          <Text style={styles.metaText}>{item.duration} min</Text>
        )}
        {item.level && (
          <Text style={styles.metaText}>{item.level}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading roadmap...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadRoadmapData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Learning Roadmap</Text>
        <Text style={styles.subtitle}>Choose your next lesson</Text>
      </View>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  listContainer: {
    padding: 20,
  },
  itemContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lessonItem: {
    marginLeft: 20,
    marginTop: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  completedBadge: {
    backgroundColor: '#4CAF50',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  itemMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#888',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
});

export default RoadmapScreen;