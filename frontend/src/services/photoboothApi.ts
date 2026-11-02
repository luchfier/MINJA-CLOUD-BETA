import { IPhotoboothApi } from './api.interface';
import { httpPhotoboothApi } from './httpPhotoboothApi';

// 100% Real Fastify + PostgreSQL Backend API
export const photoboothApi: IPhotoboothApi = httpPhotoboothApi;
export { httpPhotoboothApi };

