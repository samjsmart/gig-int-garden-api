import type { AWS } from "@serverless/typescript";

import submit from "@functions/submit";

const serverlessConfiguration: AWS = {
  service: "giginthegarden-api",
  frameworkVersion: "3",
  plugins: ["serverless-esbuild"],
  provider: {
    name: "aws",
    region: "eu-west-1",
    runtime: "nodejs20.x",
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      NODE_OPTIONS: "--enable-source-maps --stack-trace-limit=1000",
      DYNAMODB_TABLE: "giginthegarden-form-submissions",
      GOOGLE_SA_EMAIL: "${ssm:/gitg/gsheet/email}",
      GOOGLE_SA_KEY: "${ssm:/gitg/gsheet/key}",
      GOOGLE_SHEET_ID: "1O5dUpi6eNKIR6yI8ErjLZLKBmZcfxebV-DmItxr56Sc",
    },
    iamRoleStatements: [
      {
        Effect: "Allow",
        Action: [
          "dynamodb:DescribeTable",
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
        ],
        Resource:
          "arn:aws:dynamodb:${self:provider.region}:*:table/${self:provider.environment.DYNAMODB_TABLE}",
      },
    ],
  },
  // import the function via paths
  functions: { submit },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ["aws-sdk"],
      target: "node20",
      define: { "require.resolve": undefined },
      platform: "node",
      concurrency: 10,
    },
  },
  resources: {
    Resources: {
      GiginthegardenTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          TableName: "giginthegarden-form-submissions",
          AttributeDefinitions: [
            {
              AttributeName: "email",
              AttributeType: "S",
            },
          ],
          KeySchema: [
            {
              AttributeName: "email",
              KeyType: "HASH",
            },
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
          },
        },
      },
    },
  },
};

module.exports = serverlessConfiguration;
