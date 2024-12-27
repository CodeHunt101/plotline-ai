'use client'

import Image from 'next/image'
import popcorn from '@/public/popcorn.png'
import { usePathname } from 'next/navigation'

const Logo = () => {
  const pathname = usePathname()
  if (pathname === '/recommendations') return null
  return <Image src={popcorn} alt="Popcorn" className="mx-auto" />
}

export default Logo
