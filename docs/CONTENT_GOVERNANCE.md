# Content Governance

## Purpose

This app teaches Quran. Content accuracy and trust are more important than speed.

## Golden Rule

Never publish Quran, tafsir, translation, or religious explanation without trusted source metadata and review status.

## Source Metadata

Every concept must include:

```ts
type QuranSource = {
  quranTextSource: string
  translationSource: string
  tafsirSource?: string
  wordMeaningSource?: string
  reviewerStatus: 'draft' | 'reviewed' | 'approved'
  reviewerName?: string
  notes?: string
}