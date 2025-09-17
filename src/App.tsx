
import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Download, Calendar as CalendarIcon, Shuffle, Upload } from 'lucide-react'

function fmtDate(d: Date) { return d.toISOString().slice(0,10) }
function addDays(d: Date, n: number) { const dd = new Date(d); dd.setDate(dd.getDate()+n); return dd }
function isSameDay(a: Date, b: Date) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate() }
function range(start: number, endExclusive: number, step=1) { const out:number[]=[]; for(let i=start;i<endExclusive;i+=step) out.push(i); return out }

function mondaysBetween(startDate: string, endDate: string) {
  const start = new Date(startDate); const end = new Date(endDate);
  const d = new Date(start); while (d.getDay()!==1) d.setDate(d.getDate()+1);
  const mondays: Date[] = []; while (d <= end) { mondays.push(new Date(d)); d.setDate(d.getDate()+7); } return mondays;
}
function weekWorkdays(weekStart: Date) { return range(0,5).map(i=>addDays(weekStart, i)) }

function build980Dates(pattern: string, windowStart: string, windowEnd: string) {
  if (!pattern || pattern==='None') return new Set<string>();
  const anchors: Record<string,string> = { 'Monday A':'2025-10-13','Monday B':'2025-10-06','Friday A':'2025-10-10','Friday B':'2025-10-03' }
  const out = new Set<string>(); const start = new Date(windowStart); const end = new Date(windowEnd); let d = new Date(anchors[pattern])
  while (d > start) d = addDays(d, -14); while (d <= end) { if (d >= start) out.add(fmtDate(d)); d = addDays(d,14) } return out
}

type Attorney = { name: string; pattern: string; conflicts: Set<string> }
type Assign = { weekStart: Date; name: string; flags?: string[] }

function generateSchedule(attorneys: Attorney[]) {
  const WINDOW_START='2025-10-01', WINDOW_END='2025-12-31'
  let weeks = mondaysBetween(WINDOW_START, WINDOW_END)
  const targetWeeks = attorneys.length*2
  if (weeks.length < targetWeeks) {
    const pre = new Date('2025-09-29'); if (!weeks.find(w=>isSameDay(w, pre))) weeks.unshift(pre)
    if (weeks.length < targetWeeks) { const post=new Date('2026-01-05'); if(!weeks.find(w=>isSameDay(w, post))) weeks.push(post) }
  }
  const windowStart='2025-09-29', windowEnd='2026-01-10'
  const people = attorneys.map(a=>({ name:a.name, pattern:a.pattern, conflicts:new Set(a.conflicts), nine80s:build980Dates(a.pattern, windowStart, windowEnd), assigned:[] as Date[], need:2 }))

  function score(person:any, weekStart:Date) {
    const days = weekWorkdays(weekStart).map(fmtDate)
    const hasConflict = days.some(d=>person.conflicts.has(d))
    const has980 = days.some(d=>person.nine80s.has(d))
    let penalty = 0
    if (has980) penalty += 1000
    if (person.assigned.length>0) {
      const last = person.assigned[person.assigned.length-1]
      const diffDays = Math.abs((weekStart as any - last as any)/86400000)
      const diffWeeks = diffDays/7
      if (diffWeeks < 2) penalty += 1000
      const spacingTarget = 5
      const miss = Math.max(0, spacingTarget - diffWeeks)
      penalty += miss*60
    }
    return { penalty, hasConflict, has980 }
  }

  const assignments: Assign[] = []; const notes: string[] = []
  for (const w of weeks) {
    const cands = people.filter(p=>p.need>0)
    if (cands.length===0) break
    const scored = cands.map(p=>({ p, s: score(p,w) })).sort((a,b)=>{
      if (a.s.hasConflict !== b.s.hasConflict) return a.s.hasConflict?1:-1
      return a.s.penalty - b.s.penalty
    })
    let choice = scored.find(x=>!x.s.hasConflict)
    if (!choice) { assignments.push({ weekStart:w, name:'UNASSIGNED', flags:['All conflicts'] }); notes.push(`Week ${fmtDate(w)} unassigned: all have conflicts.`); continue }
    const pick = choice.p; pick.assigned.push(w); pick.need -= 1
    const flags: string[] = []; if (choice.s.has980) flags.push('980-week')
    assignments.push({ weekStart:w, name: pick.name, flags })
  }
  return { assignments, notes }
}

const DEFAULT_ATTORNEYS: Attorney[] = [
  { name:'Amy', pattern:'None', conflicts:new Set() },
  { name:'Omid', pattern:'None', conflicts:new Set() },
  { name:'Cameron', pattern:'None', conflicts:new Set() },
  { name:'Alexandra', pattern:'None', conflicts:new Set() },
  { name:'Lorenmarie', pattern:'None', conflicts:new Set() },
  { name:'Clifton', pattern:'None', conflicts:new Set() },
  { name:'Melissa', pattern:'None', conflicts:new Set() },
]

export default function App() {
  const [rows, setRows] = useState<Attorney[]>(DEFAULT_ATTORNEYS)
  const [seed, setSeed] = useState(1)

  const { assignments, notes } = useMemo(()=>{
    const rng = mulberry32(seed); const shuffled = [...rows].sort(()=>rng()-0.5)
    return generateSchedule(shuffled)
  }, [rows, seed])

  function updateRow(i:number, patch: Partial<Attorney>) {
    const next = [...rows]; next[i] = { ...next[i], ...patch }; setRows(next)
  }

  function exportJSON() {
    const data = JSON.stringify(rows.map(r=>({ ...r, conflicts:[...r.conflicts] })), null, 2)
    const blob = new Blob([data], { type:'application/json' }); const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'attorneys.json'; a.click(); URL.revokeObjectURL(url)
  }
  function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { const arr = JSON.parse(String(ev.target?.result || '[]')); setRows(arr.map((r:any)=>({ ...r, conflicts:new Set(r.conflicts) }))) }
    reader.readAsText(file)
  }
  function printSchedule(){ window.print() }

  return (
    <div className='p-6 max-w-6xl mx-auto space-y-6'>
      <header className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>Miranda Duty Oversight Scheduling</h1>
        <div className='flex gap-2'>
          <Button onClick={()=>setSeed(s=>s+1)}><Shuffle className='w-4 h-4 mr-2'/>Shuffle</Button>
          <Button onClick={exportJSON}><Download className='w-4 h-4 mr-2'/>Export Settings</Button>
          <label className='inline-flex items-center gap-1 cursor-pointer'>
            <Upload className='w-4 h-4'/> Import
            <input type='file' accept='application/json' onChange={importJSON} className='hidden'/>
          </label>
          <Button onClick={printSchedule}><CalendarIcon className='w-4 h-4 mr-2'/>Print</Button>
        </div>
      </header>

      <Card>
        <CardHeader><CardTitle>Attorney Settings</CardTitle></CardHeader>
        <CardContent className='space-y-6'>
          {rows.map((r, i)=>(
            <div key={i} className='space-y-2 border p-3 rounded-xl'>
              <Label>Name</Label>
              <Input value={r.name} onChange={(e)=>updateRow(i, { name:e.target.value })}/>

              <Label>980 Pattern</Label>
              <div className='flex flex-wrap gap-2'>
                {['None','Monday A','Monday B','Friday A','Friday B'].map(opt=>(
                  <Button key={opt} className={r.pattern===opt?'bg-gray-900 text-white':''} onClick={()=>updateRow(i,{ pattern:opt })}>{opt}</Button>
                ))}
              </div>

              <Label>Conflict Dates</Label>
              <Calendar
                mode='multiple'
                selected={[...r.conflicts].map(d=>new Date(d))}
                onSelect={(dates:any)=>{
                  const set = new Set<string>((dates||[]).map((d:Date)=>fmtDate(d)))
                  updateRow(i, { conflicts: set })
                }}
              />
              <div className='text-xs text-gray-500'>Selected: {[...r.conflicts].join(', ') || 'None'}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Generated Schedule</CardTitle></CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='text-left border-b'>
                  <th className='py-2 pr-4'>Week Start</th>
                  <th className='py-2 pr-4'>Week End</th>
                  <th className='py-2 pr-4'>Assigned</th>
                  <th className='py-2 pr-4'>Flags</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, idx)=>(
                  <tr key={idx} className='border-b last:border-0'>
                    <td className='py-2 pr-4 font-medium'>{fmtDate(a.weekStart)}</td>
                    <td className='py-2 pr-4'>{fmtDate(addDays(a.weekStart, 4))}</td>
                    <td className='py-2 pr-4'>{a.name}</td>
                    <td className='py-2 pr-4'>{(a.flags||[]).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function mulberry32(a:number){ return function(){ let t=(a+=0x6d2b79f5); t=Math.imul(t^(t>>>15), t|1); t^=t+Math.imul(t^(t>>>7), t|61); return ((t^(t>>>14))>>>0)/4294967296 } }
