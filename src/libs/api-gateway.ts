import { APIGatewayProxyResult } from "aws-lambda";

export type JSONResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  data?: Record<string, unknown>;
};

export const formatJSONError = (
  data: Record<string, unknown>
): APIGatewayProxyResult => {
  return {
    statusCode: 500,
    body: JSON.stringify(data),
  };
};

export const formatJSONRedirect = (url: string): APIGatewayProxyResult => {
  return {
    statusCode: 302,
    headers: {
      Location: url,
    },
    body: "",
  };
};
