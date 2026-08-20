import fs from 'fs';
import path from 'path';

const rendererPath = path.resolve('src/components/lesson/LevelBlockRenderer.tsx');
let content = fs.readFileSync(rendererPath, 'utf8');

// 1. Add Draft Badge component to the end of the file
if (!content.includes('function DraftBadge')) {
    content += `\n
function DraftBadge({ children, show }: { children: React.ReactNode; show: boolean }) {
  if (!show) return <>{children}</>;
  return (
    <View style={styles.draftBadgeContainer}>
      <View style={styles.draftBadge}>
        <Text style={styles.draftBadgeText}>DRAFT — Not for production</Text>
      </View>
      {children}
    </View>
  );
}
`;
}

// 2. Add styles for Draft Badge and Info Icon
if (!content.includes('draftBadgeContainer')) {
    content = content.replace(
        `export default function LevelBlockRenderer`,
        `import { Ionicons } from '@expo/vector-icons';\n\nexport default function LevelBlockRenderer`
    );
    content = content.replace(
        `const styles = StyleSheet.create({`,
        `const styles = StyleSheet.create({\n  draftBadgeContainer: { position: 'relative' },\n  draftBadge: { position: 'absolute', top: -10, right: 10, backgroundColor: colors.warning, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.sm, zIndex: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },\n  draftBadgeText: { color: colors.surface, fontFamily: fonts.bold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },\n  infoButton: { position: 'absolute', top: 16, right: 16, zIndex: 5, padding: 4, opacity: 0.5 },\n  collapsibleSources: { marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.surfaceMuted, borderRadius: radii.sm },`
    );
}

// 3. Update main switch to wrap governed blocks in DraftBadge
const hasDraftStatus = `function hasDraftStatus(block: LevelBlock): boolean {
  if (block.type === 'context' || block.type === 'summary' || block.type === 'activity' || block.type === 'question') {
    return block.reviewerStatus !== 'approved';
  }
  if (block.type === 'tafsir_ref' || block.type === 'word_meaning' || block.type === 'word_explorer' || block.type === 'ayah_ref') {
    return true; // We can assume draft in preview mode for these generated blocks
  }
  return false;
}`;

if (!content.includes('function hasDraftStatus')) {
    content += `\n${hasDraftStatus}\n`;
}

content = content.replace(
    `export default function LevelBlockRenderer({ block, onQuestionAnswer, onActivityAnswer }: LevelBlockRendererProps) {
  const repo = getContentRepository();
  const preferences = getCurrentLearnerPreferences();
  const contentPackage = repo.getPackageForBlock(block.id);
  if (!isPreviewContentMode() && contentPackage && !isBlockEligibleForProduction(block, contentPackage)) return null;

  switch (block.type) {`,
    `export default function LevelBlockRenderer({ block, onQuestionAnswer, onActivityAnswer }: LevelBlockRendererProps) {
  const repo = getContentRepository();
  const preferences = getCurrentLearnerPreferences();
  const contentPackage = repo.getPackageForBlock(block.id);
  if (!isPreviewContentMode() && contentPackage && !isBlockEligibleForProduction(block, contentPackage)) return null;

  const showDraftBadge = isPreviewContentMode() && hasDraftStatus(block);

  const renderInner = () => {
  switch (block.type) {`
);

// We need to close the renderInner block and wrap the return
content = content.replace(
    `      return <Card><Text style={styles.unsupported}>{packageText(repo, 'content.unsupported')}</Text></Card>;
  }
}`,
    `      return <Card><Text style={styles.unsupported}>{packageText(repo, 'content.unsupported')}</Text></Card>;
  }
  };
  return <DraftBadge show={showDraftBadge}>{renderInner()}</DraftBadge>;
}`
);


// 4. Update CanonicalAyahBlock
const oldAyahBlock = `      <View style={styles.sourceGroup}>
        <Text style={styles.sourceLabel}>{packageText(repo, 'content.arabicSource')}</Text>
        <SourceAttribution source={arabicSource} unavailable={packageText(repo, 'content.sourceUnavailable')} />
        <Text style={styles.sourceLabel}>{packageText(repo, 'content.translationSource')}</Text>
        <SourceAttribution source={translationSource} unavailable={packageText(repo, 'content.sourceUnavailable')} />
      </View>`;

const newAyahBlock = `      <Pressable accessibilityRole="button" accessibilityLabel="Show Sources" style={styles.infoButton} onPress={() => setSourcesExpanded(s => !s)}>
        <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
      </Pressable>
      {sourcesExpanded ? (
        <View style={styles.collapsibleSources}>
          <Text style={styles.sourceLabel}>{packageText(repo, 'content.arabicSource')}: {arabicSource?.name ?? packageText(repo, 'content.sourceUnavailable')}</Text>
          <Text style={styles.sourceLabel}>{packageText(repo, 'content.translationSource')}: {translationSource?.name ?? packageText(repo, 'content.sourceUnavailable')}</Text>
        </View>
      ) : null}`;

if (!content.includes('sourcesExpanded')) {
    content = content.replace(
        `function CanonicalAyahBlock({ ayah, locale, repo, showTransliteration }: { ayah: AyahRecord; locale: string; repo: ContentRepository; showTransliteration: boolean }) {`,
        `function CanonicalAyahBlock({ ayah, locale, repo, showTransliteration }: { ayah: AyahRecord; locale: string; repo: ContentRepository; showTransliteration: boolean }) {\n  const [sourcesExpanded, setSourcesExpanded] = useState(false);`
    );
    content = content.replace(oldAyahBlock, newAyahBlock);
}

fs.writeFileSync(rendererPath, content);
console.log('✅ Updated LevelBlockRenderer.tsx');
