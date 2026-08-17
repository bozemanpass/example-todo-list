import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'todoapp',
  process.env.DB_USER || 'postgres',
  // The same name the postgres container reads: the stack declares POSTGRES_PASSWORD
  // a secret, so one generated value reaches both containers.  The default is only
  // for running outside a stack deployment against a hand-started database.
  process.env.POSTGRES_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
  }
);

export default sequelize;