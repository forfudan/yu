export interface Stage {
  type: 'chaiFen' | 'bianMa' | 'practice';
  plotZi: string;
  descriptionTop?: string;
  descriptionBottom?: string;
  chaiFen?: string[];
  bianMa?: string[];
}
