// src/moderation/moderation.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ModerationService } from './moderation.service';

@Injectable()
export class ModerationListener {
  private readonly logger = new Logger(ModerationListener.name);

  constructor(private readonly moderation: ModerationService) {}

  @OnEvent('chapter.content_changed', { async: true })
  async handleContentChanged(payload: { chapterId: string }) {
    try {
      // Đặt lại hàng chờ (AI_PENDING) nếu muốn
      await this.moderation.submit({ chapterId: payload.chapterId }, undefined);
      // Chạy AI thẳng
      await this.moderation.runAiCheck(payload.chapterId);
    } catch (e) {
      this.logger.error(`Auto moderation failed for ${payload.chapterId}`, e as any);
    }
  }
}
