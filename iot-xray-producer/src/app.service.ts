import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  msg(): string {
    return 'Producer app is up!';
  }
}
