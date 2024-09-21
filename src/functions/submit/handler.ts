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
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { ErrorAware } from "./schema";
import { renderEmailTemplate } from "./email";
import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";

function validateForm(event: APIGatewayProxyEvent): ErrorAware<SubmitSchema> {
  let parsedForm: URLSearchParams;
  let validatedForm: SafeParseReturnType<SubmitSchema, SubmitSchema>;

  try {
    parsedForm = new URLSearchParams(event.body ?? "");
  } catch (error: any) {
    console.error("Failed to parse form data", error);
    return {
      error: true,
      message: "Failed to parse form data",
      details: error.message,
    };
  }

  validatedForm = submitSchema.safeParse(Object.fromEntries(parsedForm));
  if (!validatedForm.success) {
    console.error("Failed to validate form data", validatedForm.error);
    return {
      error: true,
      message: "Failed to validate form data",
      details: validatedForm.error.errors.toString(),
    };
  }

  return {
    data: validatedForm.data,
    error: false,
  };
}

async function updateDynamoDB(
  data: SubmitSchema
): Promise<ErrorAware<undefined>> {
  const dynamoClient = new DynamoDBClient({});
  const getCommand = new GetItemCommand({
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      email: { S: data.email },
    },
  });

  let existingItem: GetItemCommandOutput;
  try {
    existingItem = await dynamoClient.send(getCommand);
  } catch (error: any) {
    console.error("Failed to get item from DynamoDB", error);
    return {
      error: true,
      message: "Failed to get item from DynamoDB",
      details: error.message,
    };
  }

  // If item exists, update it but update the history field with the previous value
  if (existingItem.Item) {
    // First check if the item is already the same as the new form data, no need to update
    if (
      existingItem.Item.name.S === data.name &&
      parseInt(existingItem.Item.adults.N!) === data.adults &&
      parseInt(existingItem.Item.children.N!) === data.children &&
      existingItem.Item.anythingElse.S === data.anythingElse &&
      existingItem.Item.bellTent.BOOL === data.bellTent &&
      existingItem.Item.davidMascot.BOOL === data.davidMascot
    ) {
      return {
        error: true,
        message: "No change in form data",
      };
    }

    const updateCommand = new UpdateItemCommand({
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        email: { S: data.email },
      },
      UpdateExpression:
        "SET #name = :name, adults = :adults, children = :children, anythingElse = :anythingElse, bellTent = :bellTent, davidMascot = :davidMascot, history = list_append(history, :history)",
      ExpressionAttributeNames: {
        "#name": "name",
      },
      ExpressionAttributeValues: {
        ":name": { S: data.name },
        ":adults": { N: data.adults?.toString() },
        ":children": { N: data.children?.toString() },
        ":anythingElse": { S: data.anythingElse },
        ":bellTent": { BOOL: data.bellTent },
        ":davidMascot": { BOOL: data.davidMascot },
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
      return {
        error: true,
        message: "Failed to update item in DynamoDB",
        details: error.message,
      };
    }
  } else {
    const putCommand = new PutItemCommand({
      TableName: process.env.DYNAMODB_TABLE,
      Item: {
        email: { S: data.email },
        name: { S: data.name },
        adults: { N: data.adults.toString() },
        children: { N: data.children.toString() },
        anythingElse: { S: data.anythingElse },
        bellTent: { BOOL: data.bellTent },
        davidMascot: { BOOL: data.davidMascot },
        history: {
          L: [],
        },
      },
    });

    try {
      await dynamoClient.send(putCommand);
    } catch (error: any) {
      return {
        error: true,
        message: "Failed to put item in DynamoDB",
        details: error.message,
      };
    }
  }

  return {
    error: false,
    data: undefined,
  };
}

async function updateGoogleSheets(
  data: SubmitSchema
): Promise<ErrorAware<undefined>> {
  const jwt = new JWT({
    email: process.env.GOOGLE_SA_EMAIL,
    key: process.env.GOOGLE_SA_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, jwt);
  await doc.loadInfo(); // loads sheets

  const sheet = doc.sheetsByTitle["Website Form Responses"];
  const rows = await sheet.getRows<GSheetFormSchema>();
  const row = rows.find((r) => r.get("email") === data.email);

  if (row) {
    row.assign({ ...data, paid: "No" });
  } else {
    await sheet.addRow({ ...data, paid: "No" });
  }

  return {
    error: false,
    data: undefined,
  };
}

async function sendSNSNotification(
  data: SubmitSchema
): Promise<ErrorAware<undefined>> {
  const snsClient = new SNSClient({});
  const snsCommand = new PublishCommand({
    TopicArn: process.env.SNS_TOPIC_ARN,
    Message: `New form submission from ${data.name} <${data.email}> with ${data.adults} adults and ${data.children} children`,
  });

  try {
    await snsClient.send(snsCommand);
  } catch (error: any) {
    console.error("Failed to send SNS message", error);
    return {
      error: true,
      message: "Failed to send SNS message",
      details: error.message,
    };
  }

  return {
    error: false,
    data: undefined,
  };
}

async function emailConfirmation(
  data: SubmitSchema
): Promise<ErrorAware<undefined>> {
  const sesClient = new SESClient({});
  const paymentAmount = data.adults * 12 + data.children * 5;
  const renderedTemplate = renderEmailTemplate({
    ...data,
    paymentAmount,
  });

  const emailCommand = new SendEmailCommand({
    Destination: {
      ToAddresses: [data.email],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: renderedTemplate,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Gig in the Garden Booking Confirmation",
      },
    },
    Source: "Gig in the Garden <hello@giginthe.garden>",
  });

  try {
    await sesClient.send(emailCommand);
  } catch (error: any) {
    console.error("Failed to send email confirmation", error);
    return {
      error: true,
      message: "Failed to send email confirmation",
      details: error.message,
    };
  }

  return {
    error: false,
    data: undefined,
  };
}

const form = async (event: APIGatewayProxyEvent) => {
  const origin = event.headers.origin ?? "https://giginthe.garden";

  // Validation
  const validateResult = validateForm(event);
  if (validateResult.error) {
    return formatJSONError(validateResult);
  }

  // DynamoDB
  const dynamoResult = await updateDynamoDB(validateResult.data);
  if (dynamoResult.error) {
    if (dynamoResult.message === "No change in form data")
      return formatJSONRedirect(`${origin}/register/no-change`);
    else return formatJSONError(dynamoResult);
  }

  // Google Sheets
  const sheetsResult = await updateGoogleSheets(validateResult.data);
  if (sheetsResult.error) {
    return formatJSONError(sheetsResult);
  }

  // SNS
  const snsResult = await sendSNSNotification(validateResult.data);
  if (snsResult.error) {
    return formatJSONError(snsResult);
  }

  // Email
  const emailResult = await emailConfirmation(validateResult.data);
  if (emailResult.error) {
    return formatJSONError(emailResult);
  }

  // Response
  return formatJSONRedirect(`${origin}/register/success`);
};

export const main = middyfy(form);
