import { greetings } from "@/server/modules/greet/api";
import { clients } from "@/server/modules/client/api";
import {
  accounts,
  transactions,
  payees,
  categories,
  bulkApproveLabels,
  correctLabel,
} from "@/server/modules/transaction/api";
import { createSchema, createYoga } from "graphql-yoga";

const { handleRequest } = createYoga({
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        greetings: String
        clients(search: String): [Client!]!
        accounts(clientId: Int!): [Account!]!
        transactions(clientId: Int!, accountId: Int): [Transaction!]!
        payees(clientId: Int!): [QbPayee!]!
        categories(clientId: Int!): [QbCategory!]!
      }

      type Mutation {
        bulkApproveLabels(labelIds: [Int!]!): Int!
        correctLabel(
          labelId: Int!
          payeeId: Int
          categories: [CategoryInput!]
          txPairId: Int
        ): TransactionLabel!
      }

      input CategoryInput {
        qbCategoryId: Int!
        amount: Int!
      }

      type Client {
        id: Int!
        name: String!
      }

      type Account {
        id: Int!
        name: String!
      }

      type Transaction {
        id: Int!
        amount: Int!
        date: String!
        bankDescription: String!
        qbId: String!
        account: Account!
        activeLabel: TransactionLabel
      }

      type TransactionLabel {
        id: Int!
        payee: QbPayee
        categorization: [CategoryLabel!]!
        txPair: PairedTransaction
        isCorrect: Boolean
        isCorrection: Boolean!
        incorrectLabel: TransactionLabel
      }

      type PairedTransaction {
        id: Int!
        bankDescription: String!
        amount: Int!
      }

      type CategoryLabel {
        id: Int!
        category: QbCategory!
        amount: Int!
      }

      type QbCategory {
        id: Int!
        name: String!
      }

      type QbPayee {
        id: Int!
        name: String!
      }
    `,
    resolvers: {
      Query: {
        greetings,
        clients,
        accounts,
        transactions,
        payees,
        categories,
      },
      Mutation: {
        bulkApproveLabels,
        correctLabel,
      },
    },
  }),

  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response },
});

const handler = (request: Request) => handleRequest(request, {});

export {
  handler as GET,
  handler as POST,
  handler as OPTIONS,
};
