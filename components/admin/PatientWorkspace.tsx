'use client'

import { useCallback, useState } from 'react'
import DentalChart from './DentalChart'
import TreatmentsPanel, { type CatalogOpt, type MaterialOpt, type TItem } from './TreatmentsPanel'

interface ChartRecord {
  id: string
  tooth_number: string
  condition: string
  notes: string | null
  treatment_date: string
  created_at?: string | null
}

/** Overview: upar dental chart, neeche treatments. Chart par daant chuno -> wahi daant nayi treatment mein. */
export default function PatientWorkspace(props: {
  patientId: string
  department: string
  showChart: boolean
  chartRecords: ChartRecord[]
  treatments: TItem[]
  catalog: CatalogOpt[]
  materials?: Record<string, MaterialOpt[]>
  doctors: string[]
  defaultDoctor: string | null
  canEdit: boolean
  canBill: boolean
  canCollect: boolean
  canSeeMoney: boolean
  isOwner: boolean
  canLab?: boolean
}) {
  const [startTeeth, setStartTeeth] = useState<string[] | null>(null)
  const consumed = useCallback(() => setStartTeeth(null), [])

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      {props.showChart && (
        <DentalChart
          patientId={props.patientId}
          initialRecords={props.chartRecords}
          canEdit={props.canEdit}
          onStartTreatment={(tooth) => setStartTeeth([tooth])}
          plannedTeeth={props.treatments.filter((t) => t.status === 'planned').flatMap((t) => t.teeth)}
        />
      )}
      <TreatmentsPanel
        patientId={props.patientId}
        department={props.department}
        treatments={props.treatments}
        catalog={props.catalog}
        materials={props.materials}
        doctors={props.doctors}
        defaultDoctor={props.defaultDoctor}
        canEdit={props.canEdit}
        canBill={props.canBill}
        canCollect={props.canCollect}
        canSeeMoney={props.canSeeMoney}
        isOwner={props.isOwner}
        canLab={props.canLab}
        startTeeth={startTeeth}
        onStartConsumed={consumed}
      />
    </div>
  )
}
