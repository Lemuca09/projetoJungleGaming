import { Controller, Get } from '@nestjs/common';
import { guide } from './guide.content';

@Controller('guide')
export class GuideController {
  @Get()
  get() {
    return guide;
  }
}
