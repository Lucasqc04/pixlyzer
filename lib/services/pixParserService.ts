import { orchestrateParse } from '@/lib/parser';
import type { ParsedPix } from '@/types/pix';

export class PixParserService {
  static async parse(text: string): Promise<ParsedPix> {
    return orchestrateParse(text);
  }
}
