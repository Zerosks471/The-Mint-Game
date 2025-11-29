import { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  LineData,
  Time,
  AreaSeries,
} from 'lightweight-charts';
import { formatCurrency } from '@mint/utils';

interface PricePoint {
  time: number;
  price: number;
}

interface IPOChartProps {
  priceHistory: PricePoint[];
  ipoPrice: number;
  currentPrice: number;
  isPositive: boolean;
}

export function IPOChart({ priceHistory, ipoPrice, currentPrice, isPositive }: IPOChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#1e293b',
      },
      rightPriceScale: {
        borderColor: '#1e293b',
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: isPositive ? '#22c55e' : '#ef4444',
          width: 1,
          style: 2,
          labelBackgroundColor: isPositive ? '#22c55e' : '#ef4444',
        },
        horzLine: {
          color: isPositive ? '#22c55e' : '#ef4444',
          width: 1,
          style: 2,
          labelBackgroundColor: isPositive ? '#22c55e' : '#ef4444',
        },
      },
    });

    chartRef.current = chart;

    const lineColor = isPositive ? '#22c55e' : '#ef4444';
    const topColor = isPositive ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';

    const series = chart.addSeries(AreaSeries, {
      lineColor,
      topColor,
      bottomColor: 'rgba(0, 0, 0, 0)',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => formatCurrency(price),
      },
    });

    seriesRef.current = series;

    // Add IPO price line
    series.createPriceLine({
      price: ipoPrice,
      color: '#6366f1',
      lineWidth: 1,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: 'IPO',
    });

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [ipoPrice, isPositive]);

  // Update chart data
  useEffect(() => {
    if (!seriesRef.current || priceHistory.length === 0) return;

    const chartData: LineData[] = priceHistory.map((point) => ({
      time: point.time as Time,
      value: point.price,
    }));

    seriesRef.current.setData(chartData);

    if (chartRef.current && chartData.length > 0) {
      chartRef.current.timeScale().fitContent();
    }
  }, [priceHistory]);

  // Update colors when trend changes
  useEffect(() => {
    if (!seriesRef.current) return;

    const lineColor = isPositive ? '#22c55e' : '#ef4444';
    const topColor = isPositive ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';

    seriesRef.current.applyOptions({
      lineColor,
      topColor,
    });
  }, [isPositive]);

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden">
      <div ref={chartContainerRef} />
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-indigo-500" style={{ borderStyle: 'dashed' }} />
            <span className="text-slate-400">IPO Price</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-slate-400">Current</span>
          </div>
        </div>
        <div className={`font-mono font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {formatCurrency(currentPrice)}
        </div>
      </div>
    </div>
  );
}
