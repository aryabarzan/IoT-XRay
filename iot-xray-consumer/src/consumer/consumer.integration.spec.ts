import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, Model } from 'mongoose';
import { AppModule } from '../app.module';
import { ConsumerService } from './consumer.service';
import { Signal } from '../signal/schemas/signal.schema';

// NOTE: This integration test requires running RabbitMQ and MongoDB services.
// You can start them using `docker-compose up -d` from the root of the project.
// The .env.test file should be configured to point to the test instances of these services.
describe('ConsumerService (Integration)', () => {
  let app: INestApplication;
  let consumerService: ConsumerService;
  let signalModel: Model<Signal>;
  let connection: Connection;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    consumerService = app.get<ConsumerService>(ConsumerService);
    signalModel = app.get<Model<Signal>>(getModelToken(Signal.name));
    connection = app.get(getConnectionToken());
  }, 30000);

  afterAll(async () => {
    if (connection) {
      await connection.close();
    }
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await signalModel.deleteMany({});
  });

  it('should process a message and save a signal to the database', async () => {
    const mockMsg = {
      'device-1': {
        data: [[1678886400, [34.0522, -118.2437, 60]]],
        time: 1678886400,
      },
    };

    await consumerService.handleXrayData(mockMsg);

    // It might take a moment for the async operation to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const signals = await signalModel.find().exec();
    expect(signals).toHaveLength(1);
    expect(signals[0].deviceId).toBe('device-1');
    expect(signals[0].time).toBe(1678886400);
    expect(signals[0].data.length).toBe(1);
    expect(signals[0].data[0].time).toBe(1678886400);
    expect(signals[0].data[0].coords.x).toBe(34.0522);
    expect(signals[0].data[0].coords.y).toBe(-118.2437);
    expect(signals[0].data[0].coords.speed).toBe(60);
  }, 10000);
});