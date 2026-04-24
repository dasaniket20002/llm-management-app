export type ServerFnSuccess<TMessage extends SuccessMessages, TData> = {
  success: true
  message: TMessage
  data: TData
}

export type ServerFnError<
  TError extends ErrorMessages,
  TData extends { message: string },
> = {
  success: false
  error: TError
  data: TData
}

export function serverFnSuccessResponse<
  TMessage extends SuccessMessages,
  TData,
>(message: TMessage, data: TData): ServerFnSuccess<TMessage, TData> {
  return {
    success: true,
    message,
    data,
  }
}

export function serverFnErrorResponse<
  TError extends ErrorMessages,
  TData extends { message: string },
>(error: TError, data: TData): ServerFnError<TError, TData> {
  return {
    success: false,
    error,
    data,
  }
}

type ErrorMessages =
  | 'Validation Error'
  | 'Unauthorized'
  | 'Not Found'
  | 'Internal Error'
  | (string & {})

type SuccessMessages =
  | 'Success'
  | 'Found'
  | 'Created'
  | 'Deleted'
  | 'Updated'
  | (string & {})
