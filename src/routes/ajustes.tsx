import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useAppState, useAppDispatch } from '@/state/AppContext'

export const Route = createFileRoute('/ajustes')({
    component: Ajustes,
})

function Ajustes() {
    const state = useAppState()
    const dispatch = useAppDispatch()

    return (
        <div className='w-full h-full flex flex-col p-2 space-y-2 bg-black'>
            <div className='uppercase rounded-xl overflow-hidden bg-green-400 text-black px-3 py-2 text-center font-semibold'>
                Ajustes
            </div>

            <div className='bg-white/5 rounded-xl p-4 space-y-4'>
                <div>
                    <h3 className='text-white font-semibold mb-2'>Voz de respuesta</h3>
                    <div className='grid grid-cols-2 gap-2'>
                        <Button
                            variant={state.voice === 'male' ? 'default' : 'outline'}
                            onClick={() => dispatch({ type: 'setVoice', value: 'male' })}
                            className={state.voice === 'male' ? 'bg-indigo-500' : ''}
                        >
                            Masculino
                        </Button>
                        <Button
                            variant={state.voice === 'female' ? 'default' : 'outline'}
                            onClick={() => dispatch({ type: 'setVoice', value: 'female' })}
                            className={state.voice === 'female' ? 'bg-indigo-500' : ''}
                        >
                            Femenino
                        </Button>
                    </div>
                </div>

                <div>
                    <h3 className='text-white font-semibold mb-2'>Ubicación actual</h3>
                    <div className='text-gray-300 space-y-1'>
                        <div>Finca: {state.finca === '-' ? 'No configurada' : state.finca}</div>
                        <div>Bloque: {state.bloque === '-' ? 'No configurado' : state.bloque}</div>
                        <div>Cama: {state.cama === '-' ? 'No configurada' : state.cama}</div>
                    </div>
                    <Button
                        variant='outline'
                        className='mt-2'
                        onClick={() => dispatch({ type: 'reset' })}
                    >
                        Restablecer ubicación
                    </Button>
                </div>
            </div>
        </div>
    )
}