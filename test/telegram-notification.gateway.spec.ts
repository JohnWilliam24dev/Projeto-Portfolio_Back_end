import { formatLegenda } from '../src/commission/notification/telegram-notification.gateway';
import { NotifyPayload } from '../src/commission/commission.types';
import { TELEGRAM_CAPTION_LIMIT } from '../src/config/commission.config';
import { Prisma } from '../src/shared/prisma/prisma-client';

const D = (valor: string | number) => new Prisma.Decimal(valor);

const payload = (overrides: Partial<NotifyPayload> = {}): NotifyPayload => ({
  token: 'AB23C',
  tipoProdutoNome: 'Modelo Chibi 3D',
  nomeCliente: 'Cliente',
  contato: '@cliente',
  descricao: 'Quero um chibi com cabelo azul',
  adicionais: [{ adicionalId: 'a1', nome: 'Asas', quantidade: 2, descricaoCliente: 'Asas de dragão', valorUnitario: D(20) }],
  precoSimulado: D(140),
  referenceFile: { buffer: Buffer.from('x'), mimeType: 'image/jpeg', extension: 'jpg' },
  ...overrides,
});

describe('formatLegenda', () => {
  it('traz token, cliente, contato, tipo, valor, descrição e os adicionais com quantidade e valor unitário', () => {
    const legenda = formatLegenda(payload());

    expect(legenda).toContain('Novo pedido #AB23C');
    expect(legenda).toContain('Cliente: Cliente');
    expect(legenda).toContain('Contato: @cliente');
    expect(legenda).toContain('Tipo: Modelo Chibi 3D');
    expect(legenda).toContain('Valor simulado: R$ 140.00');
    expect(legenda).toContain('• Asas x2: Asas de dragão (R$ 20.00 cada)');
  });

  it('inclui o e-mail só quando informado, e "Nenhum" quando não há adicionais', () => {
    expect(formatLegenda(payload())).not.toContain('E-mail');
    expect(formatLegenda(payload({ email: 'c@exemplo.com' }))).toContain('E-mail: c@exemplo.com');
    expect(formatLegenda(payload({ adicionais: [] }))).toContain('Adicionais:\nNenhum');
  });

  it('respeita o limite de legenda do Telegram e sacrifica o texto longo, não os dados do pedido', () => {
    const legenda = formatLegenda(payload({ descricao: 'x'.repeat(5_000) }));

    expect(Array.from(legenda).length).toBeLessThanOrEqual(TELEGRAM_CAPTION_LIMIT);
    expect(legenda).toContain('Novo pedido #AB23C');
    expect(legenda).toContain('Contato: @cliente');
    expect(legenda).toContain('Valor simulado: R$ 140.00');
    expect(legenda.endsWith('…')).toBe(true);
  });

  it('corta por code point: nunca parte um emoji ao meio', () => {
    const legenda = formatLegenda(payload({ descricao: '😀'.repeat(2_000) }));

    expect(Array.from(legenda).length).toBeLessThanOrEqual(TELEGRAM_CAPTION_LIMIT);
    expect(Buffer.from(legenda, 'utf8').toString('utf8')).toBe(legenda);
    expect(legenda).not.toContain('\uFFFD');
  });

  it('legenda curta passa intacta (sem reticências)', () => {
    expect(formatLegenda(payload()).endsWith('…')).toBe(false);
  });
});
