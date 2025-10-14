import { Button } from '@/components/ui/button'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { addDays, isToday, isFuture, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getObservationsForDay } from '@/services/supabaseService'
import { Spinner } from '@/components/ui/spinner'
import { useQualityControlData } from '@/hooks/useQualityControlData'
import { UserQualityCard } from '@/components/UserQualityCard'

export const Route = createFileRoute('/control-calidad')({
  component: ControlCalidadComponent,
})


function ControlCalidadComponent() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [observations, setObservations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userCards = useQualityControlData(observations)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getObservationsForDay(selectedDate)
        setObservations(data)
      } catch (err: any) {
        console.error('Error fetching observations:', err)
        setError(err.message || 'Error al cargar observaciones')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedDate])

  const goBackOneDay = () => {
    setSelectedDate(prev => addDays(prev, -1))
  }

  const goForwardOneDay = () => {
    const nextDay = addDays(selectedDate, 1)
    if (!isFuture(nextDay)) {
      setSelectedDate(nextDay)
    }
  }

  return (
    <div className='p-1 h-full overflow-hidden'>
      <div className='flex bg-zinc-800 flex-col h-full rounded-xl p-1 gap-1 overflow-hidden'>
        <div className='flex justify-between p-1 flex-shrink-0'>
          <Button className='aspect-square' onClick={goBackOneDay}>
            <ChevronLeft />
          </Button>
          <span className='text-sm text-center uppercase flex items-center justify-center '>
            {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </span>
          <Button
            className='aspect-square'
            onClick={goForwardOneDay}
            disabled={isToday(selectedDate)}
          >
            <ChevronRight />
          </Button>
        </div>
        {loading && (
          <div className='flex items-center justify-center h-full'>
            <Spinner />
          </div>
        )}
        {error && (
          <div className='text-red-400 text-center p-4'>
            {error}
          </div>
        )}
        {!loading && !error && (
          <div className='space-y-4 overflow-y-auto min-h-0 px-1'>
            {userCards.map((userData) => (
              <UserQualityCard key={userData.userId} data={userData} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}