import type { Express } from 'express';
import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { OCROptions, OCRError } from '../types/pix';
import { ALLOWED_MIME_TYPES, MAX_IMAGE_SIZE, OcrService } from './ocr.service';

type OcrRequestBody = {
  language?: string;
  timeout?: string | number;
};

@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(new BadRequestException('Invalid image type'), false);
          return;
        }

        cb(null, true);
      },
    })
  )
  async runOcr(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: OcrRequestBody
  ) {
    if (!file) {
      throw new BadRequestException('Missing file');
    }

    const options = parseOcrOptions(body);

    try {
      return await this.ocrService.processImage(file.buffer, options);
    } catch (error) {
      if (error instanceof OCRError) {
        throw new HttpException(error.message, error.statusCode);
      }

      throw error;
    }
  }
}

function parseOcrOptions(body: OcrRequestBody | undefined): OCROptions {
  if (!body) {
    return {};
  }

  const options: OCROptions = {};

  if (body.language) {
    options.language = body.language;
  }

  if (body.timeout !== undefined) {
    const parsedTimeout = Number(body.timeout);
    if (!Number.isNaN(parsedTimeout) && parsedTimeout > 0) {
      options.timeout = parsedTimeout;
    }
  }

  return options;
}
