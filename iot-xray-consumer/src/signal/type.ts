import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { PointInfoDto } from '../consumer';
import { Signal } from './schemas';

/**
 * DTO for creating a new Signal via the API.
 * This can be used for manual data entry or testing.
 */
export class CreateSignalDto {
  @ApiProperty({
    description: 'Unique identifier for the message',
    format: 'uuid',
    example: '4a73b54e-98b7-4c3d-8e5f-1a2b3c4d5e6f',
  })
  @IsUUID()
  uuid: string;

  @ApiProperty({
    description: 'Identifier of the IoT device',
    example: 'device_12345',
  })
  @IsString()
  deviceId: string;

  @ApiProperty({
    description: 'Timestamp from the original payload',
    example: 1678886400,
  })
  @IsNumber()
  time: number;

  @ApiProperty({
    description: 'Length of the data array',
    example: 2,
  })
  @IsNumber()
  dataLength: number;

  @ApiProperty({
    description: 'Estimated size of the data array in bytes',
    example: 196,
  })
  @IsNumber()
  dataVolume: number;

  @ApiProperty({
    description: 'Array of x-ray data points',
    type: [PointInfoDto],
    example: [
      {
        time: 1678886400,
        coords: {
          x: 35.7219,
          y: 51.3347,
          speed: 60.5,
        },
      },
      {
        time: 1678886405,
        coords: {
          x: 35.7225,
          y: 51.335,
          speed: 62.1,
        },
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PointInfoDto)
  data: PointInfoDto[];
}

/**
 * DTO for updating an existing Signal.
 * All fields are optional.
 */
export class UpdateSignalDto {
  @ApiProperty({
    description: 'Timestamp from the original payload',
    required: false,
    example: 1678886500,
  })
  @IsOptional()
  @IsNumber()
  time?: number;

  @ApiProperty({
    description: 'Length of the data array',
    required: false,
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  dataLength?: number;

  @ApiProperty({
    description: 'Estimated size of the data array in bytes',
    required: false,
    example: 250,
  })
  @IsOptional()
  @IsNumber()
  dataVolume?: number;

  @ApiProperty({
    description: 'Array of x-ray data points',
    required: false,
    type: [PointInfoDto],
    example: [
      {
        time: 1678886500,
        coords: {
          x: 35.7228,
          y: 51.3355,
          speed: 65.0,
        },
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PointInfoDto)
  data?: PointInfoDto[];
}

/**
 * DTO for filtering signals by query parameters.
 */
export class FilterSignalDto {
  @ApiProperty({ description: 'Filter by device ID', required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    description: 'Filter by message UUID',
    required: false,
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  uuid?: string;

  @ApiProperty({
    description:
      'Filter signals with a timestamp greater than or equal to this value',
    required: false,
  })
  @IsOptional()
  @IsInt()
  time?: number;

  @ApiProperty({
    description: 'Filter by the exact data length',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  dataLength?: number;

  @ApiProperty({
    description: 'Filter by the exact data volume',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  dataVolume?: number;
}

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class PaginationInfo {
  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  limit: number;
}

export class PaginatedSignalsResponse {
  @ApiProperty({ type: [Signal] })
  data: Signal[];

  @ApiProperty()
  paginationInfo: PaginationInfo;
}
