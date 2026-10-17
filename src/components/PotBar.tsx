import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STAGES, clampStage } from '@/layers/powersOfTen';

export interface PotSnapshot { index: number; position01: number; radius: number }
export function PotBar({ value, onStage }: { value: PotSnapshot; onStage: (i: number) => void }) {
  const i = clampStage(value.index);
  return <nav className="pot-bar" aria-label="Powers of Ten stages" data-radius={value.radius}>
    <div className="pot-caption">
      <Button id="pot-prev" variant="ghost" size="icon" disabled={i === 0} aria-label="Zoom to smaller scale" title="Smaller scale" onClick={() => onStage(i - 1)}><ChevronLeft /></Button>
      <span id="pot-prev-name">{STAGES[i - 1]?.label}</span>
      <strong id="pot-now">{STAGES[i]?.label}</strong>
      <span id="pot-next-name">{STAGES[i + 1]?.label}</span>
      <Button id="pot-next" variant="ghost" size="icon" disabled={i === 11} aria-label="Zoom to larger scale" title="Larger scale" onClick={() => onStage(i + 1)}><ChevronRight /></Button>
    </div>
    <p className="pot-blurb">{STAGES[i]?.blurb}</p>
    <div className="pot-track"><div id="pot-fill" style={{ width: `${value.position01 * 100}%` }} /><div id="pot-knob" style={{ left: `${value.position01 * 100}%` }} /></div>
    <div className="pot-ticks">{STAGES.map((s, bi) => <Button key={s.id} variant="ghost" className={`pot-tick${bi === i ? ' active' : ''}${Math.abs(bi-i) === 1 ? ' near' : ''}`} title={s.blurb} aria-label={`Zoom to ${s.label}`} aria-pressed={bi === i} onClick={() => onStage(bi)}><span className="pot-dot" /><span className="pot-label">{s.label}</span></Button>)}</div>
  </nav>;
}
