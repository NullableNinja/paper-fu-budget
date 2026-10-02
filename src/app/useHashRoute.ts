import { useEffect, useState } from 'react'
export const useHashRoute = () => { const [route, setRoute] = useState(window.location.hash.replace(/^#/, '') || '/dashboard'); useEffect(() => { const handler = () => setRoute(window.location.hash.replace(/^#/, '') || '/dashboard'); window.addEventListener('hashchange', handler); return () => window.removeEventListener('hashchange', handler) }, []); useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }) }, [route]); return route }
export const navigate = (route: string) => { window.location.hash = route }
