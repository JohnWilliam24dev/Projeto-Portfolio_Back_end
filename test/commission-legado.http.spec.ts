import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import sharp from 'sharp';
import { CommissionLegadoModule } from '../src/commission-legado/commission-legado.module';
import { NOTIFICATION_GATEWAY } from '../src/commission-legado/notification/notification-gateway.port';
import { COMMISSION_LEGADO_REPOSITORY } from '../src/commission-legado/persistence/commission-legado-repository.port';
import { HttpExceptionFilter } from '../src/shared/filters/http-exception.filter';
import { PrismaService } from '../src/shared/prisma/prisma.service';

// Trava o CONTRATO HTTP que o site em produção consome: POST /commission, multipart/form-data,
// campos nickname/contact/modelType/additionalContentNotes/acessorios/expressoesExtras +
// arquivo `referenceFile`, resposta 201 { success, orderId }. Sobe a aplicação de verdade
// (controller, guard, ValidationPipe e filtro idênticos ao main.ts); só banco, Cloudinary e
// Telegram são trocados por fakes. Se alguém mexer na rota/contrato, é aqui que quebra.
const ORIGEM_PERMITIDA = 'https://site-do-artista.exemplo';

describe('POST /commission (contrato do site legado)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const salvos: unknown[] = [];
  const notificados: unknown[] = [];

  beforeAll(async () => {
    process.env.ALLOWED_ORIGINS = ORIGEM_PERMITIDA;

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), CommissionLegadoModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(COMMISSION_LEGADO_REPOSITORY)
      .useValue({ salvar: async (...args: unknown[]) => { salvos.push(args); } })
      .overrideProvider(NOTIFICATION_GATEWAY)
      .useValue({ notify: async (payload: unknown) => { notificados.push(payload); } })
      .compile();

    app = moduleRef.createNestApplication();
    // Mesma configuração global do main.ts.
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    salvos.length = 0;
    notificados.length = 0;
  });

  async function pedido(overrides: Record<string, string> = {}, arquivo?: { bytes: Uint8Array; tipo: string }) {
    const png = arquivo ?? {
      bytes: new Uint8Array(await sharp({ create: { width: 4, height: 4, channels: 3, background: '#ff0000' } }).png().toBuffer()),
      tipo: 'image/png',
    };
    const form = new FormData();
    const campos: Record<string, string> = {
      nickname: 'Cliente',
      contact: '@cliente',
      modelType: 'chibi',
      additionalContentNotes: 'Cabelo azul',
      acessorios: '2',
      expressoesExtras: '1',
      ...overrides,
    };
    for (const [nome, valor] of Object.entries(campos)) form.set(nome, valor);
    form.set('referenceFile', new Blob([new Uint8Array(png.bytes)], { type: png.tipo }), 'ref.png');
    return form;
  }

  const post = (form: FormData, origin?: string) =>
    fetch(`${baseUrl}/commission`, { method: 'POST', body: form, headers: origin ? { Origin: origin } : {} });

  it('aceita o pedido do site: 201 { success: true, orderId }, grava e notifica', async () => {
    const res = await post(await pedido(), ORIGEM_PERMITIDA);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ success: true, orderId: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    expect(salvos).toHaveLength(1);
    expect(notificados).toHaveLength(1);
  });

  it('o orderId devolvido é o mesmo gravado no banco e enviado ao Telegram', async () => {
    const res = await post(await pedido(), ORIGEM_PERMITIDA);
    const { orderId } = await res.json();

    expect((salvos[0] as unknown[])[0]).toBe(orderId);
    expect((notificados[0] as { orderId: string }).orderId).toBe(orderId);
  });

  it('recusa sem Origin (403) e não grava nem notifica', async () => {
    const res = await post(await pedido());

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Origem não permitida.' });
    expect(salvos).toHaveLength(0);
    expect(notificados).toHaveLength(0);
  });

  it('recusa Origin fora da lista (403)', async () => {
    const res = await post(await pedido(), 'https://site-de-terceiro.exemplo');

    expect(res.status).toBe(403);
    expect(salvos).toHaveLength(0);
  });

  it('recusa arquivo que não é imagem de verdade mesmo com mimetype image/png (400)', async () => {
    const falso = { bytes: new TextEncoder().encode('<script>alert(1)</script>'), tipo: 'image/png' };
    const res = await post(await pedido({}, falso), ORIGEM_PERMITIDA);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('PNG, JPEG ou WebP');
    expect(salvos).toHaveLength(0);
  });

  it('recusa honeypot preenchido (400) e campo desconhecido (400)', async () => {
    const bot = await post(await pedido({ website: 'http://spam.example' }), ORIGEM_PERMITIDA);
    const extra = await post(await pedido({ campoQueNaoExiste: 'x' }), ORIGEM_PERMITIDA);

    expect(bot.status).toBe(400);
    expect(extra.status).toBe(400);
    expect(salvos).toHaveLength(0);
  });

  it('recusa quantidade negativa/decimal em acessorios (400)', async () => {
    const negativa = await post(await pedido({ acessorios: '-1' }), ORIGEM_PERMITIDA);
    const decimal = await post(await pedido({ expressoesExtras: '1.5' }), ORIGEM_PERMITIDA);

    expect(negativa.status).toBe(400);
    expect(decimal.status).toBe(400);
  });
});
