import { Request } from 'express';

export const captureRawBody = (
  req: Request & { rawBody?: string },
  _res: any,
  buf: Buffer,
) => {
  req.rawBody = buf && buf.length ? buf.toString('utf8') : '';
};
