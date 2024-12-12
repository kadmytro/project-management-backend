export function getErrorDetails(error: unknown) {
  const isDevelopment = process.env.NODE_ENV === "development";

  if (error instanceof Error) {
    return {
      message: error.message,
      ...(isDevelopment && { stack: error.stack }),
    };
  } else {
    return {
      message: "Unknown error",
      error: String(error),
    };
  }
}
