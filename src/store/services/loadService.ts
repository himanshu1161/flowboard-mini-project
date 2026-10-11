import { createSeed } from '../../models/seed'
import type { ID, Result } from '../../models/types'
import type { AppThunk } from '../index'
import { selectListAccess } from '../selectors'
import { dataReset } from '../slices/entities'
import { readyChanged } from '../slices/session'
import { listLoadChanged, listSelected } from '../slices/ui'
import { simulateNetwork } from './runOp'

/** Simulated initial workspace fetch — drives the sidebar skeleton. */
export const bootstrap = (): AppThunk<Promise<void>> => async (dispatch, getState) => {
  dispatch(readyChanged(false))
  const { latencyMs } = getState().session.simulation
  // Initial load never fails; it only shows the loading state.
  await simulateNetwork({ latencyMs, failuresEnabled: false, failureRate: 0 })
  dispatch(readyChanged(true))
}

/**
 * Open a list: select it, simulate fetching its tasks, then check access.
 * A denied list resolves to a 403 error (rendered as an error state, not a crash).
 */
let loadToken = 0
export const openList =
  (listId: ID): AppThunk<Promise<Result<null>>> =>
  async (dispatch, getState) => {
    const token = ++loadToken
    dispatch(listSelected(listId))
    dispatch(listLoadChanged({ listId, status: 'loading', error: null }))

    const networkError = await simulateNetwork(
      getState().session.simulation,
      'Couldn’t load this list (simulated failure). Check the connection and try again.',
    )
    if (token !== loadToken) return { data: null } // a newer list was opened meanwhile

    const access = networkError ? { error: networkError } : selectListAccess(getState(), listId)
    if (access.error) {
      dispatch(listLoadChanged({ listId, status: 'error', error: access.error }))
      return { error: access.error }
    }
    dispatch(listLoadChanged({ listId, status: 'ready', error: null }))
    return { data: null }
  }

export const resetDemoData = (): AppThunk => (dispatch) => {
  dispatch(dataReset(createSeed()))
  dispatch(listSelected(null))
  dispatch(listLoadChanged({ listId: null, status: 'idle', error: null }))
}
