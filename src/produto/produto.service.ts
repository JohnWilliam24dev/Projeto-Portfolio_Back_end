import { Inject, Injectable, Logger } from '@nestjs/common';
import { ValidationError } from '../shared/errors/domain.errors';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { ImageSanitizerService } from '../shared/image/image-sanitizer.service';
import { NOTIFICATION_GATEWAY, NotificationGateway } from './notification/notification-gateway.port';
import { PRODUTO_REPOSITORY, ProdutoRepository } from './persistence/produto-repository.port';
import { calcularValorAdicional, somarPrecoSimulado, AdicionalComPreco } from './pricing.util';

// Mesmo papel de sempre: orquestra validação -> precificação -> sanitização -> persistência
// -> notificação, sem saber que existe Prisma ou Telegram por trás das portas injetadas.
//
// Ordem deliberada (pedida explicitamente na revisão): o pedido é gravado no banco ANTES
// da notificação. O banco é a fonte da verdade — se o Telegram estiver fora do ar, o Guest
// já tem um token válido e o Maker só perde o aviso em tempo real, não o pedido em si.
@Injectable()
export class ProdutoService {
  private readonly logger = new Logger(ProdutoService.name);

  constructor(
    private readonly imageSanitizer: ImageSanitizerService,
    @Inject(PRODUTO_REPOSITORY) private readonly produtoRepository: ProdutoRepository,
    @Inject(NOTIFICATION_GATEWAY) private readonly notificationGateway: NotificationGateway,
  ) {}

  async submit(dto: CreateProdutoDto, referenceFile: Express.Multer.File): Promise<{ token: string }> {
    if (dto.website) throw new ValidationError('Pedido inválido.');

    const catalogo = await this.produtoRepository.buscarTipoProdutoComAdicionais(dto.tipoProdutoId);
    if (!catalogo) throw new ValidationError('Tipo de produto inválido.');

    // makerId nunca vem do cliente — é derivado do TipoProduto escolhido. Confiar em maker_id
    // enviado pelo front seria deixar qualquer Guest gravar um pedido em nome de outro Maker.
    const adicionaisResolvidos: AdicionalComPreco[] = dto.adicionais.map((selecionado) => {
      const regra = catalogo.adicionaisPermitidos.get(selecionado.tipoAdicionalId);
      if (!regra) throw new ValidationError('Um dos adicionais escolhidos não está disponível para este produto.');
      return {
        tipoAdicionalId: selecionado.tipoAdicionalId,
        nome: regra.nome,
        descricao: selecionado.descricao,
        valor: calcularValorAdicional(catalogo.precoMedio, regra),
      };
    });

    const precoSimulado = somarPrecoSimulado(catalogo.precoMedio, adicionaisResolvidos);
    const safeReferenceFile = await this.imageSanitizer.sanitize(referenceFile);

    // 1) Grava no banco. É aqui que o pedido passa a existir de fato.
    const pedido = await this.produtoRepository.criarPedido({
      makerId: catalogo.makerId,
      produtos: [
        {
          tipoProdutoId: catalogo.id,
          nomeCliente: dto.nomeCliente,
          contato: dto.contato,
          descricao: dto.descricao,
          precoSimulado,
          adicionais: adicionaisResolvidos.map(({ tipoAdicionalId, descricao }) => ({ tipoAdicionalId, descricao })),
        },
      ],
    });

    // 2) Só então notifica o Telegram, já trocando o UUID interno pelo token público.
    // Falha aqui vira log pro Maker resolver manualmente, não um 502 pro Guest — o pedido
    // já está salvo e devolver erro pra quem já foi atendido seria enganoso.
    try {
      await this.notificationGateway.notify({
        token: pedido.token,
        tipoProdutoNome: catalogo.nome,
        nomeCliente: dto.nomeCliente,
        contato: dto.contato,
        descricao: dto.descricao,
        adicionais: adicionaisResolvidos,
        precoSimulado,
        referenceFile: safeReferenceFile,
      });
    } catch (error) {
      this.logger.error(
        `Pedido ${pedido.token} gravado no banco, mas a notificação ao Maker falhou — checar manualmente.`,
        error instanceof Error ? error.stack : error,
      );
    }

    return { token: pedido.token };
  }
}
