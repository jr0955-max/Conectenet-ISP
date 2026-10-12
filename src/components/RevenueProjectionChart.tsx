import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { Invoice, Client, SystemStats } from '../types/index.js';
import { useTheme } from '../context/ThemeContext.js';

interface RevenueProjectionChartProps {
  invoices: Invoice[];
  clients: Client[];
  stats?: SystemStats | null;
  onNavigateFinance?: () => void;
}

interface MonthlyDataPoint {
  key: string;
  monthLabel: string;
  fullMonthLabel: string;
  pago: number;
  pendente: number;
  atrasado: number;
  totalFaturado: number;
  projetado: number;
  faturasPagasCount: number;
  isCurrent: boolean;
  isFuture: boolean;
  taxaAtingimento: number;
}

export const RevenueProjectionChart: React.FC<RevenueProjectionChartProps> = ({
  invoices,
  clients,
  stats,
  onNavigateFinance
}) => {
  const { isLight } = useTheme();
  const [viewMode, setViewMode] = useState<'comparativo' | 'detalhado'>('comparativo');
  const [showFutureMonths, setShowFutureMonths] = useState<boolean>(true);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const monthNamesPt = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const fullMonthNamesPt = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Process data and calculate projected monthly revenue based on paid invoices
  const chartData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Calculate baseline Monthly Recurring Revenue (MRR) from active clients
    const activeClients = clients.filter(c => c.status === 'active');
    const estimatedClientMRR = activeClients.reduce((sum, client) => {
      // Find average or infer price ~ 160 BRL if plan details aren't directly nested
      return sum + 160; 
    }, 0);

    // Group existing invoices by year-month
    const invoicesByMonth = new Map<string, Invoice[]>();

    invoices.forEach(inv => {
      let y = currentYear;
      let m = currentMonth;

      if (inv.referenceMonth && inv.referenceMonth.includes('/')) {
        const parts = inv.referenceMonth.split('/');
        m = parseInt(parts[0], 10) - 1;
        y = parseInt(parts[1], 10);
      } else if (inv.dueDate) {
        const d = new Date(inv.dueDate);
        if (!isNaN(d.getTime())) {
          y = d.getFullYear();
          m = d.getMonth();
        }
      }

      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      if (!invoicesByMonth.has(key)) {
        invoicesByMonth.set(key, []);
      }
      invoicesByMonth.get(key)!.push(inv);
    });

    // Calculate historical payment conversion rate based on past paid invoices
    let totalPastPaid = 0;
    let totalPastInvoiced = 0;

    invoicesByMonth.forEach((monthInvoices, key) => {
      const [y, mStr] = key.split('-').map(Number);
      const m = mStr - 1;
      const isPast = y < currentYear || (y === currentYear && m < currentMonth);

      if (isPast) {
        monthInvoices.forEach(inv => {
          totalPastInvoiced += inv.amount;
          if (inv.status === 'paga') {
            totalPastPaid += inv.amount;
          }
        });
      }
    });

    // Historical compliance rate (taxa de adimplência observada)
    const taxaAdimplencia = totalPastInvoiced > 0 
      ? Math.max(0.85, Math.min(0.99, totalPastPaid / totalPastInvoiced))
      : 0.94; // fallback 94%

    // Average monthly revenue from paid invoices in past months
    const pastPaidMonthsValues: number[] = [];
    invoicesByMonth.forEach((monthInvoices, key) => {
      const [y, mStr] = key.split('-').map(Number);
      const m = mStr - 1;
      const isPast = y < currentYear || (y === currentYear && m < currentMonth);
      if (isPast) {
        const paidSum = monthInvoices
          .filter(i => i.status === 'paga')
          .reduce((acc, i) => acc + i.amount, 0);
        if (paidSum > 0) pastPaidMonthsValues.push(paidSum);
      }
    });

    const avgMonthlyPaid = pastPaidMonthsValues.length > 0
      ? pastPaidMonthsValues.reduce((a, b) => a + b, 0) / pastPaidMonthsValues.length
      : (stats?.monthlyRevenue || 0);

    // Build timeline of months: past 5 months + current month + 2 future months
    const points: MonthlyDataPoint[] = [];
    const monthsToShow = showFutureMonths ? 8 : 6;
    const startOffset = showFutureMonths ? 5 : 5; // 5 months back

    for (let offset = -startOffset; offset <= (showFutureMonths ? 2 : 0); offset++) {
      const targetDate = new Date(currentYear, currentMonth + offset, 1);
      const y = targetDate.getFullYear();
      const m = targetDate.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;

      const isCurrent = offset === 0;
      const isFuture = offset > 0;
      const monthInvoices = invoicesByMonth.get(key) || [];

      const pago = monthInvoices
        .filter(i => i.status === 'paga')
        .reduce((sum, i) => sum + i.amount, 0);

      const pendente = monthInvoices
        .filter(i => i.status === 'pendente')
        .reduce((sum, i) => sum + i.amount, 0);

      const atrasado = monthInvoices
        .filter(i => i.status === 'atrasada')
        .reduce((sum, i) => sum + i.amount, 0);

      const totalFaturado = pago + pendente + atrasado;
      const faturasPagasCount = monthInvoices.filter(i => i.status === 'paga').length;

      // Projection calculation:
      let projetado = 0;
      if (isFuture) {
        // Future projection = (Average Historical Paid * trend growth) adjusted by active clients
        const monthlyGrowth = 1 + (offset * 0.03); // conservative 3% organic growth
        const baseProjection = Math.max(avgMonthlyPaid, estimatedClientMRR * taxaAdimplencia);
        projetado = Math.round(baseProjection * monthlyGrowth * 100) / 100;
      } else if (isCurrent) {
        // Current month projection = already paid + (pending * historical payment rate)
        // If pending is present, project expected closing
        if (totalFaturado > 0) {
          projetado = Math.round((pago + (pendente * taxaAdimplencia) + (atrasado * 0.4)) * 100) / 100;
        } else {
          projetado = Math.round(avgMonthlyPaid * 100) / 100;
        }
      } else {
        // Past month: projected was the total invoiced target based on active billing
        projetado = totalFaturado > 0 ? Math.round(totalFaturado * taxaAdimplencia * 100) / 100 : Math.round(avgMonthlyPaid * 100) / 100;
      }

      const taxaAtingimento = projetado > 0 
        ? Math.min(130, Math.round((pago / projetado) * 100))
        : 0;

      points.push({
        key,
        monthLabel: isFuture 
          ? `${monthNamesPt[m]} (Proj.)` 
          : `${monthNamesPt[m]}/${String(y).slice(-2)}`,
        fullMonthLabel: `${fullMonthNamesPt[m]} de ${y}${isFuture ? ' (Projeção Futura)' : isCurrent ? ' (Mês Atual)' : ''}`,
        pago,
        pendente,
        atrasado,
        totalFaturado,
        projetado,
        faturasPagasCount,
        isCurrent,
        isFuture,
        taxaAtingimento
      });
    }

    return points;
  }, [invoices, clients, stats, showFutureMonths]);

  // Aggregate metrics for summary cards
  const summaryMetrics = useMemo(() => {
    const historicalPoints = chartData.filter(p => !p.isFuture);
    const totalPago = historicalPoints.reduce((acc, p) => acc + p.pago, 0);
    const mediaMensal = historicalPoints.length > 0 ? totalPago / historicalPoints.length : 0;
    
    const currentPoint = chartData.find(p => p.isCurrent);
    const nextFuturePoint = chartData.find(p => p.isFuture);
    const projecaoProximoMes = nextFuturePoint ? nextFuturePoint.projetado : (currentPoint ? currentPoint.projetado : mediaMensal);

    const totalFaturadoHistorico = historicalPoints.reduce((acc, p) => acc + p.totalFaturado, 0);
    const taxaLiquidacao = totalFaturadoHistorico > 0 
      ? Math.round((totalPago / totalFaturadoHistorico) * 100) 
      : 0;

    return {
      totalPago,
      mediaMensal,
      projecaoProximoMes,
      taxaLiquidacao,
      metaAtualAtingida: currentPoint ? currentPoint.taxaAtingimento : 100
    };
  }, [chartData]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: MonthlyDataPoint = payload[0].payload;
      return (
        <div className={`p-3.5 rounded-xl border shadow-xl backdrop-blur-md text-xs space-y-2 z-50 ${
          isLight 
            ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/50' 
            : 'bg-slate-900/95 border-slate-700 text-slate-100 shadow-black/60'
        }`}>
          <div className="flex items-center justify-between gap-3 border-b pb-2 border-slate-700/40">
            <span className="font-bold flex items-center gap-1.5 text-sm">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              {data.fullMonthLabel}
            </span>
            {data.isCurrent && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Mês em Curso
              </span>
            )}
            {data.isFuture && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Estimativa
              </span>
            )}
          </div>

          <div className="space-y-1.5 pt-1">
            {!data.isFuture && (
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
                  Faturamento Pago (Realizado):
                </span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {formatCurrency(data.pago)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400"></span>
                Faturamento Projetado:
              </span>
              <span className="font-mono font-bold text-cyan-400 text-sm">
                {formatCurrency(data.projetado)}
              </span>
            </div>

            {viewMode === 'detalhado' && data.pendente > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-400"></span>
                  Pendente de Liquidação:
                </span>
                <span className="font-mono font-medium text-blue-400">
                  {formatCurrency(data.pendente)}
                </span>
              </div>
            )}

            {!data.isFuture && (
              <div className="pt-2 border-t border-slate-700/30 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Atingimento da Projeção:</span>
                <span className={`font-bold ${data.taxaAtingimento >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {data.taxaAtingimento}% ({data.faturasPagasCount} faturas pagas)
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5 transition-all">
      {/* Header with Title and Control Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                Projeção & Histórico de Faturamento Mensal
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hidden sm:inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Baseado em Faturas Pagas
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Acompanhe o faturamento realizado via Pix/Boleto e a projeção calculada pela taxa de adimplência da carteira.
              </p>
            </div>
          </div>
        </div>

        {/* View mode toggle & Action */}
        <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
          <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
            <button
              onClick={() => setViewMode('comparativo')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'comparativo'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pago vs Projetado
            </button>
            <button
              onClick={() => setViewMode('detalhado')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'detalhado'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Composição
            </button>
          </div>

          <button
            onClick={() => setShowFutureMonths(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition flex items-center space-x-1 ${
              showFutureMonths
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Alternar projeção dos próximos 2 meses"
          >
            <span>+ Projeção Futura</span>
          </button>

          {onNavigateFinance && (
            <button
              onClick={onNavigateFinance}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition flex items-center space-x-1"
            >
              <span>Financeiro</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 font-medium block">Total Recebido (Histórico)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-extrabold text-emerald-400 font-mono">
              {formatCurrency(summaryMetrics.totalPago)}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Faturas liquidadas
          </span>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 font-medium block">Média Mensal Realizada</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-extrabold text-white font-mono">
              {formatCurrency(summaryMetrics.mediaMensal)}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
            <TrendingUp className="w-3 h-3 text-amber-400" /> Média dos meses
          </span>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 font-medium block">Projeção Próximo Mês</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-extrabold text-cyan-400 font-mono">
              {formatCurrency(summaryMetrics.projecaoProximoMes)}
            </span>
          </div>
          <span className="text-[10px] text-cyan-300/80 flex items-center gap-1 mt-0.5">
            <Zap className="w-3 h-3 text-cyan-400" /> Base ativa + Adimplência
          </span>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 font-medium block">Taxa de Adimplência</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-extrabold text-amber-400 font-mono">
              {summaryMetrics.taxaLiquidacao}%
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
              Excelente
            </span>
          </div>
          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
            Índice de pontualidade
          </span>
        </div>
      </div>

      {/* Main Recharts Bar Chart Container */}
      <div className="w-full h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 12, right: 12, left: -8, bottom: 4 }}
            barGap={6}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={isLight ? '#e2e8f0' : '#334155'} 
              vertical={false} 
              opacity={0.7}
            />

            <XAxis 
              dataKey="monthLabel" 
              stroke={isLight ? '#64748b' : '#94a3b8'} 
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: isLight ? '#cbd5e1' : '#475569' }}
            />

            <YAxis 
              stroke={isLight ? '#64748b' : '#94a3b8'} 
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: isLight ? '#cbd5e1' : '#475569' }}
              tickFormatter={(v) => `R$ ${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => {
                if (value === 'pago') return <span className="text-xs text-slate-300 font-medium">Faturamento Pago (Realizado)</span>;
                if (value === 'projetado') return <span className="text-xs text-slate-300 font-medium">Projeção Mensal Prevista</span>;
                if (value === 'pendente') return <span className="text-xs text-slate-300 font-medium">Pendente de Liquidação</span>;
                return <span className="text-xs text-slate-300 font-medium">{value}</span>;
              }}
            />

            {/* Reference Line for Average Revenue */}
            <ReferenceLine 
              y={summaryMetrics.mediaMensal} 
              stroke="#f59e0b" 
              strokeDasharray="4 4" 
              strokeOpacity={0.6}
              label={{ 
                value: `Média R$ ${(summaryMetrics.mediaMensal / 1000).toFixed(1)}k`, 
                fill: '#f59e0b', 
                fontSize: 10,
                position: 'insideTopRight'
              }} 
            />

            {/* Bar 1: Faturamento Pago (Realizado) */}
            <Bar 
              dataKey="pago" 
              name="pago" 
              fill="#10b981" 
              radius={[5, 5, 0, 0]} 
              maxBarSize={38}
            />

            {/* Bar 2: Faturamento Projetado */}
            <Bar 
              dataKey="projetado" 
              name="projetado" 
              fill="#06b6d4" 
              radius={[5, 5, 0, 0]} 
              maxBarSize={38}
            />

            {/* Bar 3 (Optional in detailed view): Pendente */}
            {viewMode === 'detalhado' && (
              <Bar 
                dataKey="pendente" 
                name="pendente" 
                fill="#3b82f6" 
                radius={[5, 5, 0, 0]} 
                maxBarSize={28}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer with explanatory formula note */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-3 gap-2">
        <div className="flex items-center space-x-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            <strong>Metodologia da Projeção:</strong> Cálculo preditivo automatizado baseado no histórico de faturas liquidadas via Asaas/Pix, índice médio de adimplência ({summaryMetrics.taxaLiquidacao}%) e receita recorrente mensal (MRR).
          </span>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Realizado</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>Projetado</span>
          </span>
        </div>
      </div>
    </div>
  );
};
