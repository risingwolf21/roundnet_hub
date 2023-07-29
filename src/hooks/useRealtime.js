import { useEffect, useReducer } from "react"
import { useSubscription } from "./useSubscription"
import { useSelect } from "./useSelect"

export const initialState = {
    count: undefined,
    data: undefined,
    error: undefined,
    fetching: false,
}

export const useRealtime = (table, config, compareFn) => {
    if (table === '*')
        throw Error('Must specify table or row. Cannot listen for all database changes.')

    const [result, execute] = useSelect(table, config?.select)
    const [state, dispatch] = useReducer(reducer(compareFn), result)

    useSubscription({
        table,
    }, (payload) => dispatch({ type: 'SUBSCRIPTION', payload }));

    useEffect(() => {
        dispatch({ type: 'FETCH', payload: result })
    }, [result])

    return [state, execute]
}

const reducer = (compareFn) => (state, action) => {
    const old = state.data
    switch (action.type) {
        case 'FETCH':
            return { ...state, old, ...action.payload }
        case 'SUBSCRIPTION':
            switch (action.payload.eventType) {
                case 'DELETE':
                    return {
                        ...state,
                        data: state.data?.filter(
                            (x) => !compareFn(x, action.payload.old),
                        ),
                        fetching: false,
                        old,
                    }
                case 'INSERT':
                    return {
                        ...state,
                        data: [...(old ?? []), action.payload.new],
                        fetching: false,
                        old,
                    }
                case 'UPDATE': {
                    let data = old ?? []
                    if (!Array.isArray(data))
                        data = [old]
                    const index = data.findIndex((x) =>
                        compareFn(x, action.payload.new),
                    )
                    return {
                        ...state,
                        data: [
                            ...data.slice(0, index),
                            action.payload.new,
                            ...data.slice(index + 1),
                        ],
                        fetching: false,
                        old,
                    }
                }
                default:
                    return state;
            }
        default:
            return state;
    }
}