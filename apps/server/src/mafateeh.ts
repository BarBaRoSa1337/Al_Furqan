export interface MafateehLicenseEvidence {
  evidenceId: string;
  writtenPermissionReference: string;
  permits: Array<'topic_taxonomy' | 'topic_ayah_mapping' | 'public_distribution' | 'local_storage' | 'derivative_translation' | 'android' | 'ios' | 'web'>;
}

export class MafateehProvider {
  readonly enabled = false;

  async getTopics(): Promise<never> {
    throw new Error('Mafateeh is disabled until written permission covers every required use');
  }
}
