import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { CatalogoModule } from '../src/catalogo/catalogo.module';
import { ADICIONAL_REPOSITORY } from '../src/catalogo/persistence/adicional-repository.port';
import { CATALOGO_PUBLICO_REPOSITORY } from '../src/catalogo/persistence/catalogo-publico-repository.port';
import { TIPO_PRODUTO_REPOSITORY } from '../src/catalogo/persistence/tipo-produto-repository.port';
import { gerarSegredoApiKey, hashSegredoApiKey, montarApiKey } from '../src/shared/auth/api-key.util';
import { HttpExceptionFilter } from '../src/shared/filters/http-exception.filter';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { criarCatalogoEmMemoria } from './helpers/catalogo-memoria';

// Sobe a aplicação de verdade (ApiKeyGuard, AllowedOriginGuard, ValidationPipe e filtro idênticos ao
// main.ts) e faz requisições HTTP reais. Só o armazenamento é em memória; o isolamento contra o banco
// real é provado nos testes de integração.
const ORIGEM = 'https://site-do-artista.exemplo';

describe('Catálogo: rotas do painel (API key) e vitrine pública (Origin)', () => {
  let app: INestApplication;
  let baseUrl: string;

  const makerA = randomUUID();
  const makerB = randomUUID();
  const segredoA = gerarSegredoApiKey();
  const segredoB = gerarSegredoApiKey();
  const keyA = montarApiKey(makerA, segredoA);
  const keyB = montarApiKey(makerB, segredoB);
  const memoria = criarCatalogoEmMemoria([makerA, makerB]);

  beforeAll(async () => {
    process.env.ALLOWED_ORIGINS = ORIGEM;
    const hashes = new Map<string, string>([[makerA, hashSegredoApiKey(segredoA)], [makerB, hashSegredoApiKey(segredoB)]]);

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), CatalogoModule],
    })
      // só o que o ApiKeyGuard consulta: id + hash do segredo
      .overrideProvider(PrismaService)
      .useValue({ maker: { findUnique: async ({ where }: { where: { id: string } }) => (hashes.has(where.id) ? { id: where.id, apiKeySecretHash: hashes.get(where.id) } : null) } })
      .overrideProvider(TIPO_PRODUTO_REPOSITORY).useValue(memoria.tipoRepo)
      .overrideProvider(ADICIONAL_REPOSITORY).useValue(memoria.adicionalRepo)
      .overrideProvider(CATALOGO_PUBLICO_REPOSITORY).useValue(memoria.publicoRepo)
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

  const painel = (metodo: string, caminho: string, key: string | null, corpo?: unknown) =>
    fetch(`${baseUrl}${caminho}`, {
      method: metodo,
      headers: { ...(key ? { 'x-api-key': key } : {}), ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  const json = async (res: Response) => res.json();

  const criarTipo = async (key: string, corpo: Record<string, unknown> = { nome: 'Chibi', precoBase: 100 }) => json(await painel('POST', '/tipos-produto', key, corpo));
  const criarAdicional = async (key: string, corpo: Record<string, unknown>) => json(await painel('POST', '/adicionais', key, corpo));

  describe('autenticação do painel', () => {
    it.each([
      ['GET', '/tipos-produto'],
      ['POST', '/tipos-produto'],
      ['PATCH', `/tipos-produto/${randomUUID()}`],
      ['DELETE', `/tipos-produto/${randomUUID()}`],
      ['PUT', `/tipos-produto/${randomUUID()}/adicionais`],
      ['GET', '/adicionais'],
      ['POST', '/adicionais'],
      ['PATCH', `/adicionais/${randomUUID()}`],
      ['DELETE', `/adicionais/${randomUUID()}`],
    ])('%s %s sem API key responde 401', async (metodo, caminho) => {
      expect((await painel(metodo, caminho, null, metodo === 'GET' ? undefined : {})).status).toBe(401);
    });

    it('chave com segredo errado, formato inválido e Maker inexistente: 401', async () => {
      expect((await painel('GET', '/tipos-produto', montarApiKey(makerA, gerarSegredoApiKey()))).status).toBe(401);
      expect((await painel('GET', '/tipos-produto', 'sem-ponto')).status).toBe(401);
      expect((await painel('GET', '/tipos-produto', montarApiKey(randomUUID(), segredoA))).status).toBe(401);
    });

    it('as rotas do painel NÃO exigem Origin (app do Maker não é o site)', async () => {
      expect((await painel('GET', '/tipos-produto', keyA)).status).toBe(200);
    });
  });

  describe('tipos de produto', () => {
    it('cria (201), lista, edita e desabilita', async () => {
      const criado = await painel('POST', '/tipos-produto', keyA, { nome: '  Modelo   Básico ', precoBase: 59.9 });
      expect(criado.status).toBe(201);
      const tipo = await json(criado);
      expect(tipo).toMatchObject({ nome: 'Modelo Básico', precoBase: '59.90', habilitado: true, adicionalIds: [] });

      const edit = await painel('PATCH', `/tipos-produto/${tipo.id}`, keyA, { precoBase: 70, habilitado: false });
      expect(edit.status).toBe(200);
      expect(await json(edit)).toMatchObject({ precoBase: '70.00', habilitado: false });

      const lista = await json(await painel('GET', '/tipos-produto', keyA));
      expect(lista.map((t: { id: string }) => t.id)).toContain(tipo.id);
    });

    it.each([
      ['preço negativo', { nome: 'x', precoBase: -1 }],
      ['preço com 3 casas', { nome: 'x', precoBase: 1.234 }],
      ['preço como texto', { nome: 'x', precoBase: '10' }],
      ['nome vazio', { nome: '  ', precoBase: 1 }],
      ['campo desconhecido', { nome: 'x', precoBase: 1, lixo: true }],
    ])('recusa %s (400)', async (_nome, corpo) => {
      expect((await painel('POST', '/tipos-produto', keyA, corpo)).status).toBe(400);
    });

    it('NÃO aceita makerId no body: o dono vem só da API key (400 e nada criado)', async () => {
      const antes = (await json(await painel('GET', '/tipos-produto', keyB))).length;
      const res = await painel('POST', '/tipos-produto', keyA, { nome: 'Invasão', precoBase: 1, makerId: makerB });

      expect(res.status).toBe(400);
      expect((await json(await painel('GET', '/tipos-produto', keyB))).length).toBe(antes);
    });

    it('PATCH vazio é 400; id que não é UUID e id inexistente respondem 404', async () => {
      const tipo = await criarTipo(keyA);
      expect((await painel('PATCH', `/tipos-produto/${tipo.id}`, keyA, {})).status).toBe(400);
      expect((await painel('PATCH', '/tipos-produto/nao-e-uuid', keyA, { nome: 'x' })).status).toBe(404);
      expect((await painel('PATCH', `/tipos-produto/${randomUUID()}`, keyA, { nome: 'x' })).status).toBe(404);
    });
  });

  describe('isolamento entre Makers', () => {
    it('Maker B não vê, não edita, não exclui nem vincula nada do Maker A: tudo 404, e o recurso segue intacto', async () => {
      const tipo = await criarTipo(keyA, { nome: 'Só do A', precoBase: 100 });
      const adicional = await criarAdicional(keyA, { nome: 'Só do A', precoFixo: 5 });

      const listaB = await json(await painel('GET', '/tipos-produto', keyB));
      expect(listaB.map((t: { id: string }) => t.id)).not.toContain(tipo.id);
      expect((await json(await painel('GET', '/adicionais', keyB))).map((a: { id: string }) => a.id)).not.toContain(adicional.id);

      expect((await painel('PATCH', `/tipos-produto/${tipo.id}`, keyB, { nome: 'HACK' })).status).toBe(404);
      expect((await painel('DELETE', `/tipos-produto/${tipo.id}`, keyB)).status).toBe(404);
      expect((await painel('PUT', `/tipos-produto/${tipo.id}/adicionais`, keyB, { adicionalIds: [] })).status).toBe(404);
      expect((await painel('PATCH', `/adicionais/${adicional.id}`, keyB, { nome: 'HACK' })).status).toBe(404);
      expect((await painel('DELETE', `/adicionais/${adicional.id}`, keyB)).status).toBe(404);

      const doA = (await json(await painel('GET', '/tipos-produto', keyA))).find((t: { id: string }) => t.id === tipo.id);
      expect(doA.nome).toBe('Só do A');
    });

    it('não dá pra vincular a um tipo do A um adicional do B: 404 e o conjunto não muda', async () => {
      const tipo = await criarTipo(keyA);
      const meu = await criarAdicional(keyA, { nome: 'meu', precoFixo: 1 });
      const alheio = await criarAdicional(keyB, { nome: 'alheio', precoFixo: 1 });

      expect((await painel('PUT', `/tipos-produto/${tipo.id}/adicionais`, keyA, { adicionalIds: [meu.id] })).status).toBe(200);
      expect((await painel('PUT', `/tipos-produto/${tipo.id}/adicionais`, keyA, { adicionalIds: [meu.id, alheio.id] })).status).toBe(404);

      const atual = (await json(await painel('GET', '/tipos-produto', keyA))).find((t: { id: string }) => t.id === tipo.id);
      expect(atual.adicionalIds).toEqual([meu.id]);
    });
  });

  describe('vínculo tipo <-> adicionais (PUT substitui o conjunto)', () => {
    it('grava, substitui, deduplica e desvincula tudo com lista vazia', async () => {
      const tipo = await criarTipo(keyA);
      const a1 = await criarAdicional(keyA, { nome: 'a1', precoFixo: 1 });
      const a2 = await criarAdicional(keyA, { nome: 'a2', precoFixo: 2 });

      const r1 = await json(await painel('PUT', `/tipos-produto/${tipo.id}/adicionais`, keyA, { adicionalIds: [a1.id, a2.id] }));
      expect([...r1.adicionalIds].sort()).toEqual([a1.id, a2.id].sort());
      const r2 = await json(await painel('PUT', `/tipos-produto/${tipo.id}/adicionais`, keyA, { adicionalIds: [a2.id, a2.id] }));
      expect(r2.adicionalIds).toEqual([a2.id]);
      expect((await json(await painel('PUT', `/tipos-produto/${tipo.id}/adicionais`, keyA, { adicionalIds: [] }))).adicionalIds).toEqual([]);
    });

    it('recusa ids que não são UUID (400) e adicional inexistente (404)', async () => {
      const tipo = await criarTipo(keyA);
      expect((await painel('PUT', `/tipos-produto/${tipo.id}/adicionais`, keyA, { adicionalIds: ['x'] })).status).toBe(400);
      expect((await painel('PUT', `/tipos-produto/${tipo.id}/adicionais`, keyA, { adicionalIds: [randomUUID()] })).status).toBe(404);
    });
  });

  describe('adicionais', () => {
    it('cria com preço fixo OU com porcentagem; sem regra ou com as duas é 400', async () => {
      const fixo = await painel('POST', '/adicionais', keyA, { nome: 'Fixo', precoFixo: 20 });
      const pct = await painel('POST', '/adicionais', keyA, { nome: 'Pct', porcentagem: 10 });
      expect(fixo.status).toBe(201);
      expect(await json(fixo)).toMatchObject({ precoFixo: '20.00', porcentagem: null, habilitado: true });
      expect(await json(pct)).toMatchObject({ precoFixo: null, porcentagem: '10.00' });

      expect((await painel('POST', '/adicionais', keyA, { nome: 'Nada' })).status).toBe(400);
      expect((await painel('POST', '/adicionais', keyA, { nome: 'Dois', precoFixo: 1, porcentagem: 1 })).status).toBe(400);
    });

    it('trocar a regra de preço zera a outra; informar as duas na edição é 400', async () => {
      const ad = await criarAdicional(keyA, { nome: 'Troca', precoFixo: 20 });

      const trocado = await json(await painel('PATCH', `/adicionais/${ad.id}`, keyA, { porcentagem: 15 }));
      expect(trocado).toMatchObject({ precoFixo: null, porcentagem: '15.00' });
      expect((await painel('PATCH', `/adicionais/${ad.id}`, keyA, { precoFixo: 1, porcentagem: 1 })).status).toBe(400);
    });

    it('porcentagem acima do limite da coluna (999,99) é 400', async () => {
      expect((await painel('POST', '/adicionais', keyA, { nome: 'x', porcentagem: 1000 })).status).toBe(400);
    });
  });

  describe('exclusão', () => {
    it('tipo e adicional livres: 204 sem corpo, e somem da listagem', async () => {
      const tipo = await criarTipo(keyA);
      const ad = await criarAdicional(keyA, { nome: 'livre', precoFixo: 1 });

      const t = await painel('DELETE', `/tipos-produto/${tipo.id}`, keyA);
      const a = await painel('DELETE', `/adicionais/${ad.id}`, keyA);

      expect([t.status, a.status]).toEqual([204, 204]);
      expect(await t.text()).toBe('');
      expect((await json(await painel('GET', '/tipos-produto', keyA))).map((x: { id: string }) => x.id)).not.toContain(tipo.id);
    });

    it('tipo e adicional JÁ USADOS em pedidos: 409 pedindo pra desabilitar, e nada é excluído', async () => {
      const tipo = await criarTipo(keyA);
      const ad = await criarAdicional(keyA, { nome: 'usado', precoFixo: 1 });
      memoria.emUso.tipos.add(tipo.id);
      memoria.emUso.adicionais.add(ad.id);

      const t = await painel('DELETE', `/tipos-produto/${tipo.id}`, keyA);
      const a = await painel('DELETE', `/adicionais/${ad.id}`, keyA);

      expect([t.status, a.status]).toEqual([409, 409]);
      expect((await json(t)).error).toContain('Desabilite');
      expect((await painel('PATCH', `/tipos-produto/${tipo.id}`, keyA, { habilitado: false })).status).toBe(200);
    });
  });

  describe('vitrine pública: GET /makers/:id/catalogo', () => {
    it('mostra só tipos habilitados e adicionais vinculados e habilitados, com o valor unitário já calculado', async () => {
      const ativo = await criarTipo(keyB, { nome: 'Vitrine-Ativo', precoBase: 100.5 });
      const inativo = await criarTipo(keyB, { nome: 'Vitrine-Inativo', precoBase: 10, habilitado: false });
      const fixo = await criarAdicional(keyB, { nome: 'V-Fixo', precoFixo: 20 });
      const pct = await criarAdicional(keyB, { nome: 'V-Pct', porcentagem: 1 });
      const off = await criarAdicional(keyB, { nome: 'V-Off', precoFixo: 7, habilitado: false });
      await painel('PUT', `/tipos-produto/${ativo.id}/adicionais`, keyB, { adicionalIds: [fixo.id, pct.id, off.id] });
      await painel('PUT', `/tipos-produto/${inativo.id}/adicionais`, keyB, { adicionalIds: [fixo.id] });

      const res = await fetch(`${baseUrl}/makers/${makerB}/catalogo`, { headers: { Origin: ORIGEM } });

      expect(res.status).toBe(200);
      const { tipos } = await res.json();
      const vitrine = tipos.find((t: { id: string }) => t.id === ativo.id);
      expect(tipos.map((t: { id: string }) => t.id)).not.toContain(inativo.id);
      expect(vitrine.precoBase).toBe('100.50');
      expect(vitrine.adicionais.map((a: { nome: string; valorUnitario: string }) => [a.nome, a.valorUnitario])).toEqual([
        ['V-Fixo', '20.00'],
        ['V-Pct', '1.01'], // 1% de 100,50 = 1,005 -> ROUND_HALF_UP
      ]);
    });

    it('não vaza nada de outro Maker nem campos internos', async () => {
      await criarTipo(keyA, { nome: 'Segredo-do-A-123', precoBase: 1 });
      const corpo = await (await fetch(`${baseUrl}/makers/${makerB}/catalogo`, { headers: { Origin: ORIGEM } })).text();

      expect(corpo).not.toContain('Segredo-do-A-123');
      for (const proibido of ['makerId', 'habilitado', 'criadoEm', makerA]) expect(corpo).not.toContain(proibido);
    });

    it('exige Origin permitida: 403 sem Origin e com origem de terceiro', async () => {
      expect((await fetch(`${baseUrl}/makers/${makerB}/catalogo`)).status).toBe(403);
      expect((await fetch(`${baseUrl}/makers/${makerB}/catalogo`, { headers: { Origin: 'https://terceiro.exemplo' } })).status).toBe(403);
    });

    it('Maker inexistente e id que não é UUID respondem 404', async () => {
      const get = (id: string) => fetch(`${baseUrl}/makers/${id}/catalogo`, { headers: { Origin: ORIGEM } });
      expect((await get(randomUUID())).status).toBe(404);
      expect((await get('nao-e-uuid')).status).toBe(404);
    });
  });
});
