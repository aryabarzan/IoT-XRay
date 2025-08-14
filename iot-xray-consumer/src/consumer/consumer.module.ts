import { Module } from '@nestjs/common';
import { SignalModule } from '../signal';
import { ConsumerService } from './consumer.service';

@Module({
  imports: [SignalModule],
  providers: [ConsumerService],
  exports: [ConsumerService],
})
export class ConsumerModule {}
