import { Nack } from '@golevelup/nestjs-rabbitmq';
import { Logger } from '@nestjs/common';
import { ConsumerService } from './consumer.service';
import { DeviceDto, XrayDataRequestDto } from './types';

/**
 * Test suite for ConsumerService
 * Tests message handling, data validation, and error scenarios for RabbitMQ consumer
 */
describe('ConsumerService', () => {
  // Test fixtures and mock setup
  let consumerService: ConsumerService;
  let validateSpy: jest.SpyInstance;
  let loggerSpy: jest.SpyInstance;
  let errorLoggerSpy: jest.SpyInstance;

  // Mock service for signal creation
  const mockSignalService = {
    createSignal: jest.fn(),
  };

  // Sample valid message structure matching RabbitMQ payload
  const mockValidMsg = {
    'device-1': {
      data: [[123, [1, 2, 3]]],
      time: 456,
    },
  };

  // Expected cleaned and transformed data structure
  const mockValidCleanedData: XrayDataRequestDto = {
    'device-1': {
      data: [{ time: 123, coords: { x: 1, y: 2, speed: 3 } }],
      time: 456,
    } as DeviceDto,
  };

  // Test setup and teardown
  beforeEach(() => {
    jest.clearAllMocks();
    consumerService = new ConsumerService(mockSignalService as any);
    validateSpy = jest
      .spyOn(require('class-validator'), 'validate')
      .mockResolvedValue([]);
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorLoggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    validateSpy.mockRestore();
  });

  /**
   * Tests for handleXrayData method
   * Covers message processing, validation, and error handling scenarios
   */
  describe('handleXrayData', () => {
    // Happy path test
    it('should successfully process valid message data', async () => {
      jest
        .spyOn(consumerService as any, 'cleanData')
        .mockResolvedValue(mockValidCleanedData);

      const result = await consumerService.handleXrayData(mockValidMsg);

      // Verify successful message processing
      expect(result).toBeInstanceOf(Nack);
      expect(result).toEqual(new Nack(false));
      expect(mockSignalService.createSignal).toHaveBeenCalledWith(
        mockValidCleanedData,
      );
      // Verify correct logging sequence
      expect(loggerSpy).toHaveBeenNthCalledWith(
        1,
        'Received message from RabbitMQ.',
      );
      expect(loggerSpy).toHaveBeenNthCalledWith(
        2,
        'Message content successfully sent to SignalService for processing.',
      );
    });

    // Invalid message handling test
    it('should reject invalid message with Nack(false)', async () => {
      jest.spyOn(consumerService as any, 'cleanData').mockResolvedValue(null);

      const result = await consumerService.handleXrayData({});

      // Verify message rejection behavior
      expect(result).toBeInstanceOf(Nack);
      expect(result).toEqual(new Nack(false));
      expect(mockSignalService.createSignal).not.toHaveBeenCalled();
      expect(errorLoggerSpy).toHaveBeenCalledWith(
        'Invalid message structure received.',
      );
    });

    // System error handling test
    it('should requeue message on system error with Nack(true)', async () => {
      const error = new Error('System error');
      mockSignalService.createSignal.mockRejectedValue(error);
      jest
        .spyOn(consumerService as any, 'cleanData')
        .mockResolvedValue(mockValidCleanedData);

      const result = await consumerService.handleXrayData(mockValidMsg);

      // Verify requeue behavior on system error
      expect(result).toBeInstanceOf(Nack);
      expect(result).toEqual(new Nack(true));
      expect(errorLoggerSpy).toHaveBeenCalledWith(
        `A system error occurred while processing message. Error: ${error.message}`,
        error.stack,
      );
    });

    // Clean data error handling test
    it('should handle errors in cleanData', async () => {
      const error = new Error('Clean data error');
      jest.spyOn(consumerService as any, 'cleanData').mockRejectedValue(error);

      const result = await consumerService.handleXrayData(mockValidMsg);

      // Verify error handling behavior
      expect(result).toBeInstanceOf(Nack);
      expect(result).toEqual(new Nack(true));
      expect(errorLoggerSpy).toHaveBeenCalledWith(
        `A system error occurred while processing message. Error: ${error.message}`,
        error.stack,
      );
    });
  });

  /**
   * Tests for cleanData method
   * Covers data transformation, validation, and error handling
   */
  describe('cleanData', () => {
    // Valid data transformation test
    it('should return a validated DTO for valid message data', async () => {
      validateSpy.mockResolvedValue([]);

      const result = await consumerService['cleanData'](mockValidMsg);

      // Verify successful data transformation
      expect(result).toEqual({ 'device-1': expect.any(Object) });
      expect(validateSpy).toHaveBeenCalledTimes(1);
    });

    // Invalid input handling test
    it('should return null for an invalid top-level message', async () => {
      const result1 = await consumerService['cleanData'](null);
      const result2 = await consumerService['cleanData']('invalid-string');
      const result3 = await consumerService['cleanData']([1, 2, 3]);

      // Verify null return for invalid inputs
      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
      expect(validateSpy).not.toHaveBeenCalled();
    });

    // Partial data validation test
    it('should skip devices with invalid data structure and return valid ones', async () => {
      validateSpy.mockResolvedValue([]);

      const mockMsg = {
        'device-1': { data: [[123, [1, 2, 3]]], time: 456 },
        'device-2': { data: 'not-an-array' },
      };

      const result = await consumerService['cleanData'](mockMsg);

      // Verify partial data processing
      expect(result).toEqual({ 'device-1': expect.any(Object) });
      expect(validateSpy).toHaveBeenCalledTimes(1);
    });

    // Validation failure test
    it('should skip devices that fail validation', async () => {
      validateSpy.mockResolvedValue([{ property: 'data', constraints: {} }]);

      const result = await consumerService['cleanData'](mockValidMsg);

      // Verify validation failure handling
      expect(result).toBeNull();
      expect(validateSpy).toHaveBeenCalledTimes(1);
    });

    // Empty data handling test
    it('should handle empty device data array', async () => {
      const mockMsg = {
        'device-1': { data: [], time: 456 },
      };

      const result = await consumerService['cleanData'](mockMsg);

      // Verify empty data handling
      expect(result).not.toBeNull();
      expect(validateSpy).toHaveBeenCalledTimes(1);
    });

    // Multiple device handling test
    it('should handle multiple valid devices', async () => {
      validateSpy.mockResolvedValue([]);
      const mockMsg = {
        'device-1': { data: [[123, [1, 2, 3]]], time: 456 },
        'device-2': { data: [[124, [4, 5, 6]]], time: 457 },
      };

      const result = await consumerService['cleanData'](mockMsg);

      // Type guard for null check
      if (result) {
        // Verify multiple device processing
        expect(Object.keys(result)).toHaveLength(2);
        expect(result).toHaveProperty('device-1');
        expect(result).toHaveProperty('device-2');
        expect(validateSpy).toHaveBeenCalledTimes(2);
      } else {
        fail('Expected result to not be null');
      }
    });
  });
});
