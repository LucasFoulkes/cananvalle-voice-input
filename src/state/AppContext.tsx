import React, { createContext, useContext, useReducer } from 'react'

// Simple state for location and voice settings only
export type AppState = {
    finca: string
    bloque: string
    cama: string
    voice: 'male' | 'female'
}

export type AppAction =
    | { type: 'setFinca'; value: string }
    | { type: 'setBloque'; value: string }
    | { type: 'setCama'; value: string }
    | { type: 'setVoice'; value: 'male' | 'female' }
    | { type: 'reset' }

function appReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        case 'setFinca':
            // When finca changes, reset bloque and cama
            return { ...state, finca: action.value, bloque: '-', cama: '-' }
        case 'setBloque':
            // When bloque changes, reset cama
            return { ...state, bloque: action.value, cama: '-' }
        case 'setCama':
            return { ...state, cama: action.value }
        case 'setVoice':
            return { ...state, voice: action.value }
        case 'reset':
            return createInitialState()
        default:
            return state
    }
}

function createInitialState(): AppState {
    return {
        finca: '-',
        bloque: '-',
        cama: '-',
        voice: 'male'
    }
}

const AppContext = createContext<{
    state: AppState
    dispatch: React.Dispatch<AppAction>
} | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(appReducer, createInitialState())

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    )
}

export function useAppState() {
    const ctx = useContext(AppContext)
    if (!ctx) throw new Error('useAppState must be used within AppProvider')
    return ctx.state
}

export function useAppDispatch() {
    const ctx = useContext(AppContext)
    if (!ctx) throw new Error('useAppDispatch must be used within AppProvider')
    return ctx.dispatch
}