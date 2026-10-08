import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { CommissionModule } from '../src/commission/commission.module';
import { NOTIFICATION_GATEWAY } from '../src/commission/notification/notification-gateway.port';
import {
  COMMISSION_CONSULTA_REPOSITORY,
  COMMISSION_REPOSITORY,
  CriarCommissionInput,
  TipoProdutoCatalogo,
} from '../src/commission/persistence/commission-repository.port';
import { HttpExceptionFilter } from '../src/shared/filters/http-exception.filter';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { Prisma } from '../src/shared/prisma/prisma-client';

// Sobe a aplicação de verdade (controller, AllowedOriginGuard, ValidationPipe e filtro idênticos ao
// main.ts, multer incluso) e faz requisições HTTP reais. Só banco, Cloudinary e Telegram são fakes.
const ORIGEM_PERMITIDA = 'https://site-do-artista.exemplo';
const D = (valor: string | number) => new Prisma.Decimal(valor);

const TIPO_ID = randomUUID();
const TIPO_DESABILITADO_ID = randomUUID();
const AD_FIXO = randomUUID(); // R$ 20 fixo
const AD_PCT = randomUUID(); // 10% do preço base
const AD_DESABILITADO = randomUUID();
const AD_DE_OUTRO_TIPO = randomUUID(); // existe no sistema, mas não vinculado a este tipo

const catalogo = new Map<string, TipoProdutoCatalogo>([
  [
    TIPO_ID,
    {
      id: TIPO_ID,
      makerId: 'maker-1',
      nome: 'Modelo Chibi 3D',
      precoBase: D(100),
      habilitado: true,
      adicionaisVinculados: new Map([
        [AD_FIXO, { nome: 'Asas', habilitado: true, precoFixo: D(20), porcentagem: null }],
        [AD_PCT, { nome: 'Cenário', habilitado: true, precoFixo: null, porcentagem: D(10) }],
        [AD_DESABILITADO, { nome: 'Antigo', habilitado: false, precoFixo: D(5), porcentagem: null }],
      ]),
    },
  ],
  [TIPO_DESABILITADO_ID, { id: TIPO_DESABILITADO_ID, makerId: 'maker-1', nome: 'Descontinuado', precoBase: D(50), habilitado: false, adicionaisVinculados: new Map() }],
]);

describe('POST /commissions e GET /commissions/token/:token (fluxo novo)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const criados: CriarCommissionInput[] = [];
  const notificados: Array<{ token: string }> = [];

  beforeAll(async () => {
    process.env.ALLOWED_ORIGINS = ORIGEM_PERMITIDA;

    const repositorioFake = {
      buscarTipoProdutoComAdicionais: async (id: string) => catalogo.get(id) ?? null,
      criar: async (input: CriarCommissionInput) => {
        criados.push(input);
        return { id: randomUUID(), token: 'AB23C' };
      },
      buscarPublicaPorToken: async (token: string) =>
        token === 'AB23C'
          ? { status: 'Fila', tipoProduto: 'Modelo Chibi 3D', precoSimulado: D(150), orcamentoFinal: D('175.5'), criadoEm: new Date('2026-10-07T12:00:00Z') }
          : null,
    };

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), CommissionModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(COMMISSION_REPOSITORY)
      .useValue(repositorioFake)
      .overrideProvider(COMMISSION_CONSULTA_REPOSITORY)
      .useValue(repositorioFake)
      .overrideProvider(NOTIFICATION_GATEWAY)
      .useValue({ notify: async (payload: { token: string }) => { notificados.push(payload); } })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    criados.length = 0;
    notificados.length = 0;
  });

  async function pedido(
    overrides: Record<string, unknown> = {},
    arquivo?: { bytes: Uint8Array; tipo: string },
  ) {
    const imagem = arquivo ?? {
      bytes: new Uint8Array(await sharp({ create: { width: 4, height: 4, channels: 3, background: '#0000ff' } }).png().toBuffer()),
      tipo: 'image/png',
    };
    const campos: Record<string, unknown> = {
      tipoProdutoId: TIPO_ID,
      nomeCliente: 'Cliente',
      contato: '@cliente',
      descricao: 'Quero um chibi com cabelo azul',
      adicionais: [
        { adicionalId: AD_FIXO, quantidade: 2, descricaoCliente: 'Asas de dragão' },
        { adicionalId: AD_PCT, quantidade: 1, descricaoCliente: 'Floresta' },
      ],
      ...overrides,
    };
    const form = new FormData();
    for (const [nome, valor] of Object.entries(campos)) {
      if (valor === undefined) continue;
      form.set(nome, typeof valor === 'string' ? valor : JSON.stringify(valor));
    }
    form.set('referenceFile', new Blob([new Uint8Array(imagem.bytes)], { type: imagem.tipo }), 'ref.png');
    return form;
  }

  const post = (form: FormData, origin: string | null = ORIGEM_PERMITIDA) =>
    fetch(`${baseUrl}/commissions`, { method: 'POST', body: form, headers: origin ? { Origin: origin } : {} });
  const get = (caminho: string, origin: string | null = ORIGEM_PERMITIDA) =>
    fetch(`${baseUrl}/commissions/token/${caminho}`, { headers: origin ? { Origin: origin } : {} });

  describe('POST /commissions', () => {
    it('aceita o pedido: 201 { success, token }, com preço calculado no servidor, grava e notifica', async () => {
      const res = await post(await pedido());

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ success: true, token: 'AB23C' });
      expect(criados).toHaveLength(1);
      expect(criados[0].makerId).toBe('maker-1');
      expect(criados[0].precoSimulado.toFixed(2)).toBe('150.00'); // 100 + 2x20 + 10% de 100
      expect(notificados).toEqual([expect.objectContaining({ token: 'AB23C' })]);
    });

    it('aceita pedido sem adicionais e com e-mail em branco', async () => {
      const res = await post(await pedido({ adicionais: undefined, email: '' }));

      expect(res.status).toBe(201);
      expect(criados[0].precoSimulado.toFixed(2)).toBe('100.00');
      expect(criados[0].email).toBeUndefined();
    });

    it('ignora qualquer preço enviado pelo cliente: o valor vem sempre do catálogo', async () => {
      const res = await post(await pedido({ precoSimulado: '1.00' }));

      // campo desconhecido é recusado (whitelist + forbidNonWhitelisted); nunca chega a influenciar o preço
      expect(res.status).toBe(400);
      expect(criados).toHaveLength(0);
    });

    it('recusa sem Origin (403) e com origem fora da lista (403), sem gravar nem notificar', async () => {
      const semOrigem = await post(await pedido(), null);
      const deTerceiro = await post(await pedido(), 'https://site-de-terceiro.exemplo');

      expect(semOrigem.status).toBe(403);
      expect(await semOrigem.json()).toEqual({ error: 'Origem não permitida.' });
      expect(deTerceiro.status).toBe(403);
      expect(criados).toHaveLength(0);
      expect(notificados).toHaveLength(0);
    });

    it.each([
      ['tipo de produto desabilitado', { tipoProdutoId: TIPO_DESABILITADO_ID }, 'Tipo de produto inválido.'],
      ['tipo de produto inexistente', { tipoProdutoId: randomUUID() }, 'Tipo de produto inválido.'],
      ['adicional não vinculado ao tipo', { adicionais: [{ adicionalId: AD_DE_OUTRO_TIPO, quantidade: 1, descricaoCliente: 'x' }] }, 'adicionais escolhidos'],
      ['adicional desabilitado', { adicionais: [{ adicionalId: AD_DESABILITADO, quantidade: 1, descricaoCliente: 'x' }] }, 'adicionais escolhidos'],
      [
        'adicional repetido',
        {
          adicionais: [
            { adicionalId: AD_FIXO, quantidade: 1, descricaoCliente: 'a' },
            { adicionalId: AD_FIXO, quantidade: 1, descricaoCliente: 'b' },
          ],
        },
        'adicionais escolhidos',
      ],
    ])('recusa %s (400)', async (_nome, overrides, trechoDoErro) => {
      const res = await post(await pedido(overrides));

      expect(res.status).toBe(400);
      expect(String((await res.json()).error)).toContain(trechoDoErro);
      expect(criados).toHaveLength(0);
      expect(notificados).toHaveLength(0);
    });

    it.each([
      ['quantidade zero', { adicionais: [{ adicionalId: AD_FIXO, quantidade: 0, descricaoCliente: 'x' }] }],
      ['quantidade acima do teto', { adicionais: [{ adicionalId: AD_FIXO, quantidade: 21, descricaoCliente: 'x' }] }],
      ['quantidade decimal', { adicionais: [{ adicionalId: AD_FIXO, quantidade: 1.5, descricaoCliente: 'x' }] }],
      ['e-mail inválido', { email: 'nao-e-email' }],
      ['honeypot preenchido', { website: 'http://spam.example' }],
      ['adicionais com JSON malformado', { adicionais: '{not valid json' }],
      ['tipoProdutoId que não é UUID', { tipoProdutoId: 'nao-e-uuid' }],
    ])('recusa %s (400)', async (_nome, overrides) => {
      const res = await post(await pedido(overrides));

      expect(res.status).toBe(400);
      expect(criados).toHaveLength(0);
    });

    it('recusa arquivo que não é imagem de verdade, mesmo com mimetype image/png (400)', async () => {
      const falso = { bytes: new TextEncoder().encode('<script>alert(1)</script>'), tipo: 'image/png' };
      const res = await post(await pedido({}, falso));

      expect(res.status).toBe(400);
      expect(String((await res.json()).error)).toContain('PNG, JPEG ou WebP');
      expect(criados).toHaveLength(0);
    });
  });

  describe('GET /commissions/token/:token', () => {
    it('devolve só os campos públicos', async () => {
      const res = await get('AB23C');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        status: 'Fila',
        tipoProduto: 'Modelo Chibi 3D',
        precoSimulado: '150.00',
        orcamentoFinal: '175.50',
        criadoEm: '2026-10-07T12:00:00.000Z',
      });
      for (const proibido of ['contato', 'email', 'imagem', 'nomeCliente', 'descricao', 'makerId']) {
        expect(JSON.stringify(body).toLowerCase()).not.toContain(proibido.toLowerCase());
      }
    });

    it('aceita o token em minúsculas (quem digita à mão)', async () => {
      expect((await get('ab23c')).status).toBe(200);
    });

    it('token inexistente e token malformado respondem 404 IDÊNTICO', async () => {
      const inexistente = await get('ZZ99Z');
      const malformado = await get('x');

      expect(inexistente.status).toBe(404);
      expect(malformado.status).toBe(404);
      expect(await inexistente.json()).toEqual({ error: 'Pedido não encontrado.' });
      expect(await malformado.json()).toEqual({ error: 'Pedido não encontrado.' });
    });

    it('exige Origin permitida (403 sem Origin e com origem de terceiro)', async () => {
      expect((await get('AB23C', null)).status).toBe(403);
      expect((await get('AB23C', 'https://site-de-terceiro.exemplo')).status).toBe(403);
    });
  });
});
