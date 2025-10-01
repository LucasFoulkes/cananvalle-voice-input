import { useEffect, useState } from 'react'
import { getTodayObservations, type Observation } from '@/db/database'
import { vocabulary } from '@/shared/vocabulary'

type Counts = Record<string, number>

export function useObservations(finca: string, bloque: string, cama: string) {
    const [counts, setCounts] = useState<Counts>(() => 
        Object.fromEntries(vocabulary.stages.map(s => [s, 0]))
    )
    const [observations, setObservations] = useState<Observation[]>([])
    const [isLoading, setIsLoading] = useState(false)
    
    // Refresh data from DB
    const refresh = async () => {
        if (!finca || finca === '-' || !bloque || bloque === '-' || !cama || cama === '-') {
            setCounts(Object.fromEntries(vocabulary.stages.map(s => [s, 0])))
            setObservations([])
            return
        }
        
        setIsLoading(true)
        try {
            const obs = await getTodayObservations(finca, bloque, cama)
            setObservations(obs)
            
            // Calculate counts
            const newCounts = Object.fromEntries(vocabulary.stages.map(s => [s, 0]))
            for (const o of obs) {
                if (vocabulary.stages.includes(o.stage)) {
                    newCounts[o.stage] = (newCounts[o.stage] || 0) + o.value
                }
            }
            setCounts(newCounts)
        } finally {
            setIsLoading(false)
        }
    }
    
    // Auto-refresh when location changes
    useEffect(() => {
        refresh()
    }, [finca, bloque, cama])
    
    return {
        counts,
        observations,
        isLoading,
        refresh
    }
}
