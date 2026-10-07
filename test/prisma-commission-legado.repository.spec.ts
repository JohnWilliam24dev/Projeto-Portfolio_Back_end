import { PrismaCommissionLegadoRepository } from '../src/commission-legado/persistence/prisma-commission-legado.repository';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { ImageStorage } from '../src/shared/storage/image-storage.port';

const arquivo = { buffer: Buffer.from('safe'), mimeType: 'image/jpeg', extension: 'jpg' };
const order = { nickname: 'Cliente', contact: '@c', modelType: 'chibi', additionalContentNotes: '', acessorios: 1, expressoesExtras: 0 };

function build(createImpl: (args: unknown) => Promise<unknown>) {
  const eventos: string[] = [];
  const storage: ImageStorage = {
    upload: async () => { eventos.push('upload'); return { url: 'https://cdn/x.jpg', publicId: 'commission/x' }; },
    remove: async (id) => { eventos.push(`remove:${id}`); },
  };
  const prisma = { commissionLegado: { create: async (args: unknown) => { eventos.push('banco'); return createImpl(args); } } } as unknown as PrismaService;
  return { repo: new PrismaCommissionLegadoRepository(prisma, storage), eventos };
}

describe('PrismaCommissionLegadoRepository', () => {
  it('sobe a imagem ANTES do banco e grava só a URL (e o publicId)', async () => {
    let dados: any;
    const { repo, eventos } = build(async (args) => { dados = args; });

    await repo.salvar('order-1', order, arquivo);

    expect(eventos).toEqual(['upload', 'banco']);
    expect(dados.data.imagemUrl).toBe('https://cdn/x.jpg');
    expect(dados.data.imagemPublicId).toBe('commission/x');
  });

  it('apaga a imagem órfã e lança erro se o banco falhar', async () => {
    const { repo, eventos } = build(async () => { throw new Error('db down'); });

    await expect(repo.salvar('order-1', order, arquivo)).rejects.toThrow();
    expect(eventos).toEqual(['upload', 'banco', 'remove:commission/x']);
  });
});
