export interface IApiResponse<T> {
  data: T;
  message: string;
  status: number;
  success: boolean;
}
