# Adastry API

## Description

Backend API supporting [Adastry.io](https://adastry.io), 
the Swagger OpenApi docs can be found at [api.adastry.io](https://api.adastry.io/).

The Adastry API is built on top of the [Nest](https://github.com/nestjs/nest)
framework TypeScript starter repository.

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

Not implemented yet.

## Environments

#### TypeORM

To prevent production data lost, database schema synchronization is disabled 
by default. To enable entities **auto-synchronization**, set the node environment to the following:

```bash
NODE_ENV=development
```

#### Integrity Check

Integrity check is skipped when env `SKIP_INTEGRITY_CHECK` have the string value `yes`. String value is used instead of
boolean for **dotenv** compatibility.

#### Data Sync

Initial sync is skipped when env `SKIP_INIT_SYNC` have the string value `yes`. String value is used instead of
boolean for **dotenv** compatibility.

Data Sync at startup or scheduled cronjob is skipped when env `SKIP_SYNC` have the string value `yes`. String value is used instead of
boolean for **dotenv** compatibility.

## TypeORM CLI

Since he TypeORM cli cannot read from the Nest app configuration, it requires a datasource file named `typeOrm.config.ts` located at the project root.

**Note:** The nestJs **autoLoadEntities** feature won't work here, therefore entities need to be manually registered. 

### Check SQL before updating schema

```bash
npm run typeorm schema:log -- -d typeOrm.config.ts
```

### Updating schema

```bash
npm run typeorm schema:sync -- -d typeOrm.config.ts
```

### Migrations

If you need to pass parameter with dash to npm script, you will need to add them after --. For example, if you need to generate, the command is like this:

```bash
$ npm run typeorm migration:generate -- -n migrationNameHere
```
