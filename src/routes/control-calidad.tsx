import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { isControlCalidad } from '@/lib/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Loader2, ChevronLeft, ChevronRight, Map } from 'lucide-react'
import { getUserTimelines } from '@/services/timelineService'
import { getGpsPointsForDate } from '@/services/gpsService'
import { UserTimelineView } from '@/components/UserTimeline'
import { GpsMap } from '@/components/GpsMap'
import type { UserTimeline, GpsPoint } from '@/types'

export const Route = createFileRoute('/control-calidad')({
  component: ControlCalidadComponent,
})

// Get local date as YYYY-MM-DD string (without timezone conversion)
function getLocalDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function ControlCalidadComponent() {
  const navigate = useNavigate()
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [timelines, setTimelines] = useState<UserTimeline[]>([])
  const [selectedDate, setSelectedDate] = useState(getLocalDateString())
  const [showMapDialog, setShowMapDialog] = useState(false)
  const [gpsPoints, setGpsPoints] = useState<GpsPoint[]>([])
  const [loadingGps, setLoadingGps] = useState(false)

  useEffect(() => {
    if (!isControlCalidad()) {
      navigate({ to: '/' })
      return
    }
    loadTimeline()
  }, [])

  useEffect(() => {
    loadTimeline()
  }, [selectedDate])

  const loadTimeline = async () => {
    try {
      setLoadingTimeline(true)
      const data = await getUserTimelines(selectedDate)
      setTimelines(data)
    } catch (err) {
      console.error('Error loading timeline:', err)
    } finally {
      setLoadingTimeline(false)
    }
  }

  const goToPreviousDay = () => {
    const date = new Date(selectedDate + 'T00:00:00')
    date.setDate(date.getDate() - 1)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    setSelectedDate(`${year}-${month}-${day}`)
  }

  const goToNextDay = () => {
    const date = new Date(selectedDate + 'T00:00:00')
    date.setDate(date.getDate() + 1)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const nextDate = `${year}-${month}-${day}`
    const today = getLocalDateString()

    // Only allow moving forward if next date is not in the future
    if (nextDate <= today) {
      setSelectedDate(nextDate)
    }
  }

  const isToday = () => {
    const today = getLocalDateString()
    return selectedDate === today
  }

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' })
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    return `${dayName} ${day}/${month}/${year}`
  }

  const loadGpsPoints = async () => {
    try {
      setLoadingGps(true)
      const points = await getGpsPointsForDate(selectedDate)
      setGpsPoints(points)
    } catch (err) {
      console.error('Error loading GPS points:', err)
    } finally {
      setLoadingGps(false)
    }
  }

  const handleOpenMap = () => {
    setShowMapDialog(true)
    loadGpsPoints()
  }

  // Generate colors for users
  const userColors: Record<string, string> = {}
  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
  timelines.forEach((timeline, index) => {
    if (timeline.id_usuario) {
      userColors[String(timeline.id_usuario)] = colors[index % colors.length]
    }
  })

  if (!isControlCalidad()) {
    return null
  }

  return (
    <div className='h-full flex flex-col p-2 gap-1'>
      <Card className='bg-zinc-800 border-none text-white flex-1 min-h-0 flex flex-col'>
        <CardContent className='flex-1 min-h-0 flex flex-col gap-2 px-2'>
          <div className='flex items-center justify-between flex-shrink-0'>
            <Button
              onClick={goToPreviousDay}
              variant='outline'
              size='icon'
              className='bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700'
            >
              <ChevronLeft />
            </Button>
            <div className='flex items-center gap-2'>
              <span className='text-xl text-center capitalize flex-shrink-0'>
                {formatDisplayDate(selectedDate)}
              </span>
              <Button
                onClick={handleOpenMap}
                variant='outline'
                size='icon'
                className='bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 flex-shrink-0'
              >
                <Map />
              </Button>
            </div>
            <Button
              onClick={goToNextDay}
              variant='outline'
              size='icon'
              disabled={isToday()}
              className='bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed'
            >
              <ChevronRight />
            </Button>
          </div>
          <div className='flex-1 min-h-0'>
            {loadingTimeline ? (
              <div className='flex justify-center py-8'>
                <Loader2 className='animate-spin text-zinc-400' size={32} />
              </div>
            ) : (
              <UserTimelineView timelines={timelines} />
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showMapDialog} onOpenChange={setShowMapDialog}>
        <DialogContent className='bg-zinc-900 text-white border-zinc-700 p-0 overflow-hidden'>
          {loadingGps ? (
            <div className='flex justify-center py-8'>
              <Loader2 className='animate-spin text-zinc-400' size={32} />
            </div>
          ) : (
            <GpsMap
              points={gpsPoints}
              userColors={userColors}
              users={timelines.map(t => ({
                id_usuario: String(t.id_usuario),
                nombres: t.nombres,
                apellidos: t.apellidos
              }))}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
