import fs from 'fs';
import path from 'path';

// 1. Update importer.ts (Merged Ayah Study Step & Unblock Word Meanings)
const importerPath = path.resolve('packages/content-preview/src/importer.ts');
let importerContent = fs.readFileSync(importerPath, 'utf8');

const targetSteps = `            steps: [
              { id: \`\${id}-read\`, kind: 'read', title: 'Listen and read', blocks: [{ id: passageId, type: 'ayah_ref', ayahRef: ayah.ref, translationLocale: locale }, { id: \`\${id}-audio\`, type: 'audio', ayahRefs: [ayah.ref], reciterId: MP3QURAN_RECITER_ID }] },
              { id: \`\${id}-translation\`, kind: 'translation', title: 'Translation', blocks: [{ id: \`\${id}-translation-block\`, type: 'translation', ayahRefs: [ayah.ref], locale, translationEntryIds: [requireTranslation(ayah, locale).id] }] },
              ayah.wordMeanings && ayah.wordMeanings.length === tokenIds.length
                ? { id: \`\${id}-word-meaning\`, kind: 'word_meaning', title: 'Word meanings', blocks: [{ id: \`\${id}-word-explorer\`, type: 'word_explorer', ayahRefs: [ayah.ref] }] }
                : { id: \`\${id}-word-meaning\`, kind: 'word_meaning', title: 'Word meanings', required: false, blocks: [{ id: \`\${id}-word-meaning-locked\`, type: 'source_locked', capability: 'word_meaning', sourceId: WORD_MEANING_SOURCE_ID, reason: 'credentials_required', alternativeStepId: understandingStepId, locale }] },
              ayah.tafsirEntries && ayah.tafsirEntries.length > 0
                ? { id: \`\${id}-tafsir\`, kind: 'tafsir', title: 'Tafsir', blocks: [{ id: \`\${id}-tafsir-block\`, type: 'tafsir_ref', ayahRef: ayah.ref, tafsirEntryId: ayah.tafsirEntries[0].id }] }
                : { id: \`\${id}-tafsir\`, kind: 'tafsir', title: 'Tafsir', required: false, blocks: [{ id: \`\${id}-tafsir-locked\`, type: 'source_locked', capability: 'tafsir', sourceId: TAFSIR_SOURCE_ID, reason: 'credentials_required', alternativeStepId: understandingStepId, locale }] },`;

const replacementSteps = `            steps: [
              {
                id: \`\${id}-study\`,
                kind: 'read',
                title: 'Study the Ayah',
                blocks: [
                  { id: passageId, type: 'ayah_ref', ayahRef: ayah.ref, translationLocale: locale },
                  { id: \`\${id}-audio\`, type: 'audio', ayahRefs: [ayah.ref], reciterId: MP3QURAN_RECITER_ID },
                  ...(ayah.wordMeanings && ayah.wordMeanings.length > 0 ? [{ id: \`\${id}-word-explorer\`, type: 'word_explorer', ayahRefs: [ayah.ref] } as const] : []),
                  ...(ayah.tafsirEntries && ayah.tafsirEntries.length > 0 ? [{ id: \`\${id}-tafsir-block\`, type: 'tafsir_ref', ayahRef: ayah.ref, tafsirEntryId: ayah.tafsirEntries[0].id } as const] : []),
                ]
              },`;

importerContent = importerContent.replace(targetSteps, replacementSteps);
fs.writeFileSync(importerPath, importerContent);
console.log('✅ Updated importer.ts');

// 2. Update DailyLearningLoop.tsx (Remove feedback banner)
const loopPath = path.resolve('src/components/lesson/DailyLearningLoop.tsx');
let loopContent = fs.readFileSync(loopPath, 'utf8');

const feedbackTarget = `{feedback ? <View accessibilityLiveRegion="polite" style={[styles.feedback, feedback.correct ? styles.feedbackCorrect : styles.feedbackIncorrect]}>
          <Ionicons name={feedback.correct ? 'checkmark-circle' : 'refresh-circle'} size={22} color={feedback.correct ? colors.success : colors.danger} />
          <Text style={[styles.feedbackText, { color: feedback.correct ? colors.success : colors.danger }]}>
            {feedback.correct ? correctFeedbackLabel : retryFeedbackLabel}
          </Text>
        </View> : null}`;
loopContent = loopContent.replace(feedbackTarget, `{/* Feedback banner removed; activities now provide instant inline feedback */}`);
fs.writeFileSync(loopPath, loopContent);
console.log('✅ Updated DailyLearningLoop.tsx');

// 3. Update useLevelSession.ts (Faster auto-advance)
const sessionPath = path.resolve('src/hooks/useLevelSession.ts');
let sessionContent = fs.readFileSync(sessionPath, 'utf8');
sessionContent = sessionContent.replace(`correct ? 700 : 400`, `correct ? 500 : 400`);
fs.writeFileSync(sessionPath, sessionContent);
console.log('✅ Updated useLevelSession.ts');

// 4. Update complete/[id].tsx (Tiered celebrations)
const completePath = path.resolve('src/app/complete/[id].tsx');
let completeContent = fs.readFileSync(completePath, 'utf8');
completeContent = completeContent.replace(
  `{receipt && !receipt.alreadyCompleted && !reduceMotion ? (`,
  `{receipt && !receipt.alreadyCompleted && !reduceMotion && level.metadata?.isFinalReview ? (`
);
fs.writeFileSync(completePath, completeContent);
console.log('✅ Updated complete/[id].tsx');

// 5. Update AyahAudioPlayer.tsx (Autoplay fallback)
const audioPlayerPath = path.resolve('src/components/lesson/AyahAudioPlayer.tsx');
let audioContent = fs.readFileSync(audioPlayerPath, 'utf8');
if (!audioContent.includes('autoplayBlocked')) {
    audioContent = audioContent.replace(
        `const [message, setMessage] = useState<string>();`,
        `const [message, setMessage] = useState<string>();\n  const [autoplayBlocked, setAutoplayBlocked] = useState(false);`
    );
    audioContent = audioContent.replace(
        `        try {
          player.play();
        } catch {
          // Handled gracefully if browser policy requires user tap
        }`,
        `        try {
          player.play();
          setAutoplayBlocked(false);
        } catch {
          setAutoplayBlocked(true);
        }`
    );
    // Also clear blocked state when manually playing
    audioContent = audioContent.replace(
        `player.play();\n  };`,
        `player.play();\n    setAutoplayBlocked(false);\n  };`
    );
    // Add "Tap play to start audio" message
    audioContent = audioContent.replace(
        `      </Card>\n      {message ? <Text accessibilityLiveRegion="polite" style={styles.messageText}>{message}</Text> : null}`,
        `      </Card>\n      {autoplayBlocked && !status.playing ? <Text style={styles.messageText}>Tap play to start audio</Text> : null}\n      {message ? <Text accessibilityLiveRegion="polite" style={styles.messageText}>{message}</Text> : null}`
    );
    fs.writeFileSync(audioPlayerPath, audioContent);
    console.log('✅ Updated AyahAudioPlayer.tsx');
}
