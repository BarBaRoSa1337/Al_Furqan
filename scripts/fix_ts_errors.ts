import fs from 'fs';
import path from 'path';

const rendererPath = path.resolve('src/components/lesson/LevelBlockRenderer.tsx');
let content = fs.readFileSync(rendererPath, 'utf8');

// 1. Ensure Ionicons import is at the top
if (!content.includes("import { Ionicons } from '@expo/vector-icons';")) {
  content = "import { Ionicons } from '@expo/vector-icons';\n" + content;
}

// 2. Fix styles
const stylesToInject = `  draftBadgeContainer: { position: 'relative' },
  draftBadge: { position: 'absolute', top: -10, right: 10, backgroundColor: colors.warning, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.sm, zIndex: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  draftBadgeText: { color: colors.surface, fontFamily: fonts.bold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoButton: { position: 'absolute', top: 16, right: 16, zIndex: 5, padding: 4, opacity: 0.5 },
  collapsibleSources: { marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.surfaceMuted, borderRadius: radii.sm },`;

if (!content.includes('draftBadgeContainer:')) {
  content = content.replace(
    `const styles = StyleSheet.create({`,
    `const styles = StyleSheet.create({\n${stylesToInject}`
  );
}

// 3. Fix hasDraftStatus type checking
const oldDraftStatus = `function hasDraftStatus(block: LevelBlock): boolean {
  if (block.type === 'context' || block.type === 'summary' || block.type === 'activity' || block.type === 'question') {
    return block.reviewerStatus !== 'approved';
  }
  if (block.type === 'tafsir_ref' || block.type === 'word_meaning' || block.type === 'word_explorer' || block.type === 'ayah_ref') {
    return true; // We can assume draft in preview mode for these generated blocks
  }
  return false;
}`;

const newDraftStatus = `function hasDraftStatus(block: LevelBlock): boolean {
  if (block.type === 'context' || block.type === 'summary' || block.type === 'question') {
    return (block as any).reviewerStatus !== 'approved';
  }
  if (block.type === 'activity') {
    return block.activity.reviewerStatus !== 'approved';
  }
  if (block.type === 'tafsir_ref' || block.type === 'word_meaning' || block.type === 'word_explorer' || block.type === 'ayah_ref') {
    return true; // We can assume draft in preview mode for these generated blocks
  }
  return false;
}`;

content = content.replace(oldDraftStatus, newDraftStatus);

fs.writeFileSync(rendererPath, content);
console.log('✅ Fixed TypeScript errors in LevelBlockRenderer.tsx');
