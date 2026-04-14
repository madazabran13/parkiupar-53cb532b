export const typeDefs = `#graphql
  type Query {
    ocupacion(parkingId: ID!, desde: String!, hasta: String!): OcupacionResult
    topVehiculos(limit: Int): [VehiculoStats]
    ingresosPorParqueadero(parkingId: ID!, periodo: String!): IngresosResult
  }

  type Mutation {
    exportarReportePDF(filtros: FiltrosInput!): PDFResult
  }

  type OcupacionResult {
    parkingId: ID!
    totalReservas: Int!
    minutosPromedio: Float!
    ocupacionPorDia: [DiaStats]
  }

  type DiaStats {
    fecha: String!
    reservas: Int!
  }

  type VehiculoStats {
    vehiculoId: ID!
    placa: String!
    totalReservas: Int!
  }

  type IngresosResult {
    parkingId: ID!
    ingresoEstimado: Float!
    periodo: String!
  }

  type PDFResult {
    url: String!
    generadoEn: String!
  }

  input FiltrosInput {
    parkingId: ID
    desde: String
    hasta: String
  }
`;
