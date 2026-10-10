import { Inject, Injectable, Logger } from '@nestjs/common';
import { ValidationError } from '../shared/errors/domain.errors';
import { ImageSanitizerService } from '../shared/image/image-sanitizer.service';
import { AdicionalDoPedido } from './commission.types';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { AdicionalSelecionadoDto } from './dto/adicional-selecionado.dto';
import { NOTIFICATION_GATEWAY, NotificationGateway } from './notification/notification-gateway.port';
import { COMMISSION_REPOSITORY, CommissionRepository, TipoProdutoCatalogo } from './persistence/commission-repository.port';
import { calcularPrecoSimulado, calcularValorUnitario } from '../shared/pricing/pricing.util';

// Orquestra o pedido público (SGA 5.7): validação de regra -> precificação NO SERVIDOR ->
// sanitização -> persistência -> notificação. Não sabe que existem Prisma, Cloudinary ou Telegram.
//
// O pedido é gravado ANTES da notificação: o banco é a fonte da verdade. Se o Telegram estiver
// fora do ar, o cliente já tem token válido e o Maker só perde o aviso em tempo real.
@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(
    private readonly imageSanitizer: ImageSanitizerService,
    @Inject(COMMISSION_REPOSITORY) private readonly repository: CommissionRepository,
    @Inject(NOTIFICATION_GATEWAY) private readonly notificationGateway: NotificationGateway,
  ) {}

  async submit(dto: CreateCommissionDto, referenceFile: Express.Multer.File): Promise<{ token: string }> {
    if (dto.website) throw new ValidationError('Pedido inválido.');

    const tipo = await this.repository.buscarTipoProdutoComAdicionais(dto.tipoProdutoId);
    // Mesma mensagem pra "não existe" e "desabilitado": não revela o que existe no catálogo.
    if (!tipo || !tipo.habilitado) throw new ValidationError('Tipo de produto inválido.');

    // makerId nunca vem do cliente: é derivado do tipo escolhido (tipo.makerId).
    const adicionais = this.resolverAdicionais(dto.adicionais, tipo);
    const precoSimulado = calcularPrecoSimulado(tipo.precoBase, adicionais);
    const safeReferenceFile = await this.imageSanitizer.sanitize(referenceFile);

    const commission = await this.repository.criar({
      makerId: tipo.makerId,
      tipoProdutoId: tipo.id,
      nomeCliente: dto.nomeCliente,
      contato: dto.contato,
      email: dto.email,
      descricao: dto.descricao,
      precoSimulado,
      referenceFile: safeReferenceFile,
      adicionais: adicionais.map(({ adicionalId, quantidade, descricaoCliente, valorUnitario }) => ({
        adicionalId,
        quantidade,
        descricaoCliente,
        valorUnitario,
      })),
    });

    // Falha aqui vira log pro Maker resolver, não erro pro cliente: o pedido já está salvo e
    // devolver erro a quem já foi atendido seria enganoso.
    try {
      await this.notificationGateway.notify({
        token: commission.token,
        tipoProdutoNome: tipo.nome,
        nomeCliente: dto.nomeCliente,
        contato: dto.contato,
        email: dto.email,
        descricao: dto.descricao,
        adicionais,
        precoSimulado,
        referenceFile: safeReferenceFile,
      });
    } catch (error) {
      this.logger.error(
        `Pedido ${commission.token} gravado no banco, mas a notificação ao Maker falhou — checar manualmente.`,
        error instanceof Error ? error.stack : error,
      );
    }

    return { token: commission.token };
  }

  // Cada adicional precisa estar vinculado ao tipo, habilitado e sem repetição (a repetição é
  // expressa por `quantidade`). Qualquer violação usa a mesma mensagem genérica.
  private resolverAdicionais(selecionados: AdicionalSelecionadoDto[], tipo: TipoProdutoCatalogo): AdicionalDoPedido[] {
    const jaVistos = new Set<string>();

    return selecionados.map((selecionado) => {
      const adicional = tipo.adicionaisVinculados.get(selecionado.adicionalId);
      if (!adicional || !adicional.habilitado || jaVistos.has(selecionado.adicionalId)) {
        throw new ValidationError('Um dos adicionais escolhidos não está disponível para este produto.');
      }
      jaVistos.add(selecionado.adicionalId);

      return {
        adicionalId: selecionado.adicionalId,
        nome: adicional.nome,
        quantidade: selecionado.quantidade,
        descricaoCliente: selecionado.descricaoCliente,
        valorUnitario: calcularValorUnitario(tipo.precoBase, adicional),
      };
    });
  }
}
