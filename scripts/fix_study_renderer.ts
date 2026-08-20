import fs from 'fs';
import path from 'path';

const rendererPath = path.resolve('src/components/lesson/UnifiedAyahStudyRenderer.tsx');
let content = fs.readFileSync(rendererPath, 'utf8');

const targetProps = `<AyahAudioPlayer block={audioBlock} />`;
const replacementProps = `
              {(() => {
                const tracks = audioBlock.ayahRefs.flatMap((ref: any) => {
                  const track = repo.getRecitationTrackByAyah(ref, audioBlock.reciterId);
                  return track ? [track] : [];
                });
                const reciter = tracks.length > 0 ? repo.getReciterById(tracks[0].reciterId) : null;
                const contentPackage = repo.getPackageForBlock(step.id);
                if (!reciter || !contentPackage || tracks.length !== audioBlock.ayahRefs.length) return null;
                return <AyahAudioPlayer tracks={tracks} reciter={reciter} contentPackage={contentPackage} />;
              })()}
`;

content = content.replace(targetProps, replacementProps);
fs.writeFileSync(rendererPath, content);
console.log('Fixed renderer');
