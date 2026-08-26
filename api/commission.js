import { createCommissionController } from '../src/factories/createCommissionController.js';

export const config = { api: { bodyParser: false } };

const controller = createCommissionController();

export default function handler(request, response) {
  return controller.handle(request, response);
}
