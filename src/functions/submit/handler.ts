import { formatJSONResponse } from "@libs/api-gateway";
import { middyfy } from "@libs/lambda";
import { APIGatewayProxyEvent } from "aws-lambda";
import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
  PutItemCommand,
  GetItemCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { SubmitSchema, submitSchema } from "./schema";
import { SafeParseReturnType } from "zod";

const form = async (event: APIGatewayProxyEvent) => {
  // Try to decode x-www-form-urlencoded body to object, return error if failed. Log it for debugging.
  let parsedForm: URLSearchParams;
  let validatedForm: SafeParseReturnType<SubmitSchema, SubmitSchema>;

  /*
   * Validation
   */
  try {
    parsedForm = new URLSearchParams(event.body);
  } catch (error) {
    console.error("Failed to parse form data", error);
    return formatJSONResponse({
      error: true,
      message: "Failed to parse form data",
      details: error.message,
    });
  }

  validatedForm = submitSchema.safeParse(Object.fromEntries(parsedForm));
  if (!validatedForm.success) {
    console.error("Failed to validate form data", validatedForm.error);
    return formatJSONResponse({
      error: true,
      message: "Failed to validate form data",
      details: validatedForm.error.errors,
    });
  }

  /*
   * DynamoDB
   */
  const dynamoClient = new DynamoDBClient({});
  const getCommand = new GetItemCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      email: { S: validatedForm.data.email },
    },
  });

  let existingItem: GetItemCommandOutput;
  try {
    existingItem = await dynamoClient.send(getCommand);
  } catch (error) {
    console.error("Failed to get item from DynamoDB", error);
    return formatJSONResponse({
      error: true,
      message: "Failed to get item from DynamoDB",
      details: error.message,
    });
  }

  // If item exists, update it but update the history field with the previous value
  if (existingItem.Item) {
    // First check if the item is already the same as the new form data, no need to update
    if (
      existingItem.Item.name.S === validatedForm.data.name &&
      parseInt(existingItem.Item.adults.N) === validatedForm.data.adults &&
      parseInt(existingItem.Item.children.N) === validatedForm.data.children &&
      existingItem.Item["anything-else"].S ===
        validatedForm.data["anything-else"]
    ) {
      return formatJSONResponse({
        message: "No changes detected",
      });
    }

    const updateCommand = new UpdateItemCommand({
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        email: { S: validatedForm.data.email },
      },
      UpdateExpression:
        "SET #name = :name, adults = :adults, children = :children, #anythingElse = :anythingElse, history = list_append(history, :history)",
      ExpressionAttributeNames: {
        "#name": "name",
        "#anythingElse": "anything-else",
      },
      ExpressionAttributeValues: {
        ":name": { S: validatedForm.data.name },
        ":adults": { N: validatedForm.data.adults.toString() },
        ":children": { N: validatedForm.data.children.toString() },
        ":anythingElse": { S: validatedForm.data["anything-else"] },
        ":history": {
          L: [
            {
              M: {
                name: { S: existingItem.Item.name.S },
                adults: { N: existingItem.Item.adults.N },
                children: { N: existingItem.Item.children.N },
                "anything-else": { S: existingItem.Item["anything-else"].S },
                replacedAt: { S: new Date().toISOString() },
              },
            },
          ],
        },
      },
    });

    try {
      await dynamoClient.send(updateCommand);
    } catch (error) {
      console.error("Failed to update item in DynamoDB", error);
      return formatJSONResponse({
        error: true,
        message: "Failed to update item in DynamoDB",
        details: error.message,
      });
    }
  } else {
    const putCommand = new PutItemCommand({
      TableName: process.env.DYNAMODB_TABLE,
      Item: {
        email: { S: validatedForm.data.email },
        name: { S: validatedForm.data.name },
        adults: { N: validatedForm.data.adults.toString() },
        children: { N: validatedForm.data.children.toString() },
        "anything-else": { S: validatedForm.data["anything-else"] },
        history: {
          L: [],
        },
      },
    });

    try {
      await dynamoClient.send(putCommand);
    } catch (error) {
      console.error("Failed to put item in DynamoDB", error);
      return formatJSONResponse({
        error: true,
        message: "Failed to put item in DynamoDB",
        details: error.message,
      });
    }
  }

  /*
   * Response
   */
  return formatJSONResponse({
    message: "Form submitted",
  });
};

export const main = middyfy(form);
