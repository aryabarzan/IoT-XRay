import { Body, Controller, Get, Post, UsePipes } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { XrayDataRequestDto } from './types';
import { XrayDataPipe } from './pipe/xray-data.pip';
import { ProducerService } from './producer.service';

@ApiTags('Producer')
@Controller('producer')
export class ProducerController {
  constructor(private readonly producerService: ProducerService) {}

  @Get('status')
  @ApiOperation({ summary: 'Getting the summery of Producer' })
  async getStatus() {
    return 'Producer is running and sending messages automatically.';
  }

  @Post('publish-manual')
  @ApiOperation({ summary: 'Sending x-ray data to RabbitMQ' })
  @ApiBody({
    description:
      'X-ray payload. The deviceId is the key and the value is the data.',
  })
  // @UsePipes(XrayDataPipe) it is disabled for producing bad data
  async publishDataManually(@Body() body: XrayDataRequestDto) {
    return this.producerService.publishDataFromHttp(body);
  }
}
