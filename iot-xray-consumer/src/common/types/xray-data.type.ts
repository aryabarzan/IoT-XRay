import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  ValidateNested,
} from 'class-validator';

class CoordinatesDto {
  @IsLatitude()
  x: number;

  @IsLongitude()
  y: number;

  @IsNumber()
  speed: number;
}

export class PointInfoDto {
  @IsInt()
  time: number;

  @ValidateNested()
  @Type(() => CoordinatesDto)
  coords: CoordinatesDto;
}

export class DeviceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PointInfoDto)
  data: PointInfoDto[];

  @IsNumber()
  time: number;
}

export type XrayDataRequestDto = Record<string, DeviceDto>;
