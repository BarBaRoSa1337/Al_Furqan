// Content Repository — loads and serves content packages

import {
  AyahRecord,
  AyahRef,
  AyahStructureIndex,
  ContentScope,
  ContentRepository,
  ContentPackage,
  ContentSource,
  DiscoveryFilters,
  DiscoveryQueryResult,
  DiscoverySearchResult,
  LearningPathDiscoveryResult,
  QuranEdition,
  QuranEditionId,
  QuranDivision,
  QuranDivisionQueryKind,
  QuranLookup,
  QuranRange,
  QuranReferenceResult,
  LearningPath,
  Level,
  PackageTextKey,
  RoadmapSort,
  SurahRecord,
  WordToken,
} from '../../types/content';
import { Reciter, RecitationTrack } from '../../types/media';
import surahAlFilPackage from '../../content/packages/surah-al-fil/v1';
import { validatePackage } from './packageValidator';
import { adaptLegacyPackage } from './legacyPackageAdapter';
import { normalizeSearchText, parseDiscoveryQueryValue, refKey } from './discovery';

class ContentRepositoryImpl implements ContentRepository {
  private _packages: ContentPackage[] = [];
  private _sources: ContentPackage['sources'] = [];
  private _editions: QuranEdition[] = [];
  private _surahs: SurahRecord[] = [];
  private _ayat: AyahRecord[] = [];
  private _wordTokens: WordToken[] = [];
  private _divisions: QuranDivision[] = [];
  private _reciters: Reciter[] = [];
  private _recitationTracks: RecitationTrack[] = [];
  private _learningPaths: LearningPath[] = [];
  private _levels: Level[] = [];
  private _activePackageId: string | undefined;
  private _packageOrigins = new Map<string, 'built_in' | 'downloaded'>();
  private _initialized = false;

  constructor() {
    this._init();
  }

  private _init(): void {
    // Register all content packages here
    this._registerPackage(surahAlFilPackage, 'built_in');
    this._initialized = true;
  }

  private _registerPackage(pkg: ContentPackage, origin: 'built_in' | 'downloaded'): void {
    const adaptedPackage = adaptLegacyPackage(pkg);
    const validation = validatePackage(adaptedPackage, { mode: __DEV__ ? 'development' : 'production' });
    if (!validation.valid) {
      throw new Error(`Invalid content package "${adaptedPackage.id}": ${validation.errors.join('; ')}`);
    }
    validation.warnings.forEach((warning) => {
      console.warn(`[content:${adaptedPackage.id}] ${warning}`);
    });

    if (this._packages.some(p => p.id === adaptedPackage.id)) return;
    this._packages.push(adaptedPackage);
    this._packageOrigins.set(adaptedPackage.id, origin);
    if (!this._activePackageId) this._activePackageId = adaptedPackage.id;
    this._appendPackageIndexes(adaptedPackage);
  }

  registerPackage(pkg: ContentPackage, activate = true, origin: 'built_in' | 'downloaded' = 'downloaded'): void {
    const adaptedPackage = adaptLegacyPackage(pkg);
    const validation = validatePackage(adaptedPackage, { mode: __DEV__ ? 'development' : 'production' });
    if (!validation.valid) throw new Error(`Invalid content package "${adaptedPackage.id}": ${validation.errors.join('; ')}`);
    this._assertNoIdentityConflicts(adaptedPackage);
    const existingIndex = this._packages.findIndex(candidate => candidate.id === adaptedPackage.id);
    if (existingIndex >= 0) this._packages.splice(existingIndex, 1, adaptedPackage);
    else this._packages.push(adaptedPackage);
    this._packageOrigins.set(adaptedPackage.id, origin);
    if (activate || !this._activePackageId) this._activePackageId = adaptedPackage.id;
    this._rebuildIndexes();
  }

  private _assertNoIdentityConflicts(pkg: ContentPackage): void {
    const otherPackages = this._packages.filter(candidate => candidate.id !== pkg.id);
    const levelIds = new Set(otherPackages.flatMap(candidate => candidate.levels.map(level => level.id)));
    const blockIds = new Set(otherPackages.flatMap(candidate => candidate.levels.flatMap(level => level.steps.flatMap(step => step.blocks.map(block => block.id)))));
    const activityIds = new Set(otherPackages.flatMap(candidate => candidate.levels.flatMap(level => level.steps.flatMap(step => step.blocks
      .filter(block => block.type === 'activity')
      .map(block => block.activity.id)))));
    const conflictingLevel = pkg.levels.find(level => levelIds.has(level.id));
    if (conflictingLevel) throw new Error(`Level ID "${conflictingLevel.id}" is already owned by another package`);
    const conflictingBlock = pkg.levels.flatMap(level => level.steps.flatMap(step => step.blocks)).find(block => blockIds.has(block.id));
    if (conflictingBlock) throw new Error(`Block ID "${conflictingBlock.id}" is already owned by another package`);
    const conflictingActivity = pkg.levels.flatMap(level => level.steps.flatMap(step => step.blocks
      .filter(block => block.type === 'activity')
      .map(block => block.activity.id)))
      .find(id => activityIds.has(id));
    if (conflictingActivity) throw new Error(`Activity ID "${conflictingActivity}" is already owned by another package`);
    assertSharedRecordsMatch('Ayah', pkg.ayat, otherPackages.flatMap(candidate => candidate.ayat));
    assertSharedRecordsMatch('Word token', pkg.wordTokens, otherPackages.flatMap(candidate => candidate.wordTokens));
    assertSharedRecordsMatch('Division', pkg.divisions, otherPackages.flatMap(candidate => candidate.divisions));
  }

  removePackage(id: string): void {
    this._packages = this._packages.filter(pkg => pkg.id !== id);
    this._packageOrigins.delete(id);
    if (this._activePackageId === id) this._activePackageId = this._packages[0]?.id;
    this._rebuildIndexes();
  }

  private _appendPackageIndexes(pkg: ContentPackage): void {
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
    pkg.reciters.forEach(reciter => {
      if (!this._reciters.some(candidate => candidate.id === reciter.id)) this._reciters.push(reciter);
    });
    pkg.recitationTracks.forEach(track => {
      if (!this._recitationTracks.some(candidate => candidate.id === track.id)) this._recitationTracks.push(track);
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
  get reciters(): Reciter[] { return this._reciters; }
  get recitationTracks(): RecitationTrack[] { return this._recitationTracks; }
  get learningPaths(): LearningPath[] { return this._learningPaths; }
  get levels(): Level[] { return this._levels; }

  getActivePackage(): ContentPackage | undefined {
    return this._packages.find(pkg => pkg.id === this._activePackageId);
  }

  getText(key: PackageTextKey, locale?: string): string {
    const pkg = this.getActivePackage();
    const selectedLocale = locale ?? pkg?.localization.defaultLocale;
    const catalog = pkg?.localization.catalogs.find(item => item.locale === selectedLocale)
      ?? pkg?.localization.catalogs.find(item => item.locale === pkg.localization.defaultLocale);
    return catalog?.entries[key] ?? key;
  }

  private _rebuildIndexes(): void {
    this._sources = [];
    this._editions = [];
    this._surahs = [];
    this._ayat = [];
    this._wordTokens = [];
    this._divisions = [];
    this._reciters = [];
    this._recitationTracks = [];
    this._learningPaths = [];
    this._levels = [];
    this._packages.forEach(pkg => this._appendPackageIndexes(pkg));
  }

  // Queries
  getPackageById(id: string): ContentPackage | undefined {
    return this._packages.find(p => p.id === id);
  }

  getPackageForLevel(levelId: string): ContentPackage | undefined {
    return this._packages.find(pkg => pkg.levels.some(level => level.id === levelId));
  }

  getPackageForBlock(blockId: string): ContentPackage | undefined {
    return this._packages.find(pkg => pkg.levels.some(level => level.steps.some(step => step.blocks.some(block => block.id === blockId))));
  }

  getSourceById(id: string, scope?: ContentScope): ContentSource | undefined {
    return scope
      ? this._packagesForScope(scope).flatMap(pkg => pkg.sources).find(source => source.id === id)
      : this._sources.find(source => source.id === id);
  }

  getEdition(id: QuranEditionId): QuranEdition | undefined {
    return this._editions.find(edition => edition.id === id);
  }

  getSurahById(id: string): SurahRecord | undefined {
    return this._surahs.find(surah => surah.id === id);
  }

  getSurahByNumber(number: number, scope?: ContentScope): SurahRecord | undefined {
    return this._surahsForScope(scope).find(surah => surah.surahNumber === number);
  }

  getLevelById(id: string): Level | undefined {
    return this._levels.find(level => level.id === id);
  }

  getActivityById(id: string) {
    const block = this._levels.flatMap(level => level.steps).flatMap(step => step.blocks)
      .find((candidate): candidate is Extract<Level['steps'][number]['blocks'][number], { type: 'activity' }> => candidate.type === 'activity' && candidate.activity.id === id);
    return block?.activity;
  }

  getActivityForLevel(levelId: string, activityId: string) {
    const level = this.getLevelById(levelId);
    const block = level?.steps.flatMap(step => step.blocks)
      .find((candidate): candidate is Extract<Level['steps'][number]['blocks'][number], { type: 'activity' }> => candidate.type === 'activity' && candidate.activity.id === activityId);
    return block?.activity;
  }

  getLevelForActivity(id: string): Level | undefined {
    return this._levels.find(level => level.steps.some(step => step.blocks.some(block => block.type === 'activity' && block.activity.id === id)));
  }

  getLearningPathById(id: string): LearningPath | undefined {
    return this._learningPaths.find(path => path.id === id);
  }

  getAyahByRef(ref: AyahRef, editionId: QuranEditionId = 'hafs-an-asim', scope?: ContentScope): AyahRecord | undefined {
    return this._ayatForScope(scope).find(
      ayah => ayah.editionId === editionId && ayah.ref.surahNumber === ref.surahNumber && ayah.ref.ayahNumber === ref.ayahNumber
    );
  }

  getAyatByRefs(refs: AyahRef[], editionId: QuranEditionId = 'hafs-an-asim', scope?: ContentScope): AyahRecord[] {
    return refs
      .map(ref => this.getAyahByRef(ref, editionId, scope))
      .filter((ayah): ayah is AyahRecord => Boolean(ayah));
  }

  getWordToken(id: string, scope?: ContentScope): WordToken | undefined {
    return scope
      ? this._packagesForScope(scope).flatMap(pkg => pkg.wordTokens).find(token => token.id === id)
      : this._wordTokens.find(token => token.id === id);
  }

  getReciterById(id: string): Reciter | undefined {
    return this._reciters.find(reciter => reciter.id === id);
  }

  getRecitationTrackByAyah(ref: AyahRef, reciterId?: string, editionId: QuranEditionId = 'hafs-an-asim'): RecitationTrack | undefined {
    return this._recitationTracks.find(track => track.editionId === editionId
      && (!reciterId || track.reciterId === reciterId)
      && track.ayahRef.surahNumber === ref.surahNumber
      && track.ayahRef.ayahNumber === ref.ayahNumber);
  }

  listDivisions(kind: QuranDivisionQueryKind, editionId: QuranEditionId = 'hafs-an-asim', scope?: ContentScope): QuranDivision[] {
    const canonicalKind = normalizeDivisionKind(kind);
    return this._divisionsForScope(scope).filter(division => division.kind === canonicalKind && division.editionId === editionId)
      .sort((a, b) => a.number - b.number);
  }

  getDivision(kind: QuranDivisionQueryKind, number: number, editionId: QuranEditionId = 'hafs-an-asim', scope?: ContentScope): QuranDivision | undefined {
    return this.listDivisions(kind, editionId, scope).find(division => division.number === number);
  }

  listAyahRefsInDivision(kind: QuranDivisionQueryKind, number: number, editionId: QuranEditionId = 'hafs-an-asim', scope?: ContentScope): AyahRef[] {
    const canonicalKind = normalizeDivisionKind(kind);
    return this._structureForScope(scope)
      .filter(entry => entry.editionId === editionId && structureNumber(entry, canonicalKind) === number)
      .map(entry => entry.ayahRef)
      .sort(compareRefs);
  }

  listSurahsInDivision(kind: QuranDivisionQueryKind, number: number, editionId: QuranEditionId = 'hafs-an-asim', scope?: ContentScope): SurahRecord[] {
    const numbers = new Set(this.listAyahRefsInDivision(kind, number, editionId, scope).map(ref => ref.surahNumber));
    return this._surahsForScope(scope).filter(surah => numbers.has(surah.surahNumber));
  }

  getDivisionsForAyah(ref: AyahRef, editionId: QuranEditionId = 'hafs-an-asim', scope?: ContentScope): QuranDivision[] {
    const structure = this.getAyahStructure(ref, scope);
    if (!structure || structure.editionId !== editionId) return [];
    return this._divisionsForScope(scope).filter(division => division.editionId === editionId
      && structureNumber(structure, division.kind) === division.number);
  }

  getAyahsInRange(range: QuranRange, scope?: ContentScope): AyahRecord[] {
    return this._ayatForScope(scope)
      .filter(ayah => ayah.editionId === (scope?.editionId ?? 'hafs-an-asim') && isRefInRange(ayah.ref, range))
      .sort((a, b) => compareRefs(a.ref, b.ref));
  }

  getAyahStructure(ref: AyahRef, scope?: ContentScope): AyahStructureIndex | undefined {
    const editionId = scope?.editionId ?? 'hafs-an-asim';
    return this._structureForScope(scope).find(entry => entry.editionId === editionId && sameRef(entry.ayahRef, ref));
  }

  parseDiscoveryQuery(query: string, scope?: ContentScope): DiscoveryQueryResult {
    return parseDiscoveryQueryValue(query, this._surahsForScope(scope));
  }

  searchQuranMetadata(query: string, scope?: ContentScope): QuranReferenceResult[] {
    const parsed = this.parseDiscoveryQuery(query, scope);
    if (parsed.query.kind === 'empty') return [];
    if (parsed.query.kind === 'text') {
      const text = parsed.query.normalizedText;
      const matched = this._surahsForScope(scope).filter(surah => [
        surah.transliteratedName,
        surah.englishName,
        surah.arabicName,
      ].some(name => normalizeSearchText(name).includes(text)));
      return matched.map(surah => this.referenceResult({ type: 'surah', surahNumber: surah.surahNumber }, scope));
    }
    return this.lookupAvailable(parsed.query.lookup, scope) ? [this.referenceResult(parsed.query.lookup, scope)] : [];
  }

  listLearningPaths(filters: DiscoveryFilters = {}, scope?: ContentScope): LearningPathDiscoveryResult[] {
    return this._packagesForScope(scope)
      .filter(pkg => !filters.downloadedOnly || this._packageOrigins.get(pkg.id) === 'downloaded')
      .flatMap(pkg => pkg.learningPaths.map(path => ({ packageId: pkg.id, path, levels: path.levelIds
        .map(id => pkg.levels.find(level => level.id === id))
        .filter((level): level is Level => Boolean(level)) })))
      .filter(result => matchesPathFilters(result, filters, this))
      .sort((a, b) => a.path.title.localeCompare(b.path.title) || a.packageId.localeCompare(b.packageId));
  }

  listLevels(filters: DiscoveryFilters = {}, scope?: ContentScope): Level[] {
    return this.listLearningPaths(filters, scope).flatMap(result => result.levels)
      .filter(level => (!filters.maximumMinutesPerLevel || level.durationMinutes <= filters.maximumMinutesPerLevel)
        && (!filters.learningGoals || filters.learningGoals.every(goal => level.goals.includes(goal))))
      .filter((level, index, levels) => levels.findIndex(candidate => candidate.id === level.id) === index);
  }

  findLearningContentForQuranLookup(lookup: QuranLookup, scope?: ContentScope): LearningPathDiscoveryResult[] {
    return this.listLearningPaths({ quranLookup: lookup }, scope);
  }

  searchDiscovery(query: string, filters: DiscoveryFilters = {}, scope?: ContentScope): DiscoverySearchResult {
    const parsed = this.parseDiscoveryQuery(query, scope);
    const quranReferences = this.searchQuranMetadata(query, scope);
    let learningPaths = parsed.query.kind === 'quran_lookup'
      ? this.listLearningPaths({ ...filters, quranLookup: parsed.query.lookup }, scope)
      : this.listLearningPaths(filters, scope);
    if (parsed.query.kind === 'text') {
      const text = parsed.query.normalizedText;
      learningPaths = learningPaths.filter(result => pathMatchesText(result, text, this.getPackageById(result.packageId), scope?.studyLocale ?? 'en'));
    }
    return { quranReferences, learningPaths, diagnostics: parsed.diagnostics };
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
    const pkg = this.getActivePackage();
    const pathId = pkg?.metadata.defaultLearningPathId;
    return pathId ? this.getLearningPathById(pathId) : this._learningPaths[0];
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

  private _packagesForScope(scope?: ContentScope): ContentPackage[] {
    if (!scope) return this._packages;
    const ids = new Set(scope.activePackageIds);
    return this._packages.filter(pkg => ids.has(pkg.id) && pkg.editions.some(edition => edition.id === scope.editionId));
  }

  private _ayatForScope(scope?: ContentScope): AyahRecord[] {
    return scope ? uniqueById(this._packagesForScope(scope).flatMap(pkg => pkg.ayat)) : this._ayat;
  }

  private _surahsForScope(scope?: ContentScope): SurahRecord[] {
    return scope ? uniqueById(this._packagesForScope(scope).flatMap(pkg => pkg.surahs)) : this._surahs;
  }

  private _divisionsForScope(scope?: ContentScope): QuranDivision[] {
    return scope ? uniqueById(this._packagesForScope(scope).flatMap(pkg => pkg.divisions)) : this._divisions;
  }

  private _structureForScope(scope?: ContentScope): AyahStructureIndex[] {
    const packages = this._packagesForScope(scope);
    const records = packages.flatMap(pkg => pkg.structureIndex ?? []);
    return records.filter((entry, index) => records.findIndex(candidate => candidate.editionId === entry.editionId
      && sameRef(candidate.ayahRef, entry.ayahRef)) === index);
  }

  private lookupAvailable(lookup: QuranLookup, scope?: ContentScope): boolean {
    switch (lookup.type) {
      case 'surah':
        return Boolean(this.getSurahByNumber(lookup.surahNumber, scope));
      case 'ayah':
        return Boolean(this.getAyahByRef(lookup.ayahRef, scope?.editionId, scope));
      case 'ayah_range':
        return this.getAyahsInRange(lookup.range, scope).length > 0;
      case 'juz':
      case 'hizb':
      case 'rub_el_hizb':
        return this.listAyahRefsInDivision(lookup.type, lookup.number, scope?.editionId, scope).length > 0;
    }
  }

  private referenceResult(lookup: QuranLookup, scope?: ContentScope): QuranReferenceResult {
    const ayahRefs = lookupRefs(lookup, this, scope);
    return {
      lookup,
      label: lookupLabel(lookup, this, scope),
      ayahRefs,
      lessonAvailability: this.findLearningContentForQuranLookup(lookup, scope).length > 0
        ? 'published'
        : 'no_published_lesson',
    };
  }
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

function sameRef(a: AyahRef, b: AyahRef): boolean {
  return a.surahNumber === b.surahNumber && a.ayahNumber === b.ayahNumber;
}

function normalizeDivisionKind(kind: QuranDivisionQueryKind): Exclude<QuranDivisionQueryKind, 'rub'> {
  return kind === 'rub' ? 'rub_el_hizb' : kind;
}

function structureNumber(entry: AyahStructureIndex, kind: Exclude<QuranDivisionQueryKind, 'rub'>): number | undefined {
  if (kind === 'juz') return entry.juzNumber;
  if (kind === 'hizb') return entry.hizbNumber;
  if (kind === 'rub_el_hizb') return entry.rubElHizbNumber;
  return entry.thumunAlHizbNumber;
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return items.filter((item, index) => items.findIndex(candidate => candidate.id === item.id) === index);
}

function lookupRefs(lookup: QuranLookup, repo: ContentRepositoryImpl, scope?: ContentScope): AyahRef[] {
  switch (lookup.type) {
    case 'surah':
      return repo.getAyahsInRange({
        start: { surahNumber: lookup.surahNumber, ayahNumber: 1 },
        end: { surahNumber: lookup.surahNumber, ayahNumber: Number.MAX_SAFE_INTEGER },
      }, scope).map(ayah => ayah.ref);
    case 'ayah':
      return repo.getAyahByRef(lookup.ayahRef, scope?.editionId, scope) ? [lookup.ayahRef] : [];
    case 'ayah_range':
      return repo.getAyahsInRange(lookup.range, scope).map(ayah => ayah.ref);
    case 'juz':
    case 'hizb':
    case 'rub_el_hizb':
      return repo.listAyahRefsInDivision(lookup.type, lookup.number, scope?.editionId, scope);
  }
}

function lookupLabel(lookup: QuranLookup, repo: ContentRepositoryImpl, scope?: ContentScope): string {
  switch (lookup.type) {
    case 'surah':
      return repo.getSurahByNumber(lookup.surahNumber, scope)?.transliteratedName ?? `Surah ${lookup.surahNumber}`;
    case 'ayah':
      return refKey(lookup.ayahRef);
    case 'ayah_range':
      return `${refKey(lookup.range.start)}-${lookup.range.end.ayahNumber}`;
    case 'juz':
      return `Juz ${lookup.number}`;
    case 'hizb':
      return `Hizb ${lookup.number}`;
    case 'rub_el_hizb':
      return `Rub ${lookup.number}`;
  }
}

function matchesPathFilters(result: LearningPathDiscoveryResult, filters: DiscoveryFilters, repo: ContentRepositoryImpl): boolean {
  const metadata = result.path.discovery;
  if (filters.approvedOnly && result.path.sourceMetadata.reviewerStatus !== 'approved') return false;
  if (filters.themeIds && (!metadata || !filters.themeIds.every(id => metadata.themeIds.includes(id)))) return false;
  if (filters.contentTypes && (!metadata || !filters.contentTypes.some(type => metadata.contentTypes.includes(type)))) return false;
  if (filters.studyLocale && (!metadata || !metadata.studyLocales.includes(filters.studyLocale))) return false;
  if (filters.audience && (!metadata || !metadata.audiences.includes(filters.audience))) return false;
  const maximumMinutes = filters.maximumMinutesPerLevel;
  if (maximumMinutes && !result.levels.some(level => level.durationMinutes <= maximumMinutes)) return false;
  if (filters.learningGoals && !result.levels.some(level => filters.learningGoals!.every(goal => level.goals.includes(goal)))) return false;
  if (filters.quranLookup && !pathMatchesLookup(result, filters.quranLookup, repo)) return false;
  return true;
}

function pathMatchesLookup(result: LearningPathDiscoveryResult, lookup: QuranLookup, repo: ContentRepositoryImpl): boolean {
  const pkg = repo.getPackageById(result.packageId);
  if (!pkg) return false;
  if (lookup.type === 'surah') return result.path.surahIds.some(id => pkg.surahs.find(surah => surah.id === id)?.surahNumber === lookup.surahNumber);
  const scope: ContentScope = {
    activePackageIds: [result.packageId],
    editionId: 'hafs-an-asim',
    studyLocale: result.path.discovery?.studyLocales[0] ?? pkg.localization.defaultLocale,
  };
  const refs = lookupRefs(lookup, repo, scope);
  const keys = new Set(refs.map(refKey));
  return result.levels.some(level => level.ayahRefs.some(ref => keys.has(refKey(ref))));
}

function pathMatchesText(result: LearningPathDiscoveryResult, text: string, pkg: ContentPackage | undefined, locale: string): boolean {
  if (normalizeSearchText(`${result.path.title} ${result.path.description}`).includes(text)) return true;
  const themeIds = new Set(result.path.discovery?.themeIds ?? []);
  return (pkg?.themes ?? []).some(theme => themeIds.has(theme.id) && [
    theme.title[locale],
    ...(theme.aliases?.[locale] ?? []),
  ].some(value => value && normalizeSearchText(value).includes(text)));
}

function assertSharedRecordsMatch<T extends { id: string }>(label: string, incoming: T[], installed: T[]): void {
  incoming.forEach(record => {
    const existing = installed.find(candidate => candidate.id === record.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(record)) {
      throw new Error(`${label} ID "${record.id}" conflicts with canonical data in another package`);
    }
  });
}
