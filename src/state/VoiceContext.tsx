import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { createInitialState, reducer, type Action, type State } from './voiceCounter'
import { addObservations, getAllObservations } from '@/db/observations'

type Ctx = { state: State; dispatch: React.Dispatch<Action> }
const VoiceStateContext = createContext<Ctx | null>(null)

export function VoiceProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(reducer, createInitialState())
    const value = useMemo(() => ({ state, dispatch }), [state])

    // Hydrate from Dexie on mount
    useEffect(() => {
        (async () => {
            const rows = await getAllObservations()
            if (rows.length) {
                dispatch({
                    type: 'hydrateObservations', items: rows.map(r => ({
                        at: r.at,
                        finca: r.finca,
                        bloque: r.bloque,
                        cama: r.cama,
                        stage: r.stage,
                        value: r.value,
                    }))
                })
            }
        })()
    }, [])

    // Persist new observations when they change
    useEffect(() => {
        if (!state.observations.length) return
        const last = state.observations[state.observations.length - 1]
        void addObservations([{ ...last }])
    }, [state.observations])
    return <VoiceStateContext.Provider value={value}>{children}</VoiceStateContext.Provider>
}

export function useVoiceState() {
    const ctx = useContext(VoiceStateContext)
    if (!ctx) throw new Error('useVoiceState must be used within VoiceProvider')
    return ctx.state
}

export function useVoiceDispatch() {
    const ctx = useContext(VoiceStateContext)
    if (!ctx) throw new Error('useVoiceDispatch must be used within VoiceProvider')
    return ctx.dispatch
}
