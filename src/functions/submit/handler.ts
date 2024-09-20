import { formatJSONError, formatJSONRedirect } from "@libs/api-gateway";
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
  const origin = event.headers.origin ?? "https://giginthe.garden";
  let parsedForm: URLSearchParams;
  let validatedForm: SafeParseReturnType<SubmitSchema, SubmitSchema>;

  /*
   * Validation
   */
  try {
    parsedForm = new URLSearchParams(event.body ?? "");
  } catch (error: any) {
    console.error("Failed to parse form data", error);
    return formatJSONError({
      error: true,
      message: "Failed to parse form data",
      details: error.message,
      body: event.body,
    });
  }

  validatedForm = submitSchema.safeParse(Object.fromEntries(parsedForm));
  if (!validatedForm.success) {
    console.error("Failed to validate form data", validatedForm.error);
    return formatJSONError({
      error: true,
      message: "Failed to validate form data",
      details: validatedForm.error.errors,
      body: event.body,
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
    return formatJSONError({
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
      existingItem.Item.anythingElse.S === validatedForm.data.anythingElse &&
      existingItem.Item.bellTent.BOOL === validatedForm.data.bellTent &&
      existingItem.Item.davidMascot.BOOL === validatedForm.data.davidMascot
    ) {
      return formatJSONRedirect(`${origin}/contact/no-change`);
    }

    const updateCommand = new UpdateItemCommand({
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        email: { S: validatedForm.data.email },
      },
      UpdateExpression:
        "SET #name = :name, adults = :adults, children = :children, anythingElse = :anythingElse, bellTent = :bellTent, davidMascot = :davidMascot, history = list_append(history, :history)",
      ExpressionAttributeNames: {
        "#name": "name",
      },
      ExpressionAttributeValues: {
        ":name": { S: validatedForm.data.name },
        ":adults": { N: validatedForm.data.adults?.toString() },
        ":children": { N: validatedForm.data.children?.toString() },
        ":anythingElse": { S: validatedForm.data.anythingElse },
        ":bellTent": { BOOL: validatedForm.data.bellTent },
        ":davidMascot": { BOOL: validatedForm.data.davidMascot },
        ":history": {
          L: [
            {
              M: {
                name: { S: existingItem.Item.name.S! },
                adults: { N: existingItem.Item.adults.N! },
                children: { N: existingItem.Item.children.N! },
                anythingElse: { S: existingItem.Item.anythingElse.S! },
                bellTent: { BOOL: existingItem.Item.bellTent.BOOL! },
                davidMascot: { BOOL: existingItem.Item.davidMascot.BOOL! },
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
      return formatJSONError({
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
        bellTent: { BOOL: validatedForm.data.bellTent },
        davidMascot: { BOOL: validatedForm.data.davidMascot },
        history: {
          L: [],
        },
      },
    });

    try {
      await dynamoClient.send(putCommand);
    } catch (error: any) {
      console.error("Failed to put item in DynamoDB", error);
      return formatJSONError({
        data: {
          error: true,
          message: "Failed to put item in DynamoDB",
          details: error.message,
        },
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
  return formatJSONRedirect(`${origin}/contact/success`);
};

export const main = middyfy(form);
