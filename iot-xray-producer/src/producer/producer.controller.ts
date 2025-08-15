import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProducerService } from './producer.service';
import type { XrayDataRequestDto } from './types';

@ApiTags('Producer')
@Controller('producer')
export class ProducerController {
  constructor(private readonly producerService: ProducerService) {}

  // @Get('status')
  // @ApiOperation({ summary: 'Getting the summery of Producer' })
  // async getStatus() {
  //   return 'Producer is running and sending messages automatically.';
  // }

  /**
   * Publishes x-ray data to the RabbitMQ exchange manually via an HTTP POST request.
   *
   * This endpoint receives a message payload in the `XrayDataRequestDto` format
   * from an HTTP request body. It then forwards this payload to the `ProducerService`
   * which is responsible for sending the data to the configured RabbitMQ exchange.
   *
   * @param body The payload containing the x-ray data, where each key represents a device ID.
   * @returns A promise that resolves to the result of the message publishing operation.
   */
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
