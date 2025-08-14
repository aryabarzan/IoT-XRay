import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Signal } from './schemas/signal.schema';
import { SignalService } from './signal.service';
import {
  CreateSignalDto,
  FilterSignalDto,
  PaginatedSignalsResponse,
  PaginationDto,
  UpdateSignalDto,
} from './type';

@ApiTags('signals')
@Controller('signals')
export class SignalController {
  constructor(private readonly signalService: SignalService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new signal' })
  @ApiResponse({
    status: 201,
    description: 'The signal has been successfully created.',
    type: Signal,
  })
  @ApiBody({
    type: CreateSignalDto,
    description: 'Payload for creating a new signal.',
  })
  async create(@Body() createSignalDto: CreateSignalDto): Promise<Signal> {
    return this.signalService.create(createSignalDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all signals with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Returns an array of signals with pagination info.',
    type: PaginatedSignalsResponse, // استفاده از کلاس جدید برای پاسخ
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
  })
  @ApiQuery({
    name: 'deviceId',
    required: false,
    type: String,
    description: 'Filter by device ID',
  })
  @ApiQuery({
    name: 'uuid',
    required: false,
    type: String,
    description: 'Filter by message UUID',
  })
  @ApiQuery({
    name: 'time',
    required: false,
    type: Number,
    description:
      'Filter signals with a timestamp greater than or equal to this value',
  })
  @ApiQuery({
    name: 'dataLength',
    required: false,
    type: Number,
    description: 'Filter by the exact data length',
  })
  @ApiQuery({
    name: 'dataVolume',
    required: false,
    type: Number,
    description: 'Filter by the exact data volume',
  })
  async findAll(
    @Query() filterDto: FilterSignalDto,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedSignalsResponse> {
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;

    if (Object.keys(filterDto).length || Object.keys(paginationDto).length) {
      return this.signalService.findWithFilters(filterDto, { page, limit });
    }

    return this.signalService.findWithFilters({}, { page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find a signal by its UUID' })
  @ApiResponse({
    status: 200,
    description: 'Returns a single signal.',
    type: Signal,
  })
  @ApiResponse({ status: 404, description: 'Signal not found.' })
  async findOne(@Param('id') id: string): Promise<Signal | null> {
    return this.signalService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing signal by its UUID' })
  @ApiResponse({
    status: 200,
    description: 'The signal has been successfully updated.',
    type: Signal,
  })
  @ApiResponse({ status: 404, description: 'Signal not found.' })
  @ApiBody({
    type: UpdateSignalDto,
    description: 'Payload for updating an existing signal.',
  })
  async update(
    @Param('id') id: string,
    @Body() updateSignalDto: UpdateSignalDto,
  ): Promise<Signal | null> {
    return this.signalService.update(id, updateSignalDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a signal by its UUID' })
  @ApiResponse({
    status: 200,
    description: 'The signal has been successfully deleted.',
    type: Signal,
  })
  @ApiResponse({ status: 404, description: 'Signal not found.' })
  async delete(@Param('id') id: string): Promise<Signal | null> {
    return this.signalService.delete(id);
  }

  @Delete('by-device/:deviceId')
  @ApiOperation({ summary: 'Delete all signals by deviceId' })
  @ApiParam({
    name: 'deviceId',
    type: String,
    description: 'The ID of the device whose signals will be deleted',
    example: '66bb584d4ae73e488c30a072',
  })
  async deleteByDeviceId(@Param('deviceId') deviceId: string) {
    return this.signalService.deleteByDeviceId(deviceId);
  }
}
