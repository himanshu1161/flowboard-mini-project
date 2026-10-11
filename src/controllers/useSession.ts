import { useCallback } from 'react'
import type { ID } from '../models/types'
import { useAppDispatch, useAppSelector } from '../store'
import { selectCurrentUser, selectIsAdmin, selectUsers, selectVisibleLists } from '../store/selectors'
import { resetDemoData } from '../store/services/loadService'
import { simulationChanged, userSwitched, type SimulationSettings } from '../store/slices/session'
import { clearPersistedState } from '../store/persistence'
import { useToast } from './useToast'

export function useSession() {
  const dispatch = useAppDispatch()
  const toast = useToast()
  const user = useAppSelector(selectCurrentUser)
  const users = useAppSelector(selectUsers)
  const isAdmin = useAppSelector(selectIsAdmin)
  const simulation = useAppSelector((s) => s.session.simulation)
  const ready = useAppSelector((s) => s.session.ready)
  const visibleListCount = useAppSelector(selectVisibleLists).length

  const switchUser = useCallback(
    (id: ID) => {
      if (id === user.id) return
      dispatch(userSwitched(id))
      const next = users.find((u) => u.id === id)
      if (next) toast.info(`Now viewing as ${next.name.split(' ')[0]}`, next.role === 'admin' ? 'Admin — sees and edits everything.' : 'Member — sees only granted spaces and lists.')
    },
    [dispatch, toast, user.id, users],
  )

  const setSimulation = useCallback(
    (changes: Partial<SimulationSettings>) => dispatch(simulationChanged(changes)),
    [dispatch],
  )

  const resetData = useCallback(() => {
    clearPersistedState()
    dispatch(resetDemoData())
    toast.success('Demo data reset', 'The workspace is back to its seed state.')
  }, [dispatch, toast])

  return { user, users, isAdmin, simulation, ready, visibleListCount, switchUser, setSimulation, resetData }
}
