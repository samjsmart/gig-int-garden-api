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
import { GSheetFormSchema, SubmitSchema, submitSchema } from "./schema";
import { SafeParseReturnType } from "zod";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

const form = async (event: APIGatewayProxyEvent) => {
  let parsedForm: URLSearchParams;
  let validatedForm: SafeParseReturnType<SubmitSchema, SubmitSchema>;

  /*
   * Validation
   */
  try {
    parsedForm = new URLSearchParams(event.body ?? "");
  } catch (error: any) {
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
  } catch (error: any) {
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
      parseInt(existingItem.Item.adults.N!) === validatedForm.data.adults &&
      parseInt(existingItem.Item.children.N!) === validatedForm.data.children &&
      existingItem.Item.anythingElse.S === validatedForm.data.anythingElse
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
        "SET #name = :name, adults = :adults, children = :children, anythingElse = :anythingElse, history = list_append(history, :history)",
      ExpressionAttributeNames: {
        "#name": "name",
      },
      ExpressionAttributeValues: {
        ":name": { S: validatedForm.data.name },
        ":adults": { N: validatedForm.data.adults?.toString() },
        ":children": { N: validatedForm.data.children?.toString() },
        ":anythingElse": { S: validatedForm.data.anythingElse },
        ":history": {
          L: [
            {
              M: {
                name: { S: existingItem.Item.name.S! },
                adults: { N: existingItem.Item.adults.N! },
                children: { N: existingItem.Item.children.N! },
                anythingElse: { S: existingItem.Item.anythingElse.S! },
                replacedAt: { S: new Date().toISOString() },
              },
            },
          ],
        },
      },
    });

    try {
      await dynamoClient.send(updateCommand);
    } catch (error: any) {
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
        anythingElse: { S: validatedForm.data.anythingElse },
        history: {
          L: [],
        },
      },
    });

    try {
      await dynamoClient.send(putCommand);
    } catch (error: any) {
      console.error("Failed to put item in DynamoDB", error);
      return formatJSONResponse({
        error: true,
        message: "Failed to put item in DynamoDB",
        details: error.message,
      });
    }
  }

  /*
   * Google Sheets
   */
  const jwt = new JWT({
    email: process.env.GOOGLE_SA_EMAIL,
    key: process.env.GOOGLE_SA_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, jwt);
  await doc.loadInfo(); // loads sheets

  const sheet = doc.sheetsByTitle["Website Form Responses"];
  const rows = await sheet.getRows<GSheetFormSchema>();
  const row = rows.find((r) => r.get("email") === validatedForm.data.email);

  if (row) {
    row.assign({ ...validatedForm.data, paid: "No" });
  } else {
    await sheet.addRow({ ...validatedForm.data, paid: "No" });
  }

  /*
   * Response
   */
  return formatJSONResponse({
    message: "Form submitted",
    docTitle: doc.title,
  });
};

export const main = middyfy(form);
