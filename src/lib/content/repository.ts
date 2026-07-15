// Content Repository — loads and serves content packages

import {
  AyahRecord,
  AyahRef,
  ContentRepository,
  ContentPackage,
  ContentSource,
  QuranEdition,
  QuranEditionId,
  QuranDivision,
  QuranDivisionKind,
  LearningPath,
  Level,
  RoadmapSort,
  SurahRecord,
  WordToken,
} from '../../types/content';
import surahAlFilPackage from '../../content/packages/surah-al-fil/v1';
import { validatePackage } from './packageValidator';

class ContentRepositoryImpl implements ContentRepository {
  private _packages: ContentPackage[] = [];
  private _sources: ContentPackage['sources'] = [];
  private _editions: QuranEdition[] = [];
  private _surahs: SurahRecord[] = [];
  private _ayat: AyahRecord[] = [];
  private _wordTokens: WordToken[] = [];
  private _divisions: QuranDivision[] = [];
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
    const validation = validatePackage(pkg, { mode: __DEV__ ? 'development' : 'production' });
    if (!validation.valid) {
      throw new Error(`Invalid content package "${pkg.id}": ${validation.errors.join('; ')}`);
    }
    validation.warnings.forEach((warning) => {
      console.warn(`[content:${pkg.id}] ${warning}`);
    });

    if (this._packages.some(p => p.id === pkg.id)) return;
    this._packages.push(pkg);
    pkg.sources.forEach(source => {
      if (!this._sources.some(s => s.id === source.id)) {
        this._sources.push(source);
      }
    });
    pkg.editions.forEach(edition => {
      if (!this._editions.some(candidate => candidate.id === edition.id)) this._editions.push(edition);
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
    pkg.wordTokens.forEach(token => {
      if (!this._wordTokens.some(candidate => candidate.id === token.id)) this._wordTokens.push(token);
    });
    pkg.divisions.forEach(division => {
      if (!this._divisions.some(candidate => candidate.id === division.id)) this._divisions.push(division);
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
  get sources(): ContentPackage['sources'] { return this._sources; }
  get editions(): QuranEdition[] { return this._editions; }
  get surahs(): SurahRecord[] { return this._surahs; }
  get ayat(): AyahRecord[] { return this._ayat; }
  get wordTokens(): WordToken[] { return this._wordTokens; }
  get divisions(): QuranDivision[] { return this._divisions; }
  get learningPaths(): LearningPath[] { return this._learningPaths; }
  get levels(): Level[] { return this._levels; }

  // Queries
  getPackageById(id: string): ContentPackage | undefined {
    return this._packages.find(p => p.id === id);
  }

  getSourceById(id: string): ContentSource | undefined {
    return this._sources.find(source => source.id === id);
  }

  getEdition(id: QuranEditionId): QuranEdition | undefined {
    return this._editions.find(edition => edition.id === id);
  }

  getSurahById(id: string): SurahRecord | undefined {
    return this._surahs.find(surah => surah.id === id);
  }

  getSurahByNumber(number: number): SurahRecord | undefined {
    return this._surahs.find(surah => surah.surahNumber === number);
  }

  getLevelById(id: string): Level | undefined {
    return this._levels.find(level => level.id === id);
  }

  getLearningPathById(id: string): LearningPath | undefined {
    return this._learningPaths.find(path => path.id === id);
  }

  getAyahByRef(ref: AyahRef, editionId: QuranEditionId = 'hafs-an-asim'): AyahRecord | undefined {
    return this._ayat.find(
      ayah => ayah.editionId === editionId && ayah.ref.surahNumber === ref.surahNumber && ayah.ref.ayahNumber === ref.ayahNumber
    );
  }

  getAyatByRefs(refs: AyahRef[], editionId: QuranEditionId = 'hafs-an-asim'): AyahRecord[] {
    return refs
      .map(ref => this.getAyahByRef(ref, editionId))
      .filter((ayah): ayah is AyahRecord => Boolean(ayah));
  }

  getWordToken(id: string): WordToken | undefined {
    return this._wordTokens.find(token => token.id === id);
  }

  listDivisions(kind: QuranDivisionKind, editionId: QuranEditionId = 'hafs-an-asim'): QuranDivision[] {
    return this._divisions.filter(division => division.kind === kind && division.editionId === editionId)
      .sort((a, b) => a.number - b.number);
  }

  getDivision(kind: QuranDivisionKind, number: number, editionId: QuranEditionId = 'hafs-an-asim'): QuranDivision | undefined {
    return this.listDivisions(kind, editionId).find(division => division.number === number);
  }

  listAyahRefsInDivision(kind: QuranDivisionKind, number: number, editionId: QuranEditionId = 'hafs-an-asim'): AyahRef[] {
    const division = this.getDivision(kind, number, editionId);
    if (!division) return [];
    return this._ayat.filter(ayah => ayah.editionId === editionId && isRefInRange(ayah.ref, division.range))
      .map(ayah => ayah.ref);
  }

  listSurahsInDivision(kind: QuranDivisionKind, number: number, editionId: QuranEditionId = 'hafs-an-asim'): SurahRecord[] {
    const numbers = new Set(this.listAyahRefsInDivision(kind, number, editionId).map(ref => ref.surahNumber));
    return this._surahs.filter(surah => numbers.has(surah.surahNumber));
  }

  getDivisionsForAyah(ref: AyahRef, editionId: QuranEditionId = 'hafs-an-asim'): QuranDivision[] {
    return this._divisions.filter(division => division.editionId === editionId && isRefInRange(ref, division.range));
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

  getAllPackages(): ContentPackage[] { return [...this._packages]; }
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

function isRefInRange(ref: AyahRef, range: { start: AyahRef; end: AyahRef }): boolean {
  return compareRefs(ref, range.start) >= 0 && compareRefs(ref, range.end) <= 0;
}

function compareRefs(a: AyahRef, b: AyahRef): number {
  return a.surahNumber - b.surahNumber || a.ayahNumber - b.ayahNumber;
}
