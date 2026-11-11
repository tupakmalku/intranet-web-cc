import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from './errors.ts'

interface QueryState<T> {
  data?: T
  error?: string
  loading: boolean
}

/**
 * Lee datos del backend al montar el componente y cada vez que cambian las
 * dependencias. `reload` vuelve a leerlos sin vaciar lo que ya se muestra.
 */
export function useQuery<T>(load: () => Promise<T>, deps: unknown[]): QueryState<T> & { reload: () => void } {
  const [state, setState] = useState<QueryState<T>>({ loading: true })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    // Si las dependencias cambian antes de que llegue la respuesta, esa respuesta se descarta.
    let cancelled = false
    load().then(
      (data) => !cancelled && setState({ data, loading: false }),
      (error) => !cancelled && setState({ error: errorMessage(error), loading: false }),
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `load` se recrea en cada render; mandan las dependencias.
  }, [...deps, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { ...state, reload }
}
