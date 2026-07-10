// Content Repository — loads and serves content packages

import {
  AyahRecord,
  AyahRef,
  ContentRepository,
  ContentPackage,
  ContentSource,
  LearningPath,
  Lesson,
  Level,
  RoadmapSort,
  SurahRecord,
} from '../../types/content';
import surahAlFilPackage from '../../content/packages/surah-al-fil/v1';
import { validatePackage } from './packageValidator';

class ContentRepositoryImpl implements ContentRepository {
  private _packages: ContentPackage[] = [];
  private _lessons: Lesson[] = [];
  private _sources: ContentPackage['sources'] = [];
  private _surahs: SurahRecord[] = [];
  private _ayat: AyahRecord[] = [];
  private _learningPaths: LearningPath[] = [];
  private _levels: Level[] = [];
  private _initialized = false;

  constructor() {
    this._init();
  }

  private _init(): void {
    // Register all content packages here
    this._registerPackage(surahAlFilPackage);
    this._initialized = true;
  }

  private _registerPackage(pkg: ContentPackage): void {
    const validation = validatePackage(pkg);
    if (!validation.valid) {
      throw new Error(`Invalid content package "${pkg.id}": ${validation.errors.join('; ')}`);
    }
    validation.warnings.forEach((warning) => {
      console.warn(`[content:${pkg.id}] ${warning}`);
    });

    if (this._packages.some(p => p.id === pkg.id)) return;
    this._packages.push(pkg);
    pkg.lessons?.forEach(lesson => {
      if (!this._lessons.some(l => l.id === lesson.id)) {
        this._lessons.push(lesson);
      }
    });
    pkg.sources.forEach(source => {
      if (!this._sources.some(s => s.id === source.id)) {
        this._sources.push(source);
      }
    });
    pkg.surahs?.forEach(surah => {
      if (!this._surahs.some(s => s.id === surah.id)) {
        this._surahs.push(surah);
      }
    });
    pkg.ayat?.forEach(ayah => {
      if (!this._ayat.some(a => a.id === ayah.id)) {
        this._ayat.push(ayah);
      }
    });
    pkg.learningPaths?.forEach(path => {
      if (!this._learningPaths.some(p => p.id === path.id)) {
        this._learningPaths.push(path);
      }
    });
    pkg.levels?.forEach(level => {
      if (!this._levels.some(l => l.id === level.id)) {
        this._levels.push(level);
      }
    });
  }

  // ContentRepository interface
  get packages(): ContentPackage[] { return this._packages; }
  get lessons(): Lesson[] { return this._lessons; }
  get sources(): ContentPackage['sources'] { return this._sources; }
  get surahs(): SurahRecord[] { return this._surahs; }
  get ayat(): AyahRecord[] { return this._ayat; }
  get learningPaths(): LearningPath[] { return this._learningPaths; }
  get levels(): Level[] { return this._levels; }

  // Queries
  getPackageById(id: string): ContentPackage | undefined {
    return this._packages.find(p => p.id === id);
  }

  getLessonById(id: string): Lesson | undefined {
    return this._lessons.find(l => l.id === id);
  }

  getSourceById(id: string): ContentSource | undefined {
    return this._sources.find(source => source.id === id);
  }

  getSurahById(id: string): SurahRecord | undefined {
    return this._surahs.find(surah => surah.id === id);
  }

  getLevelById(id: string): Level | undefined {
    return this._levels.find(level => level.id === id);
  }

  getLearningPathById(id: string): LearningPath | undefined {
    return this._learningPaths.find(path => path.id === id);
  }

  getAyahByRef(ref: AyahRef): AyahRecord | undefined {
    return this._ayat.find(
      ayah => ayah.ref.surahNumber === ref.surahNumber && ayah.ref.ayahNumber === ref.ayahNumber
    );
  }

  getAyatByRefs(refs: AyahRef[]): AyahRecord[] {
    return refs
      .map(ref => this.getAyahByRef(ref))
      .filter((ayah): ayah is AyahRecord => Boolean(ayah));
  }

  getNextLevel(levelId: string): Level | undefined {
    const level = this.getLevelById(levelId);
    if (!level) return undefined;

    const path = this._learningPaths.find(learningPath => learningPath.id === level.pathId);
    if (!path) return undefined;

    const currentIndex = path.levelIds.indexOf(levelId);
    if (currentIndex === -1 || currentIndex >= path.levelIds.length - 1) return undefined;

    return this.getLevelById(path.levelIds[currentIndex + 1]);
  }

  getCurrentLearningPath(): LearningPath | undefined {
    return this._learningPaths[0];
  }

  getLevelsForLearningPath(pathId: string, sort: RoadmapSort = 'path'): Level[] {
    const path = this._learningPaths.find(learningPath => learningPath.id === pathId);
    if (!path) return [];

    const levels = path.levelIds
      .map(levelId => this.getLevelById(levelId))
      .filter((level): level is Level => Boolean(level));

    if (sort === 'difficulty') {
      const difficultyRank: Record<Level['difficulty'], number> = { easy: 1, medium: 2, hard: 3 };
      return [...levels].sort((a, b) => difficultyRank[a.difficulty] - difficultyRank[b.difficulty]);
    }

    if (sort === 'mushaf') {
      return [...levels].sort((a, b) => {
        const aRef = a.ayahRefs[0];
        const bRef = b.ayahRefs[0];
        return aRef.surahNumber - bRef.surahNumber || aRef.ayahNumber - bRef.ayahNumber;
      });
    }

    if (sort === 'revelation') {
      return [...levels].sort((a, b) => {
        const aSurah = this.getSurahById(a.surahId);
        const bSurah = this.getSurahById(b.surahId);
        return (aSurah?.revelationOrder ?? Number.MAX_SAFE_INTEGER) -
          (bSurah?.revelationOrder ?? Number.MAX_SAFE_INTEGER);
      });
    }

    return levels;
  }

  getSurahs(sort: RoadmapSort = 'mushaf'): SurahRecord[] {
    if (sort === 'revelation') {
      return [...this._surahs].sort(
        (a, b) => (a.revelationOrder ?? Number.MAX_SAFE_INTEGER) - (b.revelationOrder ?? Number.MAX_SAFE_INTEGER)
      );
    }

    return [...this._surahs].sort((a, b) => a.surahNumber - b.surahNumber);
  }

  getLessonsByPackageId(packageId: string): Lesson[] {
    return this._lessons.filter(l => l.packageId === packageId);
  }

  getNextLesson(currentLessonId: string): Lesson | undefined {
    const lesson = this.getLessonById(currentLessonId);
    if (!lesson) return undefined;
    const packageLessons = this.getLessonsByPackageId(lesson.packageId);
    const idx = packageLessons.findIndex(l => l.id === currentLessonId);
    if (idx === -1 || idx >= packageLessons.length - 1) return undefined;
    return packageLessons[idx + 1];
  }

  getPreviousLesson(currentLessonId: string): Lesson | undefined {
    const lesson = this.getLessonById(currentLessonId);
    if (!lesson) return undefined;
    const packageLessons = this.getLessonsByPackageId(lesson.packageId);
    const idx = packageLessons.findIndex(l => l.id === currentLessonId);
    if (idx <= 0) return undefined;
    return packageLessons[idx - 1];
  }

  getAllPackages(): ContentPackage[] { return [...this._packages]; }
  getAllLessons(): Lesson[] { return [...this._lessons]; }
}

// Singleton
let _instance: ContentRepositoryImpl | null = null;

export function getContentRepository(): ContentRepositoryImpl {
  if (!_instance) {
    _instance = new ContentRepositoryImpl();
  }
  return _instance;
}

export default ContentRepositoryImpl;
