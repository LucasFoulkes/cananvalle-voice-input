import { ScrollArea } from '@/components/ui/scroll-area'
import type { UserTimeline } from '@/services/timelineService'

type Props = {
  timelines: UserTimeline[]
}

export function UserTimelineView({ timelines }: Props) {
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

  // Generate hourly time labels with smart spacing
  const startHour = new Date(timeStart)
  startHour.setMinutes(0, 0, 0)
  const endHour = new Date(timeEnd)
  endHour.setMinutes(0, 0, 0)

  const hours = []
  const currentHour = new Date(startHour)
  const totalHours = (endHour.getTime() - startHour.getTime()) / (1000 * 60 * 60)
  const step = totalHours > 12 ? 2 : 1 // Show every 2 hours if more than 12 hours

  while (currentHour <= endHour) {
    hours.push(new Date(currentHour))
    currentHour.setHours(currentHour.getHours() + step)
  }

  return (
    <div className='flex flex-col h-full gap-1'>
      {/* Bars and time axis - fixed at top */}
      <div className='flex-shrink-0 space-y-4'>
        {/* User timeline bars */}
        {timelines.map(timeline => (
          <div key={timeline.id_usuario}>
            <div className='text-sm font-medium text-white mb-2'>
              {timeline.nombres} {timeline.apellidos || ''}
              <span className='ml-2 text-xs text-zinc-400'>
                ({timeline.segments.length} cama{timeline.segments.length !== 1 ? 's' : ''})
              </span>
            </div>
            <div className='px-4'>
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
          </div>
        ))}

        {/* Time axis - below bars with same padding */}
        <div className='px-4'>
          <div className='relative h-6 pt-1 overflow-hidden'>
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

      {/* Legends - scrollable */}
      <ScrollArea className='flex-1 min-h-0'>
        <div className='space-y-6 pr-4'>
          {timelines.map(timeline => {
            // Group segments by finca, then by bloque
            const groupedByFinca = timeline.segments.reduce((acc, segment) => {
              if (!acc[segment.finca]) {
                acc[segment.finca] = {}
              }
              if (!acc[segment.finca][segment.bloque]) {
                acc[segment.finca][segment.bloque] = []
              }
              acc[segment.finca][segment.bloque].push(segment)
              return acc
            }, {} as Record<string, Record<string, typeof timeline.segments>>)

            return (
              <div key={`legend-container-${timeline.id_usuario}`}>
                {Object.entries(groupedByFinca).map(([finca, bloques]) => {
                  // Calculate finca-level stats
                  const allFincaSegments = Object.values(bloques).flat()
                  const fincaFirstTime = new Date(Math.min(...allFincaSegments.map(s => new Date(s.first_observation).getTime())))
                  const fincaLastTime = new Date(Math.max(...allFincaSegments.map(s => new Date(s.last_observation).getTime())))
                  const bloqueCount = Object.keys(bloques).length
                  const fincaTotalTime = allFincaSegments.reduce((sum, s) => {
                    return sum + (new Date(s.last_observation).getTime() - new Date(s.first_observation).getTime())
                  }, 0)
                  const fincaAvgTimePerBloque = Math.round(fincaTotalTime / bloqueCount / (1000 * 60))
                  const fincaTotalObs = allFincaSegments.reduce((sum, s) => sum + s.observation_count, 0)
                  const fincaAvgObsPerBloque = Math.round(fincaTotalObs / bloqueCount)

                  const fincaFirstTimeStr = `${fincaFirstTime.getHours()}:${String(fincaFirstTime.getMinutes()).padStart(2, '0')}`
                  const fincaLastTimeStr = `${fincaLastTime.getHours()}:${String(fincaLastTime.getMinutes()).padStart(2, '0')}`

                  return (
                    <div key={`finca-${finca}`} className='mb-4'>
                      <div className='flex items-center gap-3 mb-2'>
                        <div className='text-sm font-semibold text-white'>Finca {finca}</div>
                        <div className='text-xs text-zinc-400'>
                          {fincaFirstTimeStr} - {fincaLastTimeStr} • {fincaAvgTimePerBloque}min/bloque • {fincaAvgObsPerBloque}obs/bloque
                        </div>
                      </div>
                      {Object.entries(bloques).map(([bloque, segments]) => {
                        // Calculate bloque-level stats
                        const bloqueFirstTime = new Date(Math.min(...segments.map(s => new Date(s.first_observation).getTime())))
                        const bloqueLastTime = new Date(Math.max(...segments.map(s => new Date(s.last_observation).getTime())))
                        const bloqueTotalTime = segments.reduce((sum, s) => {
                          return sum + (new Date(s.last_observation).getTime() - new Date(s.first_observation).getTime())
                        }, 0)
                        const bloqueTotalTimeMin = Math.round(bloqueTotalTime / (1000 * 60))
                        const bloqueAvgTimePerCama = Math.round(bloqueTotalTime / segments.length / (1000 * 60))
                        const bloqueTotalObs = segments.reduce((sum, s) => sum + s.observation_count, 0)
                        const bloqueAvgObsPerCama = Math.round(bloqueTotalObs / segments.length)

                        const bloqueFirstTimeStr = `${bloqueFirstTime.getHours()}:${String(bloqueFirstTime.getMinutes()).padStart(2, '0')}`
                        const bloqueLastTimeStr = `${bloqueLastTime.getHours()}:${String(bloqueLastTime.getMinutes()).padStart(2, '0')}`

                        return (
                          <div key={`bloque-${bloque}`} className='mb-3'>
                            <div className='flex items-center gap-3 mb-2'>
                              <div className='text-xs font-medium text-zinc-400'>Bloque {bloque}</div>
                              <div className='text-xs text-zinc-500'>
                                {bloqueFirstTimeStr} - {bloqueLastTimeStr} • {bloqueTotalTimeMin}min • {bloqueAvgTimePerCama}min/cama • {bloqueAvgObsPerCama}obs/cama
                              </div>
                            </div>
                            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2'>
                              {segments.map((segment, idx) => {
                                const firstTime = new Date(segment.first_observation)
                                const lastTime = new Date(segment.last_observation)
                                const timeDiff = Math.round((lastTime.getTime() - firstTime.getTime()) / (1000 * 60)) // minutes

                                const firstTimeStr = `${firstTime.getHours()}:${String(firstTime.getMinutes()).padStart(2, '0')}`
                                const lastTimeStr = `${lastTime.getHours()}:${String(lastTime.getMinutes()).padStart(2, '0')}`

                                return (
                                  <div key={`legend-${segment.id_cama}-${idx}`} className='flex items-center gap-2 text-xs'>
                                    <div
                                      className='w-3 h-3 rounded flex-shrink-0'
                                      style={{ backgroundColor: segment.color }}
                                    />
                                    <span className='text-white font-medium'>
                                      C{segment.cama}
                                    </span>
                                    <span className='text-zinc-400'>
                                      {firstTimeStr}-{lastTimeStr}
                                    </span>
                                    <span className='text-zinc-500'>
                                      {timeDiff}min
                                    </span>
                                    <span className='text-zinc-500'>
                                      {segment.observation_count}obs
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
