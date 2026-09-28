import { Test } from '@nestjs/testing';
import { ProdutoFacade } from '../src/produto/produto.facade';
import { ProdutoService } from '../src/produto/produto.service';
import { ImageSanitizerService } from '../src/shared/image/image-sanitizer.service';
import { NOTIFICATION_GATEWAY } from '../src/produto/notification/notification-gateway.port';
import { PRODUTO_REPOSITORY } from '../src/produto/persistence/produto-repository.port';
import { CreateProdutoDto } from '../src/produto/dto/create-produto.dto';
import { Prisma } from '../src/shared/prisma/prisma-client';

// Este é o teste que representa o "contrato público" do módulo: chama a facade,
// exatamente como um consumidor de fora do módulo faria. ProdutoService continua
// tendo seu próprio spec (produto.service.spec.ts) cobrindo a orquestração interna;
// este aqui garante que a facade delega corretamente pro service.
describe('ProdutoFacade', () => {
  it('delega o pedido para o ProdutoService e devolve o token gerado no banco', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProdutoFacade,
        ProdutoService,
        { provide: ImageSanitizerService, useValue: { sanitize: async () => ({ buffer: Buffer.from('safe'), mimeType: 'image/jpeg', extension: 'jpg' }) } },
        {
          provide: PRODUTO_REPOSITORY,
          useValue: {
            buscarTipoProdutoComAdicionais: async () => ({
              id: 'tipo-produto-1',
              makerId: 'maker-1',
              nome: 'Modelo Chibi 3D',
              precoMedio: new Prisma.Decimal(100),
              adicionaisPermitidos: new Map(),
            }),
            criarPedido: async () => ({ id: 'pedido-uuid-interno', token: 'AB12C', status: 'PENDENTE' }),
          },
        },
        { provide: NOTIFICATION_GATEWAY, useValue: { notify: async () => {} } },
      ],
    }).compile();

    const facade = moduleRef.get(ProdutoFacade);
    const dto: CreateProdutoDto = {
      tipoProdutoId: 'tipo-produto-1',
      nomeCliente: 'Cliente',
      contato: '@cliente',
      descricao: 'Quero um chibi com cabelo azul',
      adicionais: [],
    } as CreateProdutoDto;

    const result = await facade.submitProduto(dto, {} as Express.Multer.File);

    expect(result).toEqual({ token: 'AB12C' });
  });
});
