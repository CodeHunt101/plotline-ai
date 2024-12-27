'use client'

import { usePathname } from 'next/navigation'

const Title = () => {
  const pathname = usePathname()
  if (pathname !== '/') return null
  return <h1 className="text-5xl text-center">PlotlineAI</h1>

}

export default Title
