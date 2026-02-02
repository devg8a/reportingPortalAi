import { Response } from 'express';

interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
}

export function returnResponse<T>(
  res: Response,
  options: {
    statusCode: number;
    success: boolean;
    message: string;
    data?: T;
  }
): Response {
  const { statusCode, success, message, data } = options;

  return res.status(statusCode).json({
    success,
    statusCode,
    message,
    data: data ?? null,
  });
}
