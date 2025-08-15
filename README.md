# IoT X-Ray

This project consists of two services: `iot-xray-producer` and `iot-xray-consumer`.

The `iot-xray-producer` service is responsible for producing x-ray data. It has a Swagger endpoint that allows users to manually post test JSON data. Sample x-ray data can be found in `x-ray.json` at the project root. The producer then sends this data to the `iot-xray-consumer` service via RabbitMQ.

The `iot-xray-consumer` service consumes the x-ray data from RabbitMQ, processes it, and saves it to a MongoDB database.

## Running the Services

There are two ways to run the services:

### 1. Using Docker Compose

This is the recommended way to run the services. The `docker-compose.yml` file in the root of the project defines the services and their dependencies (RabbitMQ and MongoDB).

To run the services, execute the following command from the root of the project:

```bash
docker-compose up -d
```

This will start the `iot-xray-producer`, `iot-xray-consumer`, RabbitMQ, and MongoDB services in the background.

-   `iot-xray-producer`: http://localhost:4001
-   `iot-xray-consumer`: http://localhost:4000

The Swagger UI for the services will be available at:

-   `iot-xray-producer`: http://localhost:4001/swagger
-   `iot-xray-consumer`: http://localhost:4000/swagger


To test the data flow, open the `iot-xray-producer` Swagger UI (http://localhost:4001/swagger). Navigate to the `/producer/publish-manual` endpoint. Copy the content of the `x-ray.json` file (located at the project root) and paste it into the request body. Execute the request. You should then observe that the data is saved into the `signal` collection in your MongoDB database.

### RabbitMQ Management Interface

If you are running RabbitMQ via Docker Compose, you can access its management interface at:

-   **RabbitMQ Management:** http://localhost:25672

You can log in with the default credentials: `guest`/`guest`.

### 2. Running Locally

You can also run the services locally without Docker. You will need to have RabbitMQ and MongoDB running on your local machine.

1.  **Configure the services:**

    For each service (`iot-xray-producer` and `iot-xray-consumer`), you will need to configure the `.env` file with the correct connection strings for RabbitMQ and MongoDB. You can also change the port for each service by modifying the `APP_PORT` variable in the `.env` file.

    **`iot-xray-producer/.env`**
    ```
    APP_PORT=3001
    RABBITMQ_URI=amqp://guest:guest@localhost:5672
    RABBITMQ_PREFETCH_COUNT=2
    ```

    **`iot-xray-consumer/.env`**
    ```
    APP_PORT=3000
    RABBITMQ_URI=amqp://guest:guest@localhost:5672
    RABBITMQ_PREFETCH_COUNT=2
    MONGO_URI=mongodb://localhost:27017/iot-xray
    ```

2.  **Install dependencies:**

    Open two separate terminal windows. In each terminal, navigate to one of the service directories (`iot-xray-producer` or `iot-xray-consumer`) and install the dependencies:

    **Terminal 1:**
    ```bash
    cd iot-xray-producer
    npm install
    ```

    **Terminal 2:**
    ```bash
    cd iot-xray-consumer
    npm install
    ```

3.  **Start the services:**

    Open two separate terminal windows. In each terminal, navigate to one of the service directories (`iot-xray-producer` or `iot-xray-consumer`) and start the service:

    **Terminal 1:**
    ```bash
    cd iot-xray-producer
    npm run start:dev
    ```

    **Terminal 2:**
    ```bash
    cd iot-xray-consumer
    npm run start:dev
    ```

    Once both services are running, you can access them at:

    -   `iot-xray-producer`: http://localhost:3001
    -   `iot-xray-consumer`: http://localhost:3000

    The Swagger UI for the services will be available at:

    -   `iot-xray-producer`: http://localhost:3001/swagger
    -   `iot-xray-consumer`: http://localhost:3000/swagger

    To test the data flow, open the `iot-xray-producer` Swagger UI (http://localhost:3001/swagger). Navigate to the `/producer/publish-manual` endpoint. Copy the content of the `x-ray.json` file (located at the project root) and paste it into the request body. Execute the request. You should then observe that the data is saved into the `signal` collection in your MongoDB database.

## Running Tests

The `iot-xray-consumer` service has unit and integration tests.

-   **Unit Tests:** Located in `src/**/*.spec.ts` files (e.g., `src/consumer/test/consumer.spec.ts`).
-   **Integration Tests:** Located in `src/**/*.integration.spec.ts` files (e.g., `src/consumer/test/consumer.integration.spec.ts`).
-   **End-to-End Tests:** Located in `test/**/*.e2e-spec.ts` files (e.g., `test/app.e2e-spec.ts`).

To run the tests, navigate to the `iot-xray-consumer` directory and run the following command:

```bash
cd iot-xray-consumer
npm test
```

The tests require a running RabbitMQ and MongoDB instance. The tests are configured to use a separate test database and RabbitMQ virtual host to avoid interfering with your development or production data. Make sure your RabbitMQ instance has a virtual host named `test`.

You can configure the test environment by creating a `.env.test` file in the `iot-xray-consumer` directory.

**`iot-xray-consumer/.env.test`**
```
MONGO_URI=mongodb://localhost:27017/iot-xray-test
RABBITMQ_URI=amqp://guest:guest@localhost:5672/test
RABBITMQ_PREFETCH_COUNT=2
```

## Data Flow

The data flow within the IoT X-Ray system is as follows:

1.  **Producer Sends Data:** The `iot-xray-producer` service generates x-ray data (either manually via its Swagger UI or through other means) and publishes these messages to a RabbitMQ exchange.
2.  **Consumer Receives Data:** The `iot-xray-consumer` service, specifically its `ConsumerService`, is configured to listen for messages on a RabbitMQ queue that is bound to the producer's exchange.
3.  **Data Processing:** Upon receiving a message, the `ConsumerService` processes the raw x-ray data. This processing may involve validation, transformation, or enrichment of the data.
4.  **Signal Service Handles Data:** The processed data is then passed to the `SignalService` within the `iot-xray-consumer`.
5.  **Data Persistence:** The `SignalService` is responsible for persisting the refined signal data into the MongoDB database, adhering to the schema defined in `signal/schemas/signal.schema.ts`.

## Sample X-Ray Data Structure

The `x-ray.json` file contains sample x-ray data structured as a JSON object.

The top-level keys of this object are **device IDs** (e.g., `"66bb584d4ae73e488c30a072"`), representing individual x-ray sessions or devices.

Each device ID maps to an object that contains a single property: `"data"`.

The value of the `"data"` property is an array of arrays. Each inner array represents a single data point and consists of two elements:

1.  **Time (integer):** This is a timestamp or a sequence number for the data point.
2.  **Measurements (array of three floating-point numbers):** This array contains:
    *   **X-coordination**
    *   **Y-coordination**
    *   **Speed**

In summary, the `x-ray.json` file provides a collection of x-ray data, organized by device IDs, with each entry containing a series of time-stamped measurements including coordinates and speed.

### The shape of data (from `./x-ray-test.json` or `iot-xray-producer/x-ray-test.json`)

The `iot-xray` data has the following shape, as exemplified by `./x-ray-test.json`:

```json
{
  "66bb584d4ae73e488c30a072": { //device ID
    "data": [
      [
        762, //time
        [
          51.339764, // x-coordination
          12.339223833333334, //y-coordination
          1.2038000000000002 //speed
        ]
      ],
      [
        1766,
        [
          51.33977733333333,
          12.339211833333334,
          1.531604
        ]
      ]
    ],
    "time": 1735683480000
  }
}
```