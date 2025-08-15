# IoT X-Ray

This project consists of two services: `iot-xray-producer` and `iot-xray-consumer`.

The `iot-xray-producer` service is responsible for producing x-ray data. It has a Swagger endpoint that allows users to manually post test JSON data. The producer then sends this data to the `iot-xray-consumer` service via RabbitMQ.

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

    For each service, navigate to its directory and start the service:

    ```bash
    cd iot-xray-producer
    npm run start:dev
    cd ../iot-xray-consumer
    npm run start:dev
    ```

## Running Tests

The `iot-xray-consumer` service has unit and integration tests.

-   **Unit Tests:** Located in `src/**/*.spec.ts` files (e.g., `src/app.controller.spec.ts`, `src/consumer/consumer.spec.ts`).
-   **Integration Tests:** Located in `src/**/*.integration.spec.ts` files (e.g., `src/consumer/consumer.integration.spec.ts`).
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