import { PrismaProdutoRepository } from '../src/produto/persistence/prisma-produto.repository';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { Prisma } from '../src/shared/prisma/prisma-client';
import { ImageStorage } from '../src/shared/storage/image-storage.port';

const arquivo = { buffer: Buffer.from('safe'), mimeType: 'image/jpeg', extension: 'jpg' };
const input = {
  makerId: 'maker-1',
  produtos: [{ tipoProdutoId: 't1', nomeCliente: 'C', contato: '@c', descricao: 'd', precoSimulado: new Prisma.Decimal(100), referenceFile: arquivo, adicionais: [] }],
};

function build(createImpl: () => Promise<unknown>) {
  const eventos: string[] = [];
  const storage: ImageStorage = {
    upload: async () => { eventos.push('upload'); return { url: 'https://cdn/p.jpg', publicId: 'produto/p' }; },
    remove: async (id) => { eventos.push(`remove:${id}`); },
  };
  let dados: any;
  const prisma = { pedido: { create: async (args: unknown) => { eventos.push('banco'); dados = args; return createImpl(); } } } as unknown as PrismaService;
  return { repo: new PrismaProdutoRepository(prisma, storage), eventos, dados: () => dados };
}

describe('PrismaProdutoRepository.criarPedido', () => {
  it('sobe a imagem antes do banco e grava a URL no Produto', async () => {
    const { repo, eventos, dados } = build(async () => ({ id: 'p1', token: 'AB12C', status: 'PENDENTE' }));

    const pedido = await repo.criarPedido(input);

    expect(pedido.token).toBe('AB12C');
    expect(eventos).toEqual(['upload', 'banco']);
    expect(dados().data.produtos.create[0].imagemUrl).toBe('https://cdn/p.jpg');
  });

  it('apaga a imagem órfã se o banco falhar', async () => {
    const { repo, eventos } = build(async () => { throw new Error('db down'); });

    await expect(repo.criarPedido(input)).rejects.toThrow();
    expect(eventos).toEqual(['upload', 'banco', 'remove:produto/p']);
  });
});
