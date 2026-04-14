/**
 * MS-Reportes — Apollo Server 4 standalone (NO Express).
 */
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema/typeDefs.js';
import { resolvers } from './resolvers/reportes.resolvers.js';

const PORT = Number(process.env.PORT) || 3005;
const isDev = process.env.NODE_ENV !== 'production';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: isDev,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: PORT, host: '0.0.0.0' },
});

console.log(`[MS-REPORTES] GraphQL server ready at ${url}`);
