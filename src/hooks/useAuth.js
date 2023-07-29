import { useContext } from 'react'
import { AuthContext } from '../AuthGate'

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined)
        throw Error('useAuth must be used within AuthProvider')
    return context
}