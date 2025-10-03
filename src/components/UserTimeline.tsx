import { ScrollArea } from '@/components/ui/scroll-area'
import type { UserTimeline } from '@/services/timelineService'

type Props = {
  timelines: UserTimeline[]
  selectedDate: string
}

export function UserTimelineView({ timelines, selectedDate }: Props) {
  if (timelines.length === 0) {
    return (
      <div className='text-center py-8 text-zinc-400'>
        No hay observaciones para esta fecha
      </div>
    )
  }

  // Find earliest and latest observations across all users
  let earliestTime = Infinity
  let latestTime = -Infinity

  timelines.forEach(timeline => {
    timeline.segments.forEach(segment => {
      const firstTime = new Date(segment.first_observation).getTime()
      const lastTime = new Date(segment.last_observation).getTime()
      if (firstTime < earliestTime) earliestTime = firstTime
      if (lastTime > latestTime) latestTime = lastTime
    })
  })

  // Add 30 minutes padding on each side
  const padding = 30 * 60 * 1000
  const timeStart = earliestTime - padding
  const timeEnd = latestTime + padding
  const duration = timeEnd - timeStart

  const getPosition = (timestamp: string) => {
    const time = new Date(timestamp).getTime()
    return ((time - timeStart) / duration) * 100
  }

  const getWidth = (start: string, end: string) => {
    const startPos = getPosition(start)
    const endPos = getPosition(end)
    return Math.max(endPos - startPos, 0.5) // Minimum width for visibility
  }

  // Generate hourly time labels
  const startHour = new Date(timeStart)
  startHour.setMinutes(0, 0, 0)
  const endHour = new Date(timeEnd)
  endHour.setMinutes(0, 0, 0)

  const hours = []
  const currentHour = new Date(startHour)
  while (currentHour <= endHour) {
    hours.push(new Date(currentHour))
    currentHour.setHours(currentHour.getHours() + 1)
  }

  return (
    <div className='flex flex-col h-full gap-1'>
      {/* Bars and time axis - fixed at top */}
      <div className='flex-shrink-0'>
        <div className='overflow-x-auto'>
          <div className='min-w-full'>
            {/* User timeline bars - fixed */}
            {timelines.map(timeline => (
              <div key={timeline.id_usuario} className='mb-4'>
                <div className='text-sm font-medium text-white mb-2'>
                  {timeline.nombres} {timeline.apellidos || ''}
                  <span className='ml-2 text-xs text-zinc-400'>
                    ({timeline.segments.length} cama{timeline.segments.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <div className='relative h-6 bg-zinc-800 rounded'>
                  {timeline.segments.map((segment, idx) => {
                    const left = getPosition(segment.first_observation)
                    const width = getWidth(segment.first_observation, segment.last_observation)

                    return (
                      <div
                        key={`${segment.id_cama}-${idx}`}
                        className='absolute h-full'
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          backgroundColor: segment.color,
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Time axis - below bars */}
            <div className='relative h-6 border-t border-zinc-700 pt-1'>
              {hours.map((hour, idx) => {
                const position = ((hour.getTime() - timeStart) / duration) * 100
                return (
                  <div
                    key={idx}
                    className='absolute text-xs text-zinc-500'
                    style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                  >
                    {hour.getHours()}:00
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legends - scrollable */}
      <ScrollArea className='flex-1 min-h-0'>
        <div className='space-y-6 pr-4'>
          {timelines.map(timeline => (
            <div key={`legend-container-${timeline.id_usuario}`}>
              <div className='grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2'>
                {timeline.segments.map((segment, idx) => {
                  const firstTime = new Date(segment.first_observation)
                  const lastTime = new Date(segment.last_observation)
                  const timeDiff = Math.round((lastTime.getTime() - firstTime.getTime()) / (1000 * 60)) // minutes

                  return (
                    <div key={`legend-${segment.id_cama}-${idx}`} className='flex items-start gap-2 text-xs text-zinc-400'>
                      <div
                        className='w-4 h-4 rounded flex-shrink-0 mt-0.5'
                        style={{ backgroundColor: segment.color }}
                      />
                      <div className='flex flex-col gap-0.5'>
                        <span className='text-white font-medium'>
                          F{segment.finca}/B{segment.bloque}/C{segment.cama}
                        </span>
                        <span>
                          {firstTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {lastTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>
                          {timeDiff} min • {segment.observation_count} obs
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
