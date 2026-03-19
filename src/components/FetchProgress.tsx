import { CheckCircle, XCircle, Clock, Loader2, Minus } from 'lucide-react'
import { FetchStep } from '../types'

interface FetchProgressProps {
  steps: FetchStep[]
}

export default function FetchProgress({ steps }: FetchProgressProps) {
  return (
    <div className="glass-card space-y-2">
      <p className="text-xs font-semibold text-zinc-400 mb-1">Fetching metadata…</p>
      {steps.map((step) => (
        <div key={step.id} className="flex items-start gap-2 text-xs">
          <span className="mt-0.5 shrink-0">
            {step.status === 'pending'  && <Clock    className="w-3.5 h-3.5 text-zinc-600" />}
            {step.status === 'running'  && <Loader2  className="w-3.5 h-3.5 text-accent animate-spin" />}
            {step.status === 'success'  && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
            {step.status === 'error'    && <XCircle  className="w-3.5 h-3.5 text-red-500" />}
            {step.status === 'skipped'  && <Minus    className="w-3.5 h-3.5 text-zinc-600" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className={
              step.status === 'running' ? 'text-zinc-200' :
              step.status === 'success' ? 'text-zinc-300' :
              step.status === 'error'   ? 'text-red-400'  :
              'text-zinc-600'
            }>
              {step.label}
            </p>
            {step.detail && (
              <p className={`truncate mt-0.5 ${step.status === 'error' ? 'text-red-500' : 'text-zinc-500'}`}>
                {step.detail}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
