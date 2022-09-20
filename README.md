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

To prevent production data lost, database schema synchronization is disable 
by default. To enable entities **auto-synchronization**, set the node environment to the following:

```bash
NODE_ENV=development
```

## TypeORM CLI

Since he TypeORM cli cannot read from the Nest app configuration, it requires a datasource file named `typeOrm.config.ts` located at the project root.

**Note:** The nestJs **autoLoadEntities** feature won't work here, therefore entities need to be manually registered. 

### Migrations

If you need to pass parameter with dash to npm script, you will need to add them after --. For example, if you need to generate, the command is like this:

```bash
$ npm run typeorm migration:generate -- -n migrationNameHere
```
